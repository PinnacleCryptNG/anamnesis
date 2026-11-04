"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession, formatKey } from "@/lib/session";
import { Mark, TodayIcon, TimelineIcon, BriefIcon, KeyIcon, SealIcon, NibIcon, CrossCardIcon } from "./Icons";
import s from "./AppShell.module.css";

const NAV = [
  { href: "/today", label: "Today", Icon: TodayIcon },
  { href: "/timeline", label: "Timeline", Icon: TimelineIcon },
  { href: "/brief", label: "Brief", Icon: BriefIcon },
  { href: "/share", label: "Share", Icon: KeyIcon },
];

export function Brand({ small }: { small?: boolean }) {
  return (
    <Link href="/" className={`${s.brand} ${small ? s.brandSmall : ""}`} aria-label="Anamnesis home">
      <Mark size={small ? 26 : 30} />
      <span className="display">Anamnesis</span>
    </Link>
  );
}

function Whose() {
  const session = useSession();
  if (!session) return <span className={s.whose}>&nbsp;</span>;
  if (session.mode === "sample")
    return (
      <span className={s.whose}>
        <b>Sample patient</b>
        <span>Read only. <Link href="/start">Start your own</Link></span>
      </span>
    );
  return (
    <span className={s.whose}>
      <b>{session.own ? "Your Walrus account" : "Your record"}</b>
      <span className="mono">{session.key ? `card ${formatKey(session.key).slice(-4)}` : "own account"}</span>
    </span>
  );
}

export default function AppShell({ children, title, sub, aside }: { children: React.ReactNode; title: string; sub?: string; aside?: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const session = useSession();
  useEffect(() => {
    if (session?.mode === "none") router.replace("/start");
  }, [session, router]);
  const on = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className={s.app}>
      <aside className={s.rail}>
        <Brand />
        <Whose />
        <Link href="/record" className={`${s.note} ${on("/record") ? s.noteOn : ""}`}>
          <NibIcon size={20} />
          <span>New note</span>
        </Link>
        <nav className={s.nav} aria-label="Record">
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={on(href) ? s.on : undefined} aria-current={on(href) ? "page" : undefined}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <nav className={s.minor} aria-label="More">
          <Link href="/emergency" className={on("/emergency") ? s.on : undefined}><CrossCardIcon size={18} /><span>Emergency card</span></Link>
          <Link href="/ledger" className={on("/ledger") ? s.on : undefined}><SealIcon size={18} /><span>Proof on Sui</span></Link>
        </nav>
      </aside>

      <header className={s.top}>
        <Brand small />
        <div className={s.topEnd}>
          <Whose />
          <Link href="/emergency" aria-label="Emergency card" className={on("/emergency") ? s.on : undefined}><CrossCardIcon size={20} /></Link>
          <Link href="/ledger" aria-label="Proof on Sui" className={on("/ledger") ? s.on : undefined}><SealIcon size={20} /></Link>
        </div>
      </header>

      <main className={s.main} key={path}>
        <div className={s.head}>
          <h1 className="display">{title}</h1>
          {sub && <p>{sub}</p>}
          {aside}
        </div>
        {children}
      </main>

      <nav className={s.dock} aria-label="Record">
        {NAV.slice(0, 2).map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={on(href) ? s.on : undefined}><Icon size={22} /><span>{label}</span></Link>
        ))}
        <Link href="/record" className={`${s.pen} ${on("/record") ? s.penOn : ""}`} aria-label="New note">
          <NibIcon size={24} />
        </Link>
        {NAV.slice(2).map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={on(href) ? s.on : undefined}><Icon size={22} /><span>{label}</span></Link>
        ))}
      </nav>
    </div>
  );
}
