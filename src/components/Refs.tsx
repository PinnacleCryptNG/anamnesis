"use client";
import { useState } from "react";
import { Kind } from "./Entry";
import { SealIcon } from "./Icons";
import { post } from "@/lib/api";
import u from "./ui.module.css";
import s from "./Refs.module.css";

export type Source = { n: number; blobId: string; kind: string; date: string; body: string };

type BlobProof = { objectId: string; size: number; certifiedEpoch: number | null; endEpoch: number };
type Check = { checkpoint: string | null; walrusEpoch: number | null; checkedAt: string; blob: BlobProof | null };
type VerifyRes = { error?: string; checkpoint: string | null; walrusEpoch: number | null; checkedAt: string; blobs: Record<string, BlobProof | null> };

const EPOCH_MS = 14 * 86_400_000;
const checked = new Map<string, Check>();

function paidUntil(c: Check): string | null {
  if (!c.blob || c.walrusEpoch == null) return null;
  const t = new Date(c.checkedAt).getTime() + (c.blob.endEpoch - c.walrusEpoch) * EPOCH_MS;
  return new Date(t).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function OnChain({ c }: { c: Check | "checking" | "failed" | undefined }) {
  if (!c || c === "checking") return <span className={s.chain}><span className={u.loading} />Checking Sui through Tatum…</span>;
  if (c === "failed") return <span className={s.chain} data-state="off">Couldn&apos;t reach Sui just now. Tap again to retry.</span>;
  if (!c.blob) return <span className={s.chain} data-state="off">Not found among the account&apos;s Walrus blobs yet. New memories take a minute to settle.</span>;
  const until = paidUntil(c);
  return (
    <span className={s.chain} data-state="on">
      <SealIcon size={13} />
      <span>
        On Sui as{" "}
        <a className="mono" href={`https://suiscan.xyz/mainnet/object/${c.blob.objectId}`} target="_blank" rel="noreferrer">
          {c.blob.objectId.slice(0, 6)}…{c.blob.objectId.slice(-4)}
        </a>
        {c.blob.certifiedEpoch != null ? ` · certified in epoch ${c.blob.certifiedEpoch}` : " · not yet certified"} · paid to epoch {c.blob.endEpoch}
        {until ? ` (about ${until})` : ""}
      </span>
    </span>
  );
}

export default function Refs({ refs, sources, account }: { refs: number[]; sources: Source[]; account?: string }) {
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const [state, setState] = useState<"idle" | "checking" | "failed">("idle");
  const hits = [...new Set(refs)].map((r) => sources.find((x) => x.n === r)).filter(Boolean) as Source[];
  if (!hits.length) return null;

  const verify = async () => {
    const ids = hits.map((h) => h.blobId).filter((id) => !checked.get(id)?.blob);
    if (!ids.length) return;
    setState("checking");
    const r = await post<VerifyRes>("/api/verify", { blobIds: ids, account });
    if (r.error || !r.blobs) return setState("failed");
    for (const id of ids) checked.set(id, { checkpoint: r.checkpoint, walrusEpoch: r.walrusEpoch, checkedAt: r.checkedAt, blob: r.blobs[id] ?? null });
    setState("idle");
    bump((n) => n + 1);
  };

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) void verify();
  };
  const cp = hits.map((h) => checked.get(h.blobId)?.checkpoint).find(Boolean);

  return (
    <span className={s.wrap}>
      <button className={u.refs + " " + s.btn} onClick={toggle} aria-expanded={open} title="Show the memories this rests on and check them on Sui">
        [{hits.map((h) => h.n).join(",")}]
      </button>
      {open && (
        <span className={s.pop} role="note">
          {hits.map((h) => (
            <span key={h.n} className={s.src}>
              <span className="mono">{h.date}</span> <Kind kind={h.kind} /> {h.body}
              <a className="mono" href={`https://walruscan.com/mainnet/blob/${h.blobId}`} target="_blank" rel="noreferrer">
                walrus {h.blobId.slice(0, 6)}
              </a>
              <OnChain c={checked.get(h.blobId) ?? (state === "failed" ? "failed" : "checking")} />
            </span>
          ))}
          {state === "failed" && (
            <button className={s.retry} onClick={() => void verify()}>Retry the Sui check</button>
          )}
          {cp && <span className={`mono ${s.cp}`}>Read through Tatum at Sui checkpoint {cp}</span>}
        </span>
      )}
    </span>
  );
}
