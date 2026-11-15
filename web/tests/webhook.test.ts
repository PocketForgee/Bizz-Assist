import { test } from "node:test";
import assert from "node:assert/strict";
import { Deduper, parseMessageSend } from "../lib/webhook";

const item = (over: Record<string, unknown> = {}) => ({
  userId: "gAbCdEfGhIjKlMnOpQrSt",
  channelId: "c0123456789abcdef0123456789abcdef",
  messageType: "RC:TxtMsg",
  content: JSON.stringify({ content: " Where is my order? " }),
  channelType: 3,
  time: 1700000000000,
  messageId: "MSG-1",
  os: "Websocket",
  ...over,
});

test("parses a buyer text message into our group", () => {
  const out = parseMessageSend({ type: "message:send", id: "e1", time: 1, data: [item()] });
  assert.deepEqual(out, [
    { messageId: "MSG-1", fromUserId: "gAbCdEfGhIjKlMnOpQrSt", groupId: "c0123456789abcdef0123456789abcdef", text: "Where is my order?", time: 1700000000000 },
  ]);
});

test("skips server sends, non-text, non-group, foreign channels, empty and malformed content", () => {
  const data = [
    item({ os: "Server", messageId: "a" }),
    item({ messageType: "RC:ImgMsg", messageId: "b" }),
    item({ channelType: 1, messageId: "c" }),
    item({ channelId: "other-channel", messageId: "d" }),
    item({ content: JSON.stringify({ content: "   " }), messageId: "e" }),
    item({ content: "{not json", messageId: "f" }),
    item({ messageId: undefined }),
  ];
  assert.deepEqual(parseMessageSend({ type: "message:send", data }), []);
});

test("ignores other event types and junk bodies", () => {
  assert.deepEqual(parseMessageSend({ type: "user:online", data: [item()] }), []);
  assert.deepEqual(parseMessageSend(null), []);
  assert.deepEqual(parseMessageSend("x"), []);
  assert.deepEqual(parseMessageSend({ type: "message:send", data: "nope" }), []);
});

test("caps very long text at 4000 chars", () => {
  const [m] = parseMessageSend({ type: "message:send", data: [item({ content: JSON.stringify({ content: "x".repeat(5000) }) })] });
  assert.equal(m.text.length, 4000);
});

test("Deduper drops repeats inside the TTL and allows them after", () => {
  const d = new Deduper(1000, 100);
  assert.equal(d.firstSeen("m1", 0), true);
  assert.equal(d.firstSeen("m1", 500), false);
  assert.equal(d.firstSeen("m1", 1500), true);
});

test("Deduper stays bounded", () => {
  const d = new Deduper(60_000, 10);
  for (let i = 0; i < 50; i++) d.firstSeen(`m${i}`, i);
  assert.equal(d.firstSeen("m49", 100), false);
  assert.ok((d as unknown as { seen: Map<string, number> }).seen.size <= 11);
});
