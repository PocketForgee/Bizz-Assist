import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { assertPublicUrl, isPrivateIp, UnsafeUrlError } from "../lib/net";
import { contactMatches, fillTemplate, matchSheetRow, parseCsv, toolDeclaration, toolName, type ApiAction } from "../lib/actions";
import { decrypt, encrypt } from "../lib/crypto";
import { keepLearned } from "../lib/ai/learn";
import { extractPage, parseSitemap } from "../lib/ingest/web";

// ---- SSRF guard ----

test("private, loopback and link-local addresses are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111"]) {
    assert.equal(isPrivateIp(ip), false, ip);
  }
});

test("assertPublicUrl rejects http, localhost, private IPs and credentials without any network", async () => {
  for (const url of ["http://example.com", "https://localhost/x", "https://127.0.0.1/", "https://10.0.0.5/", "https://169.254.169.254/latest/meta-data", "https://[::1]/", "https://user:pw@example.com/", "https://printer.local/", "notaurl"]) {
    await assert.rejects(assertPublicUrl(url), UnsafeUrlError, url);
  }
  // public IP literal needs no DNS
  assert.equal((await assertPublicUrl("https://8.8.8.8/x")).hostname, "8.8.8.8");
});

// ---- API Actions ----

test("URL template values are URL-encoded and required params enforced", () => {
  const params = [
    { name: "order_id", description: "", required: true },
    { name: "email", description: "", required: false },
  ];
  assert.equal(
    fillTemplate("https://api.shop.com/orders/{order_id}?email={email}", { order_id: "A 1/../2?x=1", email: "a+b@c.com" }, params),
    "https://api.shop.com/orders/A%201%2F..%2F2%3Fx%3D1?email=a%2Bb%40c.com",
  );
  assert.equal(fillTemplate("https://x.com/{email}", {}, params), "https://x.com/");
  assert.throws(() => fillTemplate("https://x.com/{order_id}", { order_id: "  " }, params), /Missing order_id/);
});

test("CSV parser handles quotes, commas, CRLF and newlines in cells", () => {
  const rows = parseCsv('Order ID,Email,Status\r\n1001,a@x.com,"Shipped, on the way"\r\n1002,b@x.com,"Said ""hi""\nthen left"\r\n');
  assert.deepEqual(rows, [
    ["Order ID", "Email", "Status"],
    ["1001", "a@x.com", "Shipped, on the way"],
    ["1002", "b@x.com", 'Said "hi"\nthen left'],
  ]);
});

const sheet = parseCsv("Order ID,Contact,Status\n1001,a@x.com,Shipped\n1002,+91 98765 43210,Packed\n");
const match = { order_column: "order id", contact_column: "CONTACT" };

test("sheet row needs BOTH order ID and contact to match", () => {
  assert.equal(matchSheetRow(sheet, match, "1001", "A@X.com")?.Status, "Shipped");
  assert.equal(matchSheetRow(sheet, match, "#1002", "9876543210")?.Status, "Packed");
  assert.equal(matchSheetRow(sheet, match, "1001", "b@x.com"), null, "right order, wrong email");
  assert.equal(matchSheetRow(sheet, match, "1002", "a@x.com"), null, "wrong pair");
  assert.equal(matchSheetRow(sheet, match, "1001", ""), null, "missing contact");
  assert.equal(matchSheetRow(sheet, match, "", "a@x.com"), null, "missing order");
  assert.equal(matchSheetRow(sheet, { order_column: "nope", contact_column: "contact" }, "1001", "a@x.com"), null, "unknown column");
});

test("contact matching: email exact, phone by last 10 digits, short numbers rejected", () => {
  assert.equal(contactMatches("a@x.com", "A@x.com "), true);
  assert.equal(contactMatches("a@x.com", "a@y.com"), false);
  assert.equal(contactMatches("098765 43210", "+91-9876543210"), true);
  assert.equal(contactMatches("123", "123"), false);
});

test("tool declarations: sheet always asks for both keys; names are tool-safe", () => {
  const base: ApiAction = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    business_id: "x",
    name: "Order status",
    description: "Look up an order",
    kind: "sheet",
    method: "GET",
    url_template: "https://docs.google.com/x.csv",
    params: [],
    headers_enc: null,
    sheet_match: match,
  };
  const d = toolDeclaration(base);
  assert.match(toolName(base), /^[A-Za-z0-9_]{1,64}$/);
  assert.deepEqual((d.parametersJsonSchema as { required: string[] }).required, ["order_id", "contact"]);
});

test("header encryption round-trips and detects tampering", () => {
  const key = randomBytes(32);
  const enc = encrypt('{"Authorization":"Bearer s3cret"}', key);
  assert.ok(!enc.includes("s3cret"));
  assert.equal(decrypt(enc, key), '{"Authorization":"Bearer s3cret"}');
  const parts = enc.split(".");
  parts[3] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => decrypt(parts.join("."), key));
  assert.throws(() => decrypt(enc, randomBytes(32)));
});

// ---- learning + ingest ----

test("learned answers: keep only policy entries above 0.6 confidence", () => {
  const kept = keepLearned([
    { question: "Do you ship abroad?", answer: "Yes, to 20 countries.", is_policy: true, confidence: 0.9, duplicate_of: null },
    { question: "Where is order 55?", answer: "Shipped.", is_policy: false, confidence: 0.95, duplicate_of: null },
    { question: "Returns?", answer: "30 days.", is_policy: true, confidence: 0.6, duplicate_of: null },
    { question: "", answer: "x", is_policy: true, confidence: 0.9, duplicate_of: null },
  ]);
  assert.deepEqual(kept.map((k) => k.question), ["Do you ship abroad?"]);
});

test("page extraction drops scripts and keeps readable text", () => {
  const html = `<html><head><title>Shipping policy</title><script>var secret=1</script></head>
    <body><nav>Home Shop</nav><article><h1>Shipping</h1><p>${"We ship across India within 3 to 5 working days. ".repeat(10)}</p></article></body></html>`;
  const page = extractPage(html, "https://shop.com/shipping");
  assert.match(page.text, /3 to 5 working days/);
  assert.doesNotMatch(page.text, /secret/);
  assert.ok(page.title.length > 0);
});

test("sitemap parsing finds <loc> entries and index files", () => {
  const s = parseSitemap("<urlset><url><loc> https://a.com/x?y=1&amp;z=2 </loc></url><url><loc>https://a.com/b</loc></url></urlset>");
  assert.deepEqual(s, { urls: ["https://a.com/x?y=1&z=2", "https://a.com/b"], isIndex: false });
  assert.equal(parseSitemap("<sitemapindex><sitemap><loc>https://a.com/s1.xml</loc></sitemap></sitemapindex>").isIndex, true);
});

// ---- claim race (needs a throwaway Postgres: RUN_DB_TESTS=1 DATABASE_URL=postgres://... npm test) ----

test("claim race: only one of two simultaneous claims wins", { skip: !process.env.RUN_DB_TESTS && "set RUN_DB_TESTS=1 and DATABASE_URL to a throwaway database" }, async () => {
  const { sql, applySchema } = await import("../lib/db");
  const { takeConversation } = await import("../lib/conversations");
  await applySchema();
  const biz = crypto.randomUUID();
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  const conv = crypto.randomUUID();
  try {
    await sql`insert into businesses (id, name) values (${biz}, 'Race test')`;
    for (const u of [a, b]) {
      await sql`insert into users (id, business_id, email, pass_hash, name, role, nx_user_id) values (${u}, ${biz}, ${u + "@t.test"}, 'x', 'A', 'agent', ${"a" + u.replace(/-/g, "")})`;
    }
    const [w] = await sql<{ id: string }[]>`insert into widgets (business_id, name) values (${biz}, 'w') returning id`;
    await sql`insert into conversations (id, business_id, widget_id, nx_group_id, guest_nx_id, status, waiting_since)
              values (${conv}, ${biz}, ${w.id}, ${"c" + conv.replace(/-/g, "")}, 'gTEST', 'waiting', now())`;
    const results = await Promise.all([takeConversation({ id: a, business_id: biz }, conv), takeConversation({ id: b, business_id: biz }, conv)]);
    assert.equal(results.filter(Boolean).length, 1);
    // a different business can never claim it
    await sql`update conversations set status = 'waiting', assigned_user_id = null where id = ${conv}`;
    assert.equal(await takeConversation({ id: a, business_id: crypto.randomUUID() }, conv), null);
  } finally {
    await sql`delete from businesses where id = ${biz}`;
    await sql.end();
  }
});
