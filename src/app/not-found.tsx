import Link from "next/link";
import { Brand } from "@/components/AppShell";
import s from "./notfound.module.css";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ padding: "22px clamp(18px, 4vw, 56px)" }}><Brand /></header>
      <main className={s.wrap}>
        <div className={s.sheet}>
          <span className={`mono ${s.stamp}`}>Not on file</span>
          <p className="mono">Entry 404</p>
          <h1 className="display">This page was never <em>filed.</em></h1>
          <p className={s.body}>The link may be old, or the page may have moved. Your record is fine; it lives on Walrus, not at this address.</p>
          <div className={s.links}>
            <Link href="/today" className={s.primary}>Open my record</Link>
            <Link href="/">Back to the front page</Link>
          </div>
        </div>
        <div className={s.torn} aria-hidden />
      </main>
    </div>
  );
}
