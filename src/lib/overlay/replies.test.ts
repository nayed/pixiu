import { describe, expect, it } from "vitest";
import { isReplyEnd } from "./replies";

const API = "https://claude.ai/api/organizations/abc/chat_conversations/def";
const entry = (name: string, duration: number, initiatorType = "fetch") => ({
  name,
  duration,
  initiatorType,
});

describe("isReplyEnd", () => {
  it("knows the reply address Claude has used", () => {
    expect(isReplyEnd(entry(`${API}/completion`, 300))).toBe(true);
    expect(isReplyEnd(entry(`${API}/retry_completion?x=1`, 300))).toBe(true);
  });

  it("takes any long request to Claude's API for a streamed reply, whatever its name", () => {
    expect(isReplyEnd(entry(`${API}/stream`, 8_000))).toBe(true);
  });

  it("ignores quick API requests", () => {
    expect(isReplyEnd(entry(`${API}/messages`, 150))).toBe(false);
  });

  it("ignores the usage address, pages, scripts, and other sites", () => {
    expect(isReplyEnd(entry("https://claude.ai/api/organizations/abc/usage", 5_000))).toBe(false);
    expect(isReplyEnd(entry("https://claude.ai/chat/def", 5_000, "navigation"))).toBe(false);
    expect(isReplyEnd(entry("https://claude.ai/api/big.js", 5_000, "script"))).toBe(false);
    expect(isReplyEnd(entry("https://example.com/api/completion", 5_000))).toBe(false);
    expect(isReplyEnd(entry("not a url", 5_000))).toBe(false);
  });
});
