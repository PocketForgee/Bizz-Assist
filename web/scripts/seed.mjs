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
if (!/^https:\/\//.test(appUrl)) console.warn("[seed] APP_URL is not https: the order lookup action fails its URL check until it is.");

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
    q: "How long does delivery take?",
    alts: ["when will my order arrive", "shipping time", "how many days for delivery"],
    a: "We ship within 1–2 business days. Delivery takes 3–5 business days in the US, 5–8 days to Europe and India, and up to 10 days elsewhere. You get a tracking link by email as soon as your order ships.",
  },
  {
    q: "What is your return policy?",
    alts: ["can I return an item", "refund policy", "how do I send something back"],
    a: "You can return unused items within 30 days of delivery for a full refund. Start a return from the link in your delivery email. Return shipping is free in the US; elsewhere it is deducted from the refund. Refunds reach your card 5–7 days after we receive the item.",
  },
  {
    q: "Do you ship internationally?",
    alts: ["do you deliver to India", "shipping to Europe", "international orders"],
    a: "Yes, we ship to over 40 countries, including India, the UK, the EU, the UAE and Australia. Duties and taxes are shown at checkout, so there is nothing extra to pay on delivery.",
  },
  {
    q: "Which payment methods do you accept?",
    alts: ["can I pay with UPI", "do you take PayPal", "payment options"],
    a: "We accept Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay and UPI (India only).",
  },
  {
    q: "How do I wash linen and cotton items?",
    alts: ["care instructions", "can I machine wash the throw"],
    a: "Machine wash cold on a gentle cycle with mild detergent, then line dry or tumble dry low. Wool blankets are dry clean only. Every item also has a care label.",
  },
  {
    q: "Can I change or cancel my order?",
    alts: ["cancel order", "change shipping address", "edit my order"],
    a: "You can change or cancel an order until it ships, usually within 24 hours. Message us with your order ID and we'll update it. Once it has shipped, you can return it instead.",
  },
  {
    q: "Do you offer gift wrapping?",
    alts: ["gift wrap", "can you add a gift note"],
    a: "Yes. Choose gift wrapping at checkout for $5 per order and add a free handwritten note. Prices are left off the packing slip.",
  },
];

const ACTION_DESCRIPTION =
  "Look up an order's status, carrier, tracking number and expected delivery date. " +
  "Needs the order ID (like LL-1002) and the email or phone on the order.";

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
      insert into businesses (id, name, category, default_lang, support_hours, plan, onboarded_at)
      values (${businessId}, 'Lumen & Loom', 'handmade linen and home goods', 'en', 'Mon–Sat 09:00–18:00 (UTC)', 'pro', now())
    `;
    await tx`
      insert into users (id, business_id, email, pass_hash, name, role, lang, nx_user_id) values
        (${ownerId}, ${businessId}, ${OWNER_EMAIL}, ${passHash}, 'Demo Owner', 'owner', 'en', ${"a" + hex(ownerId)}),
        (${agentId}, ${businessId}, ${AGENT_EMAIL}, ${passHash}, 'Demo Agent', 'agent', 'en', ${"a" + hex(agentId)})
    `;
    await tx`
      insert into api_actions (id, business_id, name, description, kind, method, url_template, params, sheet_match)
      values (${actionId}, ${businessId}, 'Order lookup', ${ACTION_DESCRIPTION}, 'sheet', 'GET',
              ${`${appUrl}/demo-orders.csv`}, ${tx.json([])}, ${tx.json({ order_column: "order_id", contact_column: "email" })})
    `;
    await tx`
      insert into widgets (id, business_id, name, color, title, greeting, languages, persona, enabled_action_ids)
      values (${widgetId}, ${businessId}, 'Website chat', '#217a70', 'Lumen & Loom',
              'Hi! Ask me about orders, delivery or returns.', ${["en", "es", "hi"]},
              'Warm and brief. No emojis.', ${[actionId]})
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
      "[seed] Lumen & Loom created.",
      `  Owner : ${OWNER_EMAIL}`,
      `  Agent : ${AGENT_EMAIL}`,
      `  Password (both): ${password}`,
      `  Buyer chat: ${appUrl || "<APP_URL>"}/w/${widgetId}`,
      '  Try: "Where is my order LL-1002? My email is arjun@example.com"',
    ].join("\n"),
  );
}

main()
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
