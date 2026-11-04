import Link from "next/link";
import { Mark, Arrow, KeyIcon, SealIcon, PenIcon, BriefIcon } from "@/components/Icons";
import Pad from "@/components/landing/Pad";
import Reveal from "@/components/landing/Reveal";
import LiveProof from "@/components/landing/LiveProof";
import s from "@/components/landing/landing.module.css";

const FORGET = [
  ["When the dose changed.", "Was it 25 or 50 mg in August? Which week did it go up?"],
  ["Which pill did that.", "The tingling, the rash, the fog. And how long after starting."],
  ["What the last doctor said.", "“Get an ECG first.” “No more than two ibuprofen days a week.”"],
];

const TIMELINE = [
  { date: "Jun 12", who: "GP visit", said: "This is your first entry, so no historical patterns yet.", note: "Files only what you said." },
  { date: "Jul 24", who: "Follow-up", said: "The ibuprofen you’ve been taking most days since at least June may explain why the frequency stayed so high.", note: "Links a new instruction to June." },
  { date: "Aug 10", who: "Two weeks on topiramate", said: "Headaches down to about two a week, a big drop from the 14 days recorded on 24 July.", note: "Measures against its own baseline." },
  { date: "Sep 18", who: "Call to the clinic", said: "Three ibuprofen days this week breaks the two-day limit Dr. Okafor set in July.", note: "Holds you to past advice." },
  { date: "Oct 15", who: "Neurology", said: "The switch to propranolol is the last step in a chain that began with the side effects first noted in August.", note: "Files the chain as a pattern." },
];

export default function Home() {
  return (
    <div className={s.page}>
      <header className={s.nav}>
        <Link href="/" className={s.brand}><Mark size={32} /><span className="display">Anamnesis</span></Link>
        <nav>
          <a href="#learns">How it learns</a>
          <a href="#brief">The brief</a>
          <a href="#proof">Proof</a>
          <Link href="/record" className={s.navCta}>Open the record</Link>
        </nav>
      </header>

      <section className={s.hero}>
        <div className={s.heroCopy}>
          <h1 className="display">Your medical history, <em>remembered.</em></h1>
          <p className={s.lead}>
            Every new doctor asks what’s happened so far. Tell Anamnesis after each visit, flare-up or new prescription. It files every
            symptom, dose and instruction as a memory you own, then writes the brief for your next appointment.
          </p>
          <div className={s.ctas}>
            <Link href="/record" className={s.primary}>Open the demo record <Arrow /></Link>
            <Link href="/brief" className={s.secondary}>Prepare a brief</Link>
          </div>
          <p className={s.fine}>Stored on Walrus Memory, verified on Sui through Tatum. It organises what you tell it and never diagnoses.</p>
        </div>
        <Pad />
      </section>

      <section className={s.dark}>
        <Reveal className={s.darkInner}>
          <h2 className="display">“So, what’s your history?”<br /><em>Most of us answer from memory. Badly.</em></h2>
          <ol className={s.forget}>
            {FORGET.map(([h, p], i) => (
              <li key={h} style={{ "--i": i } as React.CSSProperties}>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display">{h}</h3>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section id="learns" className={s.section}>
        <Reveal className={s.sectionHead}>
          <PenIcon size={26} />
          <h2 className="display">It gets sharper with <em>every visit.</em></h2>
          <p>Before filing a note, Anamnesis recalls the history related to it. When something new connects to the past, it files that link as a pattern memory of its own. These are its real replies to the demo patient over five months.</p>
        </Reveal>
        <ol className={s.timeline}>
          {TIMELINE.map((t, i) => (
            <Reveal as="li" key={t.date} className={s.tItem}>
              <span className={`mono ${s.tDate}`}>{t.date}</span>
              <div className={s.tCard} style={{ "--i": i } as React.CSSProperties}>
                <span className={s.tWho}>{t.who}</span>
                <blockquote className="display">{t.said}</blockquote>
                <span className={`mono ${s.tNote}`}>{t.note}</span>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section id="brief" className={`${s.section} ${s.briefSec}`}>
        <Reveal className={s.briefCopy}>
          <BriefIcon size={26} />
          <h2 className="display">Walk in with one page, <em>every line sourced.</em></h2>
          <p>Say what the appointment is for. Anamnesis recalls what matters and writes what changed, your current medicines, patterns across visits, questions to ask and what to raise. Each line cites the memories behind it, and the brief is filed too, so the next one knows what you already asked.</p>
          <Link href="/brief" className={s.textLink}>Try it on the demo record <Arrow size={16} /></Link>
        </Reveal>
        <Reveal className={s.sheet}>
          <span className={`mono ${s.sheetFor}`}>Prepared for: 8-week neurology follow-up</span>
          <p className={`display ${s.sheetHead}`}>Propranolol 40 mg twice daily after stopping topiramate; diary and ECG to review today.</p>
          <h4 className="mono">Questions to ask</h4>
          <ul>
            <li>Was the ECG done, and is it clear to continue propranolol? <sup>8</sup></li>
            <li>Has the word-finding trouble cleared since stopping topiramate? <sup>5,6</sup></li>
            <li>Is ibuprofen staying under two days a week? <sup>15,37</sup></li>
          </ul>
          <h4 className="mono">Raise with the clinician</h4>
          <ul className={s.flag}>
            <li>Any wheeze on propranolol, given childhood asthma. <sup>2</sup></li>
          </ul>
        </Reveal>
      </section>

      <section id="proof" className={s.section}>
        <div className={s.duo}>
          <Reveal className={s.duoItem}>
            <KeyIcon size={28} />
            <h3 className="display">One key per doctor.</h3>
            <p>Anamnesis cuts a key for each clinician. Only you can switch it on, from your Walrus Memory dashboard, and you can switch it off there at any time. The doctor’s link reads with their key, never the app’s.</p>
          </Reveal>
          <Reveal className={s.duoItem}>
            <SealIcon size={28} />
            <h3 className="display">Checked on Sui, every open.</h3>
            <p>Each time a shared link is opened, the server reads your memory account on Sui mainnet through Tatum’s gRPC gateway. If you have revoked the key, nothing is recalled.</p>
          </Reveal>
        </div>
        <Reveal><LiveProof /></Reveal>
      </section>

      <section className={s.closing}>
        <Reveal>
          <h2 className="display">Start with the last appointment <em>you remember.</em></h2>
          <Link href="/record" className={s.primary}>Open the record <Arrow /></Link>
        </Reveal>
      </section>

      <footer className={s.footer}>
        <div className={s.brand}><Mark size={24} /><span className="display">Anamnesis</span></div>
        <p>Built for the Tatum × Walrus Memory “Total Recall” hackathon. Not a medical device; it does not diagnose or advise.</p>
        <nav>
          <Link href="/ledger">Ledger</Link>
          <a href="https://github.com/PinnacleCryptNG/anamnesis" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  );
}
