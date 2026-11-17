import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "@/components/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What BizzAssist and the BizzAssist Agent app collect, why, who processes it and how to delete it.",
};

const CONTACT = "support@bizzassist.biz";
const UPDATED = "November 17, 2026";

const sections: { id: string; title: string; body: ReactNode[] }[] = [
  {
    id: "who",
    title: "Who we are",
    body: [
      <>BizzAssist is a customer support service for online businesses: an AI assistant in a chat widget, a dashboard for the business, and the BizzAssist Agent app for Android, used by a business&apos;s support team. This policy covers bizzassist.biz, the chat widget and the Android app.</>,
      <>Questions about this policy or your data: <a className="text-primary underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</>,
    ],
  },
  {
    id: "collect",
    title: "What we collect",
    body: [
      <><b>Business owners and agents.</b> Name, email address and password when an account is created. Passwords are stored only as scrypt hashes. We also keep a session token while you are signed in and the language you choose for translations.</>,
      <><b>What a business teaches the assistant.</b> Website pages, documents, text and Q&amp;A it adds. For documents we keep the extracted text, not the file. Keys for order and account lookups are encrypted with AES-256-GCM.</>,
      <><b>Customers who chat.</b> The messages you send, the language of the chat, a random guest ID kept in your browser so the chat survives a reload, and a rating if you give one. We do not ask for your name or email; anything you type in a message is stored as part of the chat.</>,
      <><b>Technical data.</b> Your IP address is used in memory for rate limiting and is not stored. We do not use advertising or analytics trackers.</>,
    ],
  },
  {
    id: "use",
    title: "How we use it",
    body: [
      <>To run the service: answer customers with the assistant, hand chats to the business&apos;s agents, translate messages between the customer and the agent, write short summaries for agents, suggest new answers from resolved chats, and show the business its analytics.</>,
      <>We do not sell personal data and we do not use it for advertising.</>,
    ],
  },
  {
    id: "processors",
    title: "Who processes it for us",
    body: [
      <><b>Nexconn</b> delivers chat messages between customers, the assistant and agents.</>,
      <><b>Google</b> provides the AI model that writes answers, translations and summaries. Chat messages and the business&apos;s knowledge are sent to it to produce each reply.</>,
      <><b>Google Sheets or the business&apos;s own API</b>, only when a business connects one for order or account lookups. The assistant looks up a record only after the customer gives the keys the business requires, such as an order ID and email.</>,
      <>Our servers run on Oracle Cloud. Data is sent over HTTPS.</>,
    ],
  },
  {
    id: "android",
    title: "The BizzAssist Agent app",
    body: [
      <>The app signs agents in with their BizzAssist email and password, keeps the session token, name and language setting on the device, and shows the business&apos;s chats. It asks for notification permission so it can alert the agent when a customer is waiting. It does not access contacts, location, camera, microphone or files, and it contains no ads or analytics.</>,
      <>Signing out deletes the session from our server and from the device.</>,
    ],
  },
  {
    id: "delete",
    title: "Keeping and deleting data",
    body: [
      <>We keep data while the business&apos;s account is active. A business can delete its knowledge, Q&amp;A, lookups, widgets and agent accounts from the dashboard at any time.</>,
      <>To delete a whole account, or a customer chat you took part in, email <a className="text-primary underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> from the account&apos;s email address, or with the chat&apos;s details. We delete it within 30 days and confirm by email.</>,
    ],
  },
  {
    id: "children",
    title: "Children",
    body: [<>BizzAssist is a tool for businesses and is not directed at children under 13.</>],
  },
  {
    id: "changes",
    title: "Changes",
    body: [<>If this policy changes, we update this page and the date at the top.</>],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-pearl">
      <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-8 sm:py-10">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-ink" aria-label="BizzAssist home">
          <Mark size={22} />
          <span className="t-body-strong">BizzAssist</span>
        </Link>
        <h1 className="t-display text-ink">Privacy policy</h1>
        <p className="t-caption mt-2 text-ink-80">Last updated {UPDATED}</p>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-10">
            <h2 className="t-tagline text-ink">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="t-lead mt-3">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
