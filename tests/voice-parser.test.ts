import { describe, expect, it } from "vitest";
import { parseVoiceTransaction } from "@/lib/voice-parser";

describe("parseVoiceTransaction", () => {
  it("detects a simple fuel expense", () => {
    const parsed = parseVoiceTransaction("Spent 250 on petrol", new Date("2026-07-07T10:00:00Z"));
    expect(parsed).toMatchObject({
      amount: 250,
      type: "EXPENSE",
      category: "Fuel",
      date: "2026-07-07"
    });
  });

  it("detects salary as income", () => {
    const parsed = parseVoiceTransaction("Salary received 45000");
    expect(parsed?.amount).toBe(45000);
    expect(parsed?.type).toBe("INCOME");
    expect(parsed?.category).toBe("Salary");
  });

  it("returns null when no amount is present", () => {
    expect(parseVoiceTransaction("show today's expenses")).toBeNull();
  });
});
