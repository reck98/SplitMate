import { describe, it, expect } from "vitest";
import { calculateEqualShares } from "../utils/split.js";

describe("Equal Split Financial Precision & Remainder Distribution", () => {
  it("splits ₹20 equally between 2 participants to produce exactly ₹10 each", () => {
    const shares = calculateEqualShares(20, ["reck98", "akash"]);
    expect(shares).toEqual([
      { user_id: "reck98", share_amount: 10 },
      { user_id: "akash", share_amount: 10 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.share_amount, 0);
    expect(total).toBe(20);
  });

  it("splits ₹100 equally among 3 participants into ₹33.34, ₹33.33, ₹33.33 summing to exactly ₹100", () => {
    const shares = calculateEqualShares(100, ["user1", "user2", "user3"]);
    expect(shares).toEqual([
      { user_id: "user1", share_amount: 33.34 },
      { user_id: "user2", share_amount: 33.33 },
      { user_id: "user3", share_amount: 33.33 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.share_amount, 0);
    expect(total).toBe(100);
  });

  it("splits ₹10 equally among 3 participants summing to exactly ₹10", () => {
    const shares = calculateEqualShares(10, ["u1", "u2", "u3"]);
    expect(shares).toEqual([
      { user_id: "u1", share_amount: 3.34 },
      { user_id: "u2", share_amount: 3.33 },
      { user_id: "u3", share_amount: 3.33 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.share_amount, 0);
    expect(total).toBe(10);
  });

  it("handles ₹0.01 split among 3 participants without dropping the penny", () => {
    const shares = calculateEqualShares(0.01, ["u1", "u2", "u3"]);
    expect(shares).toEqual([
      { user_id: "u1", share_amount: 0.01 },
      { user_id: "u2", share_amount: 0 },
      { user_id: "u3", share_amount: 0 },
    ]);
    const total = shares.reduce((sum, s) => sum + s.share_amount, 0);
    expect(total).toBe(0.01);
  });

  it("deduplicates participant IDs and handles single participant", () => {
    const shares = calculateEqualShares(50, ["u1", "u1", "u1"]);
    expect(shares).toEqual([{ user_id: "u1", share_amount: 50 }]);
  });
});
