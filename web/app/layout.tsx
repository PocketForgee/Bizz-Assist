import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Interface: Instrument Sans (warm, exact). Hero headlines only: Instrument Serif. Figures and meta: JetBrains Mono.
const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"], display: "swap" });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BizzAssist", template: "%s · BizzAssist" },
  description: "Support chat for online shops. It answers from what you teach it, hands hard chats to your team, and learns from every answer they give.",
};

export const viewport: Viewport = {
  themeColor: "#f7f9f9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
