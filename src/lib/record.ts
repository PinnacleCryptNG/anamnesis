import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { NAMESPACE, recallMany, type Ctx } from "./memory";

const KEY_RE = /^[0-9A-HJKMNP-TV-Z]{20}$/;
export const normKey = (k: string) => k.toUpperCase().replace(/[^0-9A-Z]/g, "");
export const nsFor = (k: string) =>
  "p_" + createHash("sha256").update("anamnesis-record:" + k).digest("hex").slice(0, 32);

const deny = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/** Resolves which record a request reads and writes. No record key means the read-only sample patient. */
export function recordCtx(req: Request, opts: { write?: boolean } = {}): Ctx | NextResponse {
  const h = req.headers;
  const raw = h.get("x-record");
  const accountId = h.get("x-memwal-account")?.trim();
  const key = h.get("x-memwal-key")?.trim();
  let ns = NAMESPACE;
  let sample = true;
  if (raw) {
    const k = normKey(raw);
    if (!KEY_RE.test(k)) return deny(400, "That record key isn't valid. Check the card and try again.");
    ns = nsFor(k);
    sample = false;
  }
  const own = Boolean(accountId && key);
  if (own) {
    if (!/^0x[0-9a-f]{64}$/i.test(accountId!) || key!.length < 32 || key!.length > 200)
      return deny(400, "That Walrus account ID or delegate key doesn't look right.");
    if (!raw) ns = "anamnesis";
    sample = false;
  }
  if (opts.write && sample) {
    const code = process.env.APP_PASSCODE;
    if (!(code && h.get("x-passcode") === code))
      return deny(403, "The sample patient is read-only. Start your own record to add notes.", { reason: "sample" });
  }
  return { ns, sample, own, key: own ? key : undefined, accountId: own ? accountId : undefined };
}

export type Scope = "doctor" | "emergency";
export type Card = { name?: string; born?: string; blood?: string; contact?: string; notes?: string };
export type SharePayload = { v: 1; ns: string; scope: Scope; id: string; exp: number | null; who?: string; card?: Card };

const secret = () =>
  createHmac("sha256", process.env.SHARE_SECRET || process.env.MEMWAL_KEY || "anamnesis").update("anamnesis-share-v1").digest();
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 32);

/** Binds a doctor's review to an item the doctor view actually showed on this link. */
export const reviewTag = (shareId: string, item: string) => sign(`review:${shareId}:${item}`);

export const newShareId = () => randomBytes(6).toString("hex");

export function signShare(p: SharePayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readShare(token: string): SharePayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SharePayload;
    return p.v === 1 && /^p_[0-9a-f]{32}$/.test(p.ns) ? p : null;
  } catch {
    return null;
  }
}

export type ShareRow = { id: string; scope: Scope; who: string; until: string | null; issued: string; revoked: boolean };

const ISSUED_RE = /^issued ([0-9a-f]{12}) · (doctor|emergency) · (.*?) · until (\S+)$/;

export async function listShares(ctx: Ctx): Promise<ShareRow[]> {
  const entries = await recallMany(["share link issued", "share link revoked", "doctor link", "emergency card link"], {
    ctx,
    limit: 50,
  }).catch(() => []);
  const rows = new Map<string, ShareRow>();
  const revoked = new Set<string>();
  for (const e of entries) {
    if (e.kind !== "share") continue;
    const r = e.body.match(/^revoked ([0-9a-f]{12})/);
    if (r) revoked.add(r[1]);
    const m = e.body.match(ISSUED_RE);
    if (m) rows.set(m[1], { id: m[1], scope: m[2] as Scope, who: m[3], until: m[4] === "never" ? null : m[4], issued: e.date, revoked: false });
  }
  for (const id of revoked) {
    const row = rows.get(id);
    if (row) row.revoked = true;
    else rows.set(id, { id, scope: "doctor", who: "", until: null, issued: "", revoked: true });
  }
  return [...rows.values()].sort((a, b) => (a.issued < b.issued ? 1 : -1));
}

export const issuedText = (id: string, scope: Scope, who: string, until: string | null) =>
  `issued ${id} · ${scope} · ${who.replace(/·/g, "-").trim() || "unnamed"} · until ${until ?? "never"}`;

/** Opens a shared link: verifies the signature, expiry and that the patient has not revoked it. */
export async function openShare(token: string, scope: Scope): Promise<{ ctx: Ctx; share: SharePayload } | NextResponse> {
  const share = readShare(token);
  if (!share || share.scope !== scope) return deny(400, "This link is damaged or was not issued by Anamnesis.", { status: "invalid" });
  if (share.exp && share.exp < Date.now()) return deny(403, "This link has expired.", { status: "expired", exp: share.exp });
  const ctx: Ctx = { ns: share.ns, sample: false, own: false };
  const rows = await listShares(ctx);
  if (rows.find((r) => r.id === share.id)?.revoked)
    return deny(403, "The patient has revoked this link.", { status: "revoked" });
  return { ctx, share };
}
