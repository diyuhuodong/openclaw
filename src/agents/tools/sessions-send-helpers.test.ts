import { beforeEach, describe, expect, it } from "vitest";
import { setActivePluginRegistry } from "../../plugins/runtime.js";
import { createTestRegistry } from "../../test-utils/channel-plugins.js";
import {
  resolveAnnounceTargetFromKey,
  resolveSessionsSendMode,
  resolveSyncTimeoutSeconds,
  resolveSessionsSendQueueSettings,
} from "./sessions-send-helpers.js";

describe("resolveAnnounceTargetFromKey", () => {
  beforeEach(() => {
    setActivePluginRegistry(
      createTestRegistry([
        {
          pluginId: "discord",
          source: "test",
          plugin: {
            id: "discord",
            meta: {
              id: "discord",
              label: "Discord",
              selectionLabel: "Discord",
              docsPath: "/channels/discord",
              blurb: "Discord test stub.",
            },
            capabilities: { chatTypes: ["direct", "channel", "thread"] },
            messaging: {
              resolveSessionTarget: ({ id }: { id: string }) => `channel:${id}`,
            },
            config: {
              listAccountIds: () => ["default"],
              resolveAccount: () => ({}),
            },
          },
        },
        {
          pluginId: "slack",
          source: "test",
          plugin: {
            id: "slack",
            meta: {
              id: "slack",
              label: "Slack",
              selectionLabel: "Slack",
              docsPath: "/channels/slack",
              blurb: "Slack test stub.",
            },
            capabilities: { chatTypes: ["direct", "channel", "thread"] },
            messaging: {
              resolveSessionTarget: ({ id }: { id: string }) => `channel:${id}`,
            },
            config: {
              listAccountIds: () => ["default"],
              resolveAccount: () => ({}),
            },
          },
        },
        {
          pluginId: "telegram",
          source: "test",
          plugin: {
            id: "telegram",
            meta: {
              id: "telegram",
              label: "Telegram",
              selectionLabel: "Telegram",
              docsPath: "/channels/telegram",
              blurb: "Telegram test stub.",
            },
            capabilities: { chatTypes: ["direct", "group", "thread"] },
            messaging: {
              normalizeTarget: (raw: string) => raw.replace(/^group:/, ""),
            },
            config: {
              listAccountIds: () => ["default"],
              resolveAccount: () => ({}),
            },
          },
        },
      ]),
    );
  });

  it("lets plugins own session-derived target shapes", () => {
    expect(resolveAnnounceTargetFromKey("agent:main:discord:group:dev")).toEqual({
      channel: "discord",
      to: "channel:dev",
      threadId: undefined,
    });
    expect(resolveAnnounceTargetFromKey("agent:main:slack:group:C123")).toEqual({
      channel: "slack",
      to: "channel:C123",
      threadId: undefined,
    });
  });

  it("keeps generic topic extraction and plugin normalization for other channels", () => {
    expect(resolveAnnounceTargetFromKey("agent:main:telegram:group:-100123:topic:99")).toEqual({
      channel: "telegram",
      to: "-100123",
      threadId: "99",
    });
  });
});

describe("resolveSessionsSendMode", () => {
  it("returns sync when explicitly set", () => {
    expect(resolveSessionsSendMode({ tools: { sessionsSend: { mode: "sync" } } } as unknown)).toBe(
      "sync",
    );
    expect(resolveSessionsSendMode({ tools: { sessionsSend: { mode: "async" } } } as unknown)).toBe(
      "async",
    );
    expect(resolveSessionsSendMode({ tools: { sessionsSend: { mode: "auto" } } } as unknown)).toBe(
      "auto",
    );
  });

  it("returns auto as default", () => {
    expect(resolveSessionsSendMode(undefined)).toBe("auto");
    expect(resolveSessionsSendMode({} as unknown)).toBe("auto");
    expect(resolveSessionsSendMode({ tools: {} } as unknown)).toBe("auto");
    expect(resolveSessionsSendMode({ tools: { sessionsSend: {} } } as unknown)).toBe("auto");
    expect(
      resolveSessionsSendMode({ tools: { sessionsSend: { mode: "invalid" } } } as unknown),
    ).toBe("auto");
  });
});

describe("resolveSyncTimeoutSeconds", () => {
  it("returns configured value when set", () => {
    expect(
      resolveSyncTimeoutSeconds({ tools: { sessionsSend: { syncTimeoutSeconds: 60 } } } as unknown),
    ).toBe(60);
    expect(
      resolveSyncTimeoutSeconds({ tools: { sessionsSend: { syncTimeoutSeconds: 0 } } } as unknown),
    ).toBe(0);
    expect(
      resolveSyncTimeoutSeconds({
        tools: { sessionsSend: { syncTimeoutSeconds: 120 } },
      } as unknown),
    ).toBe(120);
  });

  it("returns default 30 when not configured", () => {
    expect(resolveSyncTimeoutSeconds(undefined)).toBe(30);
    expect(resolveSyncTimeoutSeconds({} as unknown)).toBe(30);
    expect(resolveSyncTimeoutSeconds({ tools: {} } as unknown)).toBe(30);
  });

  it("handles invalid values gracefully", () => {
    expect(
      resolveSyncTimeoutSeconds({ tools: { sessionsSend: { syncTimeoutSeconds: -5 } } } as unknown),
    ).toBe(0);
    expect(resolveSyncTimeoutSeconds({ tools: { syncTimeoutSeconds: 60 } } as unknown)).toBe(30);
  });
});

describe("resolveSessionsSendQueueSettings", () => {
  it("returns undefined when not configured", () => {
    expect(resolveSessionsSendQueueSettings(undefined)).toBeUndefined();
    expect(resolveSessionsSendQueueSettings({} as unknown)).toBeUndefined();
    expect(resolveSessionsSendQueueSettings({ tools: {} } as unknown)).toBeUndefined();
  });

  it("returns queue settings when configured", () => {
    const result = resolveSessionsSendQueueSettings({
      tools: {
        sessionsSend: { queue: { mode: "queue", debounceMs: 500, cap: 5, dropPolicy: "old" } },
      },
    } as unknown);
    expect(result).toEqual({
      mode: "queue",
      debounceMs: 500,
      cap: 5,
      dropPolicy: "old",
    });
  });

  it("applies defaults for missing fields", () => {
    const result = resolveSessionsSendQueueSettings({
      tools: { sessionsSend: { queue: {} } },
    } as unknown);
    expect(result).toEqual({
      mode: "followup",
      debounceMs: 1000,
      cap: 10,
      dropPolicy: undefined,
    });
  });

  it("validates mode values", () => {
    const modes = [
      "steer",
      "followup",
      "collect",
      "steer-backlog",
      "steer+backlog",
      "queue",
      "interrupt",
    ] as const;
    for (const mode of modes) {
      const result = resolveSessionsSendQueueSettings({
        tools: { sessionsSend: { queue: { mode } } },
      } as unknown);
      expect(result?.mode).toBe(mode);
    }

    const invalid = resolveSessionsSendQueueSettings({
      tools: { sessionsSend: { queue: { mode: "invalid" } } },
    } as unknown);
    expect(invalid?.mode).toBe("followup");
  });
});
