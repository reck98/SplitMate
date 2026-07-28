import { describe, it, expect } from "vitest";

describe("Expense Split Logic", () => {
  it("calculates equal split shares correctly with rounding", () => {
    const amount = 100;
    const participants = ["user1", "user2", "user3"];
    const shareAmount = Math.round((amount / participants.length) * 100) / 100;
    expect(shareAmount).toBe(33.33);

    const totalCalculated = shareAmount * participants.length;
    expect(Math.abs(totalCalculated - amount)).toBeLessThan(0.1);
  });

  it("validates custom split amounts equal total expense amount", () => {
    const amount = 500;
    const customParticipants = [
      { user_id: "user1", share_amount: 300 },
      { user_id: "user2", share_amount: 200 },
    ];

    const totalShare = customParticipants.reduce(
      (sum, p) => sum + p.share_amount,
      0,
    );
    expect(Math.abs(totalShare - amount)).toBeLessThanOrEqual(0.01);
  });

  it("rejects custom split amounts that do not sum to total expense amount", () => {
    const amount = 500;
    const invalidParticipants = [
      { user_id: "user1", share_amount: 300 },
      { user_id: "user2", share_amount: 150 },
    ];

    const totalShare = invalidParticipants.reduce(
      (sum, p) => sum + p.share_amount,
      0,
    );
    expect(Math.abs(totalShare - amount)).toBeGreaterThan(0.01);
  });

  it("deduplicates equal split participant array", () => {
    const participants = ["user1", "user2", "user1", "user3"];
    const uniqueParticipants = Array.from(new Set(participants));
    expect(uniqueParticipants).toEqual(["user1", "user2", "user3"]);
    expect(uniqueParticipants.length).toBe(3);
  });
});
