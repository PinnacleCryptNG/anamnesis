"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { openRecord, validKey } from "@/lib/session";
import u from "@/components/ui.module.css";

export default function OpenPage() {
  const router = useRouter();
  const [bad, setBad] = useState(false);
  useEffect(() => {
    const k = new URLSearchParams(window.location.hash.slice(1)).get("k") || "";
    if (validKey(k)) {
      openRecord(k);
      history.replaceState(null, "", "/open");
      router.replace("/today");
    } else setBad(true);
  }, [router]);
  return (
    <main style={{ maxWidth: 560, margin: "18vh auto", padding: 24 }}>
      {bad ? (
        <>
          <h1 className="display" style={{ fontWeight: 400, fontSize: 36 }}>That card didn&apos;t scan cleanly.</h1>
          <p className={u.muted} style={{ margin: "12px 0 20px" }}>Type the record key by hand instead.</p>
          <Link className={u.primary} href="/start">Enter my key</Link>
        </>
      ) : (
        <p className={u.empty}><span className={u.loading} />Opening your record…</p>
      )}
    </main>
  );
}
