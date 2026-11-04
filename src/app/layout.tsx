import type { Metadata, Viewport } from "next";
import { Libre_Caslon_Text, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const caslon = Libre_Caslon_Text({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--f-display" });
const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--f-body" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

const description =
  "A medical history you own. Tell it what happened after each visit; it files every symptom, dose and instruction to Walrus Memory on Sui, and writes a cited brief before your next appointment.";

export const metadata: Metadata = {
  metadataBase: new URL("https://anamnesis-inky.vercel.app"),
  title: { default: "Anamnesis: your medical history, remembered", template: "%s · Anamnesis" },
  description,
  openGraph: { title: "Anamnesis: your medical history, remembered", description, siteName: "Anamnesis", type: "website" },
  twitter: { card: "summary_large_image", title: "Anamnesis: your medical history, remembered", description },
};

export const viewport: Viewport = { themeColor: "#ece2c9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caslon.variable} ${sans.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
