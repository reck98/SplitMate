import { describe, it, expect } from "vitest";
import { generateInviteCode } from "../utils/invite.js";

describe("generateInviteCode", () => {
  it("generates a 6-character code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("generates codes with only allowed characters", () => {
    const allowedChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(allowedChars);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateInviteCode());
    }
    // With 32^6 = 1B+ combinations, 1000 codes should all be unique
    expect(codes.size).toBe(1000);
  });

  it("excludes ambiguous characters (0, O, I, 1)", () => {
    const forbidden = /[0OIl1]/;
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).not.toMatch(forbidden);
    }
  });
});
