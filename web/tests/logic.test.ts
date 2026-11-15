import { test } from "node:test";
import assert from "node:assert/strict";
import { assertLimit, limitFor, withinLimit } from "../lib/plans";
import { HttpError } from "../lib/http";
import { frameAncestors, normalizeDomain, parseWidgetPatch } from "../lib/widgets";
import { isGuestId, nxId, randomAlnum, roleFromNxId } from "../lib/ids";
import { buildSources, extractCitations, matchesKeyword, toContents, type KbItem } from "../lib/ai/answer";

test("plan limits", () => {
  assert.equal(limitFor("free", "widgets"), 1);
  assert.equal(withinLimit("free", "widgets", 0), true);
  assert.equal(withinLimit("free", "widgets", 1), false);
  assert.throws(() => assertLimit("free", "widgets", 1), (e: unknown) => e instanceof HttpError && e.status === 402);
  assert.doesNotThrow(() => assertLimit("pro", "widgets", 4));
});

test("Nexconn ids are alphanumeric, <= 64 chars, and map back to roles", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  for (const id of [nxId.guest(), nxId.agent(uuid), nxId.bot(uuid), nxId.group(uuid)]) {
    assert.match(id, /^[A-Za-z0-9]{1,64}$/);
  }
  assert.equal(isGuestId(nxId.guest()), true);
  assert.equal(isGuestId("g-bad"), false);
  assert.equal(roleFromNxId(nxId.agent(uuid)), "agent");
  assert.equal(roleFromNxId(nxId.bot(uuid)), "bot");
  assert.equal(roleFromNxId(nxId.guest()), "buyer");
  assert.equal(randomAlnum(30).length, 30);
});

test("domain normalising and CSP frame-ancestors", () => {
  assert.equal(normalizeDomain("https://Shop.Example.com/path?q=1"), "shop.example.com");
  assert.equal(normalizeDomain("*.example.com"), "*.example.com");
  assert.equal(normalizeDomain("localhost:3000"), "localhost:3000");
  assert.equal(normalizeDomain("not a domain"), null);
  assert.equal(frameAncestors([]), "frame-ancestors *");
  assert.equal(frameAncestors(["shop.example.com"]), "frame-ancestors 'self' https://shop.example.com");
  assert.equal(frameAncestors(["localhost:3000"]), "frame-ancestors 'self' https://localhost:3000 http://localhost:3000");
});

test("widget patch validation", () => {
  const p = parseWidgetPatch({ color: "#ABCDEF", allowed_domains: "a.com\nhttps://a.com/x\nb.com", escalation_keywords: "Human, Refund" });
  assert.deepEqual(p, { color: "#abcdef", allowed_domains: ["a.com", "b.com"], escalation_keywords: ["human", "refund"] });
  assert.throws(() => parseWidgetPatch({ color: "blue" }), HttpError);
  assert.throws(() => parseWidgetPatch({ avatar: "http://insecure.png" }), HttpError);
  assert.throws(() => parseWidgetPatch({ allowed_domains: ["ok.com", "bad domain"] }), HttpError);
  assert.deepEqual(parseWidgetPatch({}), {});
});

const kb: KbItem[] = [
  { id: "1", source: "qa", title: "Do you ship to Pune?", url: null, content: "Yes, 3-5 days." },
  { id: "2", source: "web", title: "Returns", url: "https://x.com/returns", content: "30 day returns." },
];

test("sources block numbers items and keeps within budget", () => {
  const { block, used } = buildSources(kb);
  assert.equal(used.length, 2);
  assert.match(block, /\[S1\] \(qa\)\nQ: Do you ship to Pune\?\nA: Yes, 3-5 days\./);
  assert.match(block, /\[S2\] \(web, https:\/\/x\.com\/returns\)/);
  const big = buildSources([{ id: "3", source: "doc", title: "", url: null, content: "x".repeat(250_000) }]);
  assert.equal(big.used.length, 0);
});

test("citations are stripped from buyer text and mapped to items", () => {
  const { clean, cited } = extractCitations("We ship to Pune in 3-5 days [S1]. Returns within 30 days [S2][S9].", kb);
  assert.equal(clean, "We ship to Pune in 3-5 days. Returns within 30 days.");
  assert.deepEqual(cited.map((c) => c.id), ["1", "2"]);
});

test("escalation keywords match whole words only, any script", () => {
  assert.equal(matchesKeyword("I want a HUMAN please", ["human"]), true);
  assert.equal(matchesKeyword("humane society", ["human"]), false);
  assert.equal(matchesKeyword("मुझे एजेंट चाहिए", ["एजेंट"]), true);
  assert.equal(matchesKeyword("anything", ["", "  "]), false);
});

test("history becomes alternating model turns starting with the user", () => {
  const c = toContents([
    { role: "bot", text: "Hi" },
    { role: "buyer", text: "a" },
    { role: "buyer", text: "b" },
    { role: "agent", text: "c" },
  ]);
  assert.deepEqual(c, [
    { role: "user", parts: [{ text: "a" }, { text: "b" }] },
    { role: "model", parts: [{ text: "(human agent) c" }] },
  ]);
});
