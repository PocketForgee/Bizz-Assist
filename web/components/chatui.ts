"use client";

// Nexconn ChatUI (desktop agent inbox). Init order per docs.nexconn.ai/chatui-web/quickstart:
// NCEngine.initialize -> NCChatUIApplication.initialize({hooks}) -> app.ready() -> NCEngine.connect({token}) -> mount -> openChannel.
// Decision (nexconn-chat skill, Layer 1: ChatUI native): group channels are covered by ChatUI on Web; the agent inbox is desktop.
import type { NCChatUIApplication, ServiceHooks } from "@nexconn/chatui";
import { api } from "@/lib/client";

type Session = { appKey: string; areaCode: number; token: string; userId: string; name: string };
type Profiles = {
  users: { userId: string; name: string; avatarUrl?: string }[];
  groups: { groupId: string; name: string; memberCount: number }[];
  members: { userId: string; nickname?: string }[];
};

let starting: Promise<NCChatUIApplication> | null = null;

const fallbackUser = (id: string) => ({ userId: id, name: id.startsWith("g") ? "Customer" : id.startsWith("b") ? "Assistant" : "Agent" });

async function profiles(body: Record<string, unknown>): Promise<Profiles> {
  const res = await api<Profiles>("/api/agent/profiles", { body });
  return res.ok ? res.data : { users: [], groups: [], members: [] };
}

const hooks: ServiceHooks = {
  async reqUserProfiles(userIds) {
    const { users } = await profiles({ userIds });
    return userIds.map((id) => users.find((u) => u.userId === id) ?? fallbackUser(id));
  },
  async reqGroupProfiles(groupIds) {
    const { groups } = await profiles({ groupIds });
    return groupIds.map((id) => groups.find((g) => g.groupId === id) ?? { groupId: id, name: "Customer chat", memberCount: 0 });
  },
  async reqGroupMembers(groupId) {
    return (await profiles({ membersOf: groupId })).members;
  },
  async reqSystemProfiles(systemIds) {
    return systemIds.map((systemId) => ({ systemId, name: "BizzAssist alerts" }));
  },
};

/** Starts (once per page) the engine, ChatUI and the connection. Throws a user-facing Error on failure. */
export function startChatUI(): Promise<NCChatUIApplication> {
  starting ??= (async () => {
    const res = await api<Session>("/api/agent/session");
    if (!res.ok) throw new Error(res.error);
    const s = res.data;
    const nc = await import("@nexconn/chat");
    const { NCChatUIApplication } = await import("@nexconn/chatui");

    nc.NCEngine.initialize({ appKey: s.appKey, areaCode: s.areaCode, logLevel: process.env.NODE_ENV === "production" ? nc.LogLevel.WARN : nc.LogLevel.DEBUG });
    const app = NCChatUIApplication.initialize({ hooks, language: "en_US" });
    if (!app) throw new Error("Chat UI failed to start.");
    app.ready();
    const conn = await nc.NCEngine.connect({ token: s.token });
    if (!conn.isOk) throw new Error(`Couldn't connect to chat (code ${conn.code}).`);
    return app;
  })().catch((err) => {
    starting = null; // allow a retry
    throw err;
  });
  return starting;
}

export async function openGroup(app: NCChatUIApplication, groupId: string) {
  const { GroupChannelIdentifier } = await import("@nexconn/chat");
  await app.openChannel(new GroupChannelIdentifier(groupId), true);
}
