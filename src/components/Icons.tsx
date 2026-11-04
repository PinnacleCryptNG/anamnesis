type P = { size?: number; className?: string };
const base = (size = 22) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export function Mark({ size = 30, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="3" y="2.5" width="23" height="27" rx="2.5" fill="var(--paper, #faf6ec)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 2.5v27" stroke="var(--margin, #c9605a)" strokeWidth="1.4" />
      <path d="M12 21.5h10M12 25.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <path d="M12 17.5h4.5c4.2 0 6.5-2.4 6.5-5.4 0-2.7-2-4.6-4.6-4.6-2.7 0-4.4 2-4.4 4.4 0 2.1 1.5 3.6 3.5 3.6 1.7 0 2.9-1.2 2.9-2.7" stroke="var(--oxblood, #7d2320)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
export function RecordIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v16" opacity=".5" /><path d="M11 10h5M11 13.5h5M11 17h3" /><path d="M16 4v3h3" /></svg>;
}
export function BriefIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><rect x="5" y="4.5" width="14" height="16" rx="1.5" /><path d="M9 3h6v3H9z" /><path d="M8.5 10.5l1.3 1.3 2.4-2.6M14 11h2.5M8.5 15.5l1.3 1.3 2.4-2.6M14 16h2.5" /></svg>;
}
export function KeyIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><circle cx="8" cy="12" r="3.6" /><path d="M11.6 12H20M17 12v3M20 12v2" /><path d="M8 12h.01" strokeWidth="2.4" /></svg>;
}
export function SealIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><path d="M12 3l2.1 1.6 2.6-.2.8 2.5 2.2 1.4-.9 2.5.9 2.5-2.2 1.4-.8 2.5-2.6-.2L12 18.6l-2.1-1.6-2.6.2-.8-2.5-2.2-1.4.9-2.5-.9-2.5 2.2-1.4.8-2.5 2.6.2z" /><path d="M9.2 11l1.9 1.9 3.8-3.9" /><path d="M9 18.4L8 22l4-1.6 4 1.6-1-3.6" opacity=".6" /></svg>;
}
export function MicIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></svg>;
}
export function AskIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /><path d="M9 9.2a1.6 1.6 0 1 1 2.2 1.5c-.5.2-.7.6-.7 1.1M10.5 13.6h.01" /></svg>;
}
export function PenIcon({ size, className }: P) {
  return <svg {...base(size)} className={className}><path d="M15.5 4.5l4 4L9 19l-5 1 1-5z" /><path d="M13.5 6.5l4 4" /></svg>;
}
export function Arrow({ size = 18, className }: P) {
  return <svg {...base(size)} className={className}><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" /></svg>;
}
export function LinkOut({ size = 14, className }: P) {
  return <svg {...base(size)} className={className}><path d="M9 5H5v14h14v-4M13 5h6v6M19 5l-8 8" /></svg>;
}
