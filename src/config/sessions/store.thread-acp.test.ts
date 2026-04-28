import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MsgContext } from "../../auto-reply/templating.js";
import {
  clearSessionStoreCacheForTest,
  loadSessionStore,
  recordSessionMetaFromInbound,
  saveSessionStore,
} from "../sessions.js";
import type { SessionEntry } from "./types.js";

function createInboundContext(sessionKey: string): MsgContext {
  return {
    Provider: "telegram",
    Surface: "telegram",
    ChatType: "direct",
    From: "user-1",
    To: "agent:main:main",
    SessionKey: sessionKey,
    OriginatingTo: "agent:main:main",
  };
}

function makeSessionEntry(acp?: SessionEntry["acp"]): SessionEntry {
  return {
    sessionId: crypto.randomUUID(),
    updatedAt: Date.now(),
    origin: { provider: "telegram" },
    acp,
  };
}

describe("recordSessionMetaFromInbound ACP metadata copy", () => {
  let tempDir = "";
  let storePath = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-thread-acp-"));
    storePath = path.join(tempDir, "sessions.json");
    await fs.writeFile(storePath, "{}", "utf-8");
  });

  afterEach(async () => {
    clearSessionStoreCacheForTest();
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("copies acp metadata from base session to thread-bound session", async () => {
    const baseKey = "agent:codex:acp:abc123";
    const threadKey = "agent:codex:acp:abc123:thread:456";

    const store = loadSessionStore(storePath);
    store[baseKey] = makeSessionEntry({
      backend: "acpx",
      agent: "codex",
      runtimeSessionName: "test",
      mode: "persistent",
      state: "idle",
      lastActivityAt: Date.now(),
    });
    await saveSessionStore(storePath, store);

    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: threadKey,
      ctx: createInboundContext(threadKey),
    });

    const result = loadSessionStore(storePath, { skipCache: true });
    expect(result[threadKey]?.acp?.backend).toBe("acpx");
  });

  it("handles simple thread format", async () => {
    const baseKey = "agent:codex:acp:uuid123";
    const threadKey = "agent:codex:acp:uuid123:thread:789";

    const store = loadSessionStore(storePath);
    store[baseKey] = makeSessionEntry({
      backend: "acpx",
      agent: "codex",
      runtimeSessionName: "simple",
      mode: "persistent",
      state: "idle",
      lastActivityAt: Date.now(),
    });
    await saveSessionStore(storePath, store);

    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: threadKey,
      ctx: createInboundContext(threadKey),
    });

    const result = loadSessionStore(storePath, { skipCache: true });
    expect(result[threadKey]?.acp).toBeDefined();
  });

  it("handles Telegram DM format with nested thread ID", async () => {
    const baseKey = "agent:main:main";
    const threadKey = "agent:main:main:thread:1234:42";

    const store = loadSessionStore(storePath);
    store[baseKey] = makeSessionEntry({
      backend: "acpx",
      agent: "main",
      runtimeSessionName: "dm",
      mode: "persistent",
      state: "idle",
      lastActivityAt: Date.now(),
    });
    await saveSessionStore(storePath, store);

    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: threadKey,
      ctx: createInboundContext(threadKey),
    });

    const result = loadSessionStore(storePath, { skipCache: true });
    expect(result[threadKey]?.acp).toBeDefined();
  });

  it("handles base session without acp gracefully", async () => {
    const baseKey = "agent:codex:acp:noAcp";
    const threadKey = "agent:codex:acp:noAcp:thread:777";

    const store = loadSessionStore(storePath);
    store[baseKey] = makeSessionEntry(undefined);
    await saveSessionStore(storePath, store);

    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: threadKey,
      ctx: createInboundContext(threadKey),
    });

    const result = loadSessionStore(storePath, { skipCache: true });
    expect(result[threadKey]?.acp).toBeUndefined();
  });

  it("handles missing base session gracefully", async () => {
    const threadKey = "agent:codex:acp:orphan:thread:999";

    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: threadKey,
      ctx: createInboundContext(threadKey),
    });

    const result = loadSessionStore(storePath, { skipCache: true });
    expect(result[threadKey]?.acp).toBeUndefined();
  });

  it("copies acp metadata for :topic: sessions", async () => {
    const baseKey = "agent:main:main";
    const topicKey = "agent:main:main:topic:100";

    const store = loadSessionStore(storePath);
    store[baseKey] = makeSessionEntry({
      backend: "acpx",
      agent: "main",
      runtimeSessionName: "topic",
      mode: "persistent",
      state: "idle",
      lastActivityAt: Date.now(),
    });
    await saveSessionStore(storePath, store);

    await recordSessionMetaFromInbound({
      storePath,
      sessionKey: topicKey,
      ctx: createInboundContext(topicKey),
    });

    const result = loadSessionStore(storePath, { skipCache: true });
    expect(result[topicKey]?.acp).toBeDefined();
  });
});
