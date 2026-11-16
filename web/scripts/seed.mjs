// Demo data for judges: one business with an owner and an agent login, a widget, Q&A and a sheet action.
//   npm run seed                                     (local, reads DATABASE_URL and APP_URL)
//   docker compose exec web node scripts/seed.mjs    (on the server)
// Flags: --reset deletes the demo business first. DEMO_PASSWORD sets both passwords (else random, printed once).
// Plain JS on purpose: the production image has no TypeScript runner.
import postgres from "postgres";
import { randomBytes, randomUUID, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const OWNER_EMAIL = "owner@bizzassist.biz";
const AGENT_EMAIL = "agent@bizzassist.biz";

const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
if (!/^https:\/\//.test(appUrl)) console.warn("[seed] APP_URL is not https: the account lookup action fails its URL check until it is.");

const sql = postgres(process.env.DATABASE_URL ?? "postgres://bizzassist:bizzassist@localhost:5432/bizzassist", { max: 1 });
const hex = (uuid) => uuid.replace(/-/g, "");

// same format as lib/auth.ts hashPassword
async function hashPassword(pw) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

const QA = [
  {
    q: "How do I add the chat to my website?",
    alts: ["install the widget", "embed code", "add BizzAssist to my site"],
    a: "Open Widgets, pick your widget and go to Install. Paste the one-line script tag into your site's HTML. You also get a chat link and a QR code you can share without a website.",
  },
  {
    q: "What does each plan include?",
    alts: ["plans and limits", "free plan limits", "what do I get on Pro"],
    a: "Free: 1 widget, 1 person answering, 20 website pages, 50 Q&A entries, 1 API action and 300 AI replies a month. Pro: 5 widgets, 5 people, 300 pages, 1,000 Q&A, 10 actions and 5,000 AI replies. Business: 25 widgets, 50 people, 3,000 pages, 10,000 Q&A, 50 actions and 50,000 AI replies.",
  },
  {
    q: "Which languages does it support?",
    alts: ["can it answer in Hindi", "multilingual support", "agent languages"],
    a: "The assistant answers buyers in the language they write in. Agents pick one of English, Hindi, Spanish, Arabic, French, German, Portuguese or Indonesian, and chats are translated both ways between the agent and the buyer.",
  },
  {
    q: "What can I train the assistant on?",
    alts: ["knowledge sources", "can I upload a PDF", "train the bot"],
    a: "Your website pages or sitemap, documents (PDF or text up to 10 MB), Q&A entries with other ways of asking, API actions such as an order or account lookup from a Google Sheet or REST API, and answers your team gave that you approved.",
  },
];

const ACTION_DESCRIPTION =
  "Look up a BizzAssist account's plan, status and renewal date. " +
  "Needs the account ID (like BA-1002) and the email on the account.";

async function main() {
  const reset = process.argv.includes("--reset");
  const [existing] = await sql`select business_id from users where email = ${OWNER_EMAIL}`;
  if (existing && !reset) {
    console.log("[seed] demo business already exists. Run with --reset to recreate it (deletes its chats).");
    return;
  }
  const password = process.env.DEMO_PASSWORD || randomBytes(9).toString("base64url");
  const passHash = await hashPassword(password);

  const businessId = randomUUID();
  const ownerId = randomUUID();
  const agentId = randomUUID();
  const actionId = randomUUID();
  const widgetId = randomUUID();

  await sql.begin(async (tx) => {
    if (existing) await tx`delete from businesses where id = ${existing.business_id}`;
    await tx`
      insert into businesses (id, name, category, website, default_lang, support_hours, plan, onboarded_at)
      values (${businessId}, 'BizzAssist', 'software / SaaS', 'https://bizzassist.biz', 'en', 'Mon–Fri 09:00–18:00 (IST)', 'free', now())
    `;
    await tx`
      insert into users (id, business_id, email, pass_hash, name, role, lang, nx_user_id) values
        (${ownerId}, ${businessId}, ${OWNER_EMAIL}, ${passHash}, 'Demo Owner', 'owner', 'en', ${"a" + hex(ownerId)}),
        (${agentId}, ${businessId}, ${AGENT_EMAIL}, ${passHash}, 'Demo Agent', 'agent', 'en', ${"a" + hex(agentId)})
    `;
    await tx`
      insert into api_actions (id, business_id, name, description, kind, method, url_template, params, sheet_match)
      values (${actionId}, ${businessId}, 'Account lookup', ${ACTION_DESCRIPTION}, 'sheet', 'GET',
              ${`${appUrl}/demo-accounts.csv`}, ${tx.json([])}, ${tx.json({ order_column: "account_id", contact_column: "email" })})
    `;
    await tx`
      insert into widgets (id, business_id, name, color, title, greeting, languages, persona, allowed_domains, escalation_keywords, enabled_action_ids)
      values (${widgetId}, ${businessId}, 'Website chat', '#217a70', 'BizzAssist',
              'Hi! Ask me anything about BizzAssist: setup, plans or your account.', ${["en"]},
              'Warm and brief. No emojis.', ${["bizzassist.biz"]}, ${["refund", "human", "agent"]}, ${[actionId]})
    `;
    for (const item of QA) {
      await tx`
        insert into knowledge_items (business_id, source, title, content, alternatives)
        values (${businessId}, 'qa', ${item.q}, ${item.a}, ${item.alts})
      `;
    }
  });

  console.log(
    [
      "[seed] BizzAssist demo business created.",
      `  Owner : ${OWNER_EMAIL}`,
      `  Agent : ${AGENT_EMAIL}`,
      `  Password (both): ${password}`,
      `  Buyer chat: ${appUrl || "<APP_URL>"}/w/${widgetId}`,
      '  Try: "What is the status of account BA-1002? My email is ravi@example.com"',
    ].join("\n"),
  );
}

main()
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
