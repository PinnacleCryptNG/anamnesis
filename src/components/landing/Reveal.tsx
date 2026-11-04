"use client";
import { useEffect, useRef } from "react";

export default function Reveal({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "li" | "ol" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.in = "true"; io.disconnect(); } }, { threshold: 0.18 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref as React.RefObject<never>} className={className} data-reveal>{children}</Tag>;
}
