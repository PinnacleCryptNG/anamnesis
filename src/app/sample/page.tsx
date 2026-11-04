"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { chooseSample } from "@/lib/session";
import u from "@/components/ui.module.css";

export default function SamplePage() {
  const router = useRouter();
  useEffect(() => {
    chooseSample();
    router.replace(window.location.hash === "#brief" ? "/brief" : "/today");
  }, [router]);
  return <p className={u.empty} style={{ padding: "20vh 24px", textAlign: "center" }}><span className={u.loading} />Opening the sample patient…</p>;
}
