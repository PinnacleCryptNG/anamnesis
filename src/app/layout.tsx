import type { Metadata } from "next";
import { Libre_Caslon_Text, Atkinson_Hyperlegible, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const caslon = Libre_Caslon_Text({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--f-display" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--f-body" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });

export const metadata: Metadata = {
  title: "Anamnesis, a medical memory you own",
  description: "Your medical history, remembered on Walrus and verified on Sui through Tatum.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caslon.variable} ${atkinson.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
