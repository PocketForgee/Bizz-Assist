import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// One typeface: Geist. Geist Mono only for figures, slips and other data.
const sans = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BizzAssist", template: "%s · BizzAssist" },
  description: "Support chat for online shops. It answers from what you teach it, hands hard chats to your team, and learns from every answer they give.",
};

export const viewport: Viewport = {
  themeColor: "#f7f9f9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
