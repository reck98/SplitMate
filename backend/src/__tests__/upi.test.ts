import { describe, it, expect } from "vitest";
import { generateUpiLink, validateUpiId } from "../services/upi.js";

describe("generateUpiLink", () => {
  it("generates a valid UPI deep link", () => {
    const link = generateUpiLink({
      payeeAddress: "aanidadas@okicici",
      amount: 10,
    });

    expect(link).toBe("upi://pay?pa=aanidadas@okicici&am=10&cu=INR");
  });

  it("does not include payee name or transaction note", () => {
    const link = generateUpiLink({
      payeeAddress: "rahul@okaxis",
      amount: 250,
      transactionNote: "Dinner payment",
    });

    expect(link).not.toContain("pn=");
    expect(link).not.toContain("tn=");
    expect(link).toBe("upi://pay?pa=rahul@okaxis&am=250&cu=INR");
  });

  it("formats amount correctly", () => {
    const link = generateUpiLink({
      payeeAddress: "test@upi",
      amount: 99.5,
    });

    expect(link).toBe("upi://pay?pa=test@upi&am=99.5&cu=INR");
  });

  it("handles zero amount", () => {
    const link = generateUpiLink({
      payeeAddress: "test@upi",
      amount: 0,
    });

    expect(link).toBe("upi://pay?pa=test@upi&am=0&cu=INR");
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
