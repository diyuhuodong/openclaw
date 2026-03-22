import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const callGatewayMock = vi.fn();
  return {
    callGatewayMock,
  };
});

vi.mock("../../gateway/call.js", () => ({
  callGateway: (...args: unknown[]) => hoisted.callGatewayMock(...args),
}));

vi.mock("../subagent-announce-queue.js", () => ({
  enqueueAnnounce: vi.fn().mockReturnValue(true),
}));

vi.mock("../pi-embedded.js", () => ({
  isEmbeddedPiRunActive: vi.fn().mockReturnValue(false),
}));

const { createSessionsSendTool } = await import("./sessions-send-tool.js");

describe("sessions_send tool mode parameter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses sync mode from parameters", async () => {
    hoisted.callGatewayMock.mockResolvedValueOnce({ key: "agent:rd:main" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ runId: "run-123" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ status: "ok" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ messages: [] });

    const tool = createSessionsSendTool({
      agentSessionKey: "agent:pm:main",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-1", {
      label: "rd",
      message: "Hello",
      mode: "sync",
    });

    expect(result.details).toHaveProperty("status");
  });

  it("parses async mode from parameters", async () => {
    hoisted.callGatewayMock.mockResolvedValueOnce({ key: "agent:rd:main" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ runId: "run-123" });

    const tool = createSessionsSendTool({
      agentSessionKey: "agent:pm:main",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-1", {
      label: "rd",
      message: "Hello",
      mode: "async",
    });

    expect(result.details).toHaveProperty("status");
  });

  it("parses auto mode from parameters", async () => {
    hoisted.callGatewayMock.mockResolvedValueOnce({ key: "agent:rd:main" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ runId: "run-123" });

    const tool = createSessionsSendTool({
      agentSessionKey: "agent:pm:main",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-1", {
      label: "rd",
      message: "Hello",
      mode: "auto",
    });

    expect(result.details).toHaveProperty("status");
  });

  it("accepts timeoutSeconds parameter", async () => {
    hoisted.callGatewayMock.mockResolvedValueOnce({ key: "agent:rd:main" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ runId: "run-123" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ status: "ok" });
    hoisted.callGatewayMock.mockResolvedValueOnce({ messages: [] });

    const tool = createSessionsSendTool({
      agentSessionKey: "agent:pm:main",
      agentChannel: "discord",
    });

    const result = await tool.execute("call-1", {
      label: "rd",
      message: "Hello",
      timeoutSeconds: 60,
    });

    expect(result.details).toHaveProperty("status");
  });
});
