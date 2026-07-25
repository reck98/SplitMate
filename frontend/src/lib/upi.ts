export function generateUpiLink(params: {
  payeeAddress: string;
  amount: number;
  transactionNote?: string;
}): string {
  const { payeeAddress, amount, transactionNote = "SplitMate Settlement" } = params;

  const queryParams = new URLSearchParams({
    pa: payeeAddress,
    am: amount.toFixed(2),
    tn: transactionNote,
    cu: "INR",
  });

  return `upi://pay?${queryParams.toString()}`;
}

export function openUpiApp(upiLink: string): void {
  window.location.href = upiLink;
}
