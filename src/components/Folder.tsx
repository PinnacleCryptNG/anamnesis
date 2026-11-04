"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./Folder.module.css";

const TABS = [
  { href: "/", label: "Record", tone: "var(--tab-record)" },
  { href: "/brief", label: "Brief", tone: "var(--tab-brief)" },
  { href: "/share", label: "Share", tone: "var(--tab-share)" },
  { href: "/ledger", label: "Ledger", tone: "var(--tab-ledger)" },
];

export default function Folder({ children, title, sub }: { children: React.ReactNode; title: string; sub?: string }) {
  const path = usePathname();
  const active = TABS.find((t) => t.href === path) ?? TABS[0];
  return (
    <div className={s.desk}>
      <header className={s.label}>
        <Link href="/" className={s.brand}>
          <span className="display">Anamnesis</span>
        </Link>
      </header>
      <div className={s.folder}>
        <nav className={s.tabs} aria-label="Sections">
          {TABS.map((t, i) => (
            <Link
              key={t.href}
              href={t.href}
              className={`${s.tab} ${t.href === active.href ? s.on : ""}`}
              style={{ "--tone": t.tone, "--i": i } as React.CSSProperties}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <main className={s.sheet} style={{ "--tone": active.tone } as React.CSSProperties} key={path}>
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
