import { describe, it, expect } from "vitest";
import { generateUpiLink, validateUpiId } from "../services/upi.js";

describe("generateUpiLink", () => {
  it("generates a valid UPI deep link", () => {
    const link = generateUpiLink({
      payeeAddress: "rahul@okaxis",
      amount: 250,
    });

    expect(link).toContain("upi://pay");
    expect(link).toContain("pa=rahul%40okaxis");
    expect(link).toContain("am=250.00");
    expect(link).toContain("tn=SplitMate+Settlement");
    expect(link).toContain("cu=INR");
  });

  it("does not include payee name", () => {
    const link = generateUpiLink({
      payeeAddress: "rahul@okaxis",
      amount: 250,
    });

    expect(link).not.toContain("pn=");
  });

  it("includes custom transaction note", () => {
    const link = generateUpiLink({
      payeeAddress: "test@paytm",
      amount: 100,
      transactionNote: "Dinner payment",
    });

    expect(link).toContain("tn=Dinner+payment");
  });

  it("formats amount correctly", () => {
    const link = generateUpiLink({
      payeeAddress: "test@upi",
      amount: 99.5,
    });

    expect(link).toContain("am=99.50");
  });

  it("handles zero amount", () => {
    const link = generateUpiLink({
      payeeAddress: "test@upi",
      amount: 0,
    });

    expect(link).toContain("am=0.00");
  });
});

describe("validateUpiId", () => {
  it("accepts valid UPI IDs", () => {
    expect(validateUpiId("rahul@okaxis")).toBe(true);
    expect(validateUpiId("user@paytm")).toBe(true);
    expect(validateUpiId("name123@ybl")).toBe(true);
    expect(validateUpiId("test.user@upi")).toBe(true);
    expect(validateUpiId("test_user@bank")).toBe(true);
    expect(validateUpiId("a@b")).toBe(true);
  });

  it("rejects invalid UPI IDs", () => {
    expect(validateUpiId("")).toBe(false);
    expect(validateUpiId("noatsign")).toBe(false);
    expect(validateUpiId("@nouser")).toBe(false);
    expect(validateUpiId("spaces @upi")).toBe(false);
    expect(validateUpiId("user@")).toBe(false);
    expect(validateUpiId("user@spec!al")).toBe(false);
  });
});
