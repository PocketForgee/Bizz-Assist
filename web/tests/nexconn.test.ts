import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { signature, signedHeaders, verifyWebhook } from "../lib/nexconn";

const cfg = { appKey: "testkey", appSecret: "testsecret" };

test("signature is sha1(secret + nonce + timestamp) in hex", () => {
  const expected = createHash("sha1").update("testsecret" + "abc" + "1700000000000").digest("hex");
  assert.equal(signature("testsecret", "abc", "1700000000000"), expected);
});

test("signedHeaders carries the documented headers and a valid signature", () => {
  const h = signedHeaders(cfg, 1700000000000);
  assert.equal(h["App-Key"], "testkey");
  assert.equal(h.Timestamp, "1700000000000");
  assert.ok(h.Nonce.length > 0 && h.Nonce.length <= 18);
  assert.equal(h.Signature, signature("testsecret", h.Nonce, h.Timestamp));
});

function webhookHeaders(over: Record<string, string> = {}, now = 1700000000000) {
  const nonce = "n123";
  const ts = String(now);
  return new Headers({ AppKey: "testkey", Nonce: nonce, Timestamp: ts, Signature: signature("testsecret", nonce, ts), ...over });
}

test("verifyWebhook accepts a correctly signed request", () => {
  assert.equal(verifyWebhook(webhookHeaders(), cfg, 1700000000000 + 1000), true);
});

test("verifyWebhook rejects a bad signature, wrong app key, missing header and stale timestamp", () => {
  const now = 1700000000000;
  assert.equal(verifyWebhook(webhookHeaders({ Signature: "0".repeat(40) }), cfg, now), false);
  assert.equal(verifyWebhook(webhookHeaders({ AppKey: "other" }), cfg, now), false);
  const h = webhookHeaders();
  h.delete("Nonce");
  assert.equal(verifyWebhook(h, cfg, now), false);
  assert.equal(verifyWebhook(webhookHeaders(), cfg, now + 11 * 60 * 1000), false);
});

test("verifyWebhook rejects everything when no secret is configured", () => {
  assert.equal(verifyWebhook(webhookHeaders(), { appKey: "testkey", appSecret: "" }, 1700000000000), false);
});
