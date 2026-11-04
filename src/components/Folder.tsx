"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark, RecordIcon, BriefIcon, KeyIcon, SealIcon } from "./Icons";
import s from "./Folder.module.css";

const TABS = [
  { href: "/record", label: "Record", tone: "var(--tab-record)", Icon: RecordIcon },
  { href: "/brief", label: "Brief", tone: "var(--tab-brief)", Icon: BriefIcon },
  { href: "/share", label: "Share", tone: "var(--tab-share)", Icon: KeyIcon },
  { href: "/ledger", label: "Ledger", tone: "var(--tab-ledger)", Icon: SealIcon },
];

export function Brand() {
  return (
    <Link href="/" className={s.brand} aria-label="Anamnesis home">
      <Mark size={30} />
      <span className="display">Anamnesis</span>
    </Link>
  );
}

export default function Folder({ children, title, sub, wide }: { children: React.ReactNode; title: string; sub?: string; wide?: boolean }) {
  const path = usePathname();
  const active = TABS.find((t) => t.href === path) ?? TABS[0];
  return (
    <div className={s.desk}>
      <header className={s.label}>
        <Brand />
        <nav className={s.top} aria-label="Site">
          <Link href="/#learns">How it learns</Link>
          <a href="https://github.com/PinnacleCryptNG/anamnesis" target="_blank" rel="noreferrer">Source</a>
        </nav>
      </header>
      <div className={s.folder}>
        <nav className={s.tabs} aria-label="Sections">
          {TABS.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className={`${s.tab} ${t.href === active.href ? s.on : ""}`}
              style={{ "--tone": t.tone, "--i": i } as React.CSSProperties}
              aria-current={t.href === active.href ? "page" : undefined}
            >
              <t.Icon size={20} className={s.tabIcon} />
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
        <main className={`${s.sheet} ${wide ? s.wide : ""}`} style={{ "--tone": active.tone } as React.CSSProperties} key={path}>
          <div className={s.head}>
            <h1 className="display">{title}</h1>
            {sub && <p>{sub}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
