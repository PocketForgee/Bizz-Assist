import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter stands in for SF Pro off Apple platforms (DESIGN_SPEC.md section 3)
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "BizzAssist", template: "%s · BizzAssist" },
  description: "AI customer support that learns from your agents.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full" style={{ fontFeatureSettings: '"ss03"' }}>
        {children}
      </body>
    </html>
  );
}
