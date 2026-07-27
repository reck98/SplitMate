export function generateUpiLink(params: {
  payeeAddress: string;
  amount: number | string;
  transactionNote?: string;
}): string {
  const { payeeAddress, amount } = params;

  return `upi://pay?pa=${payeeAddress}&am=${amount}&cu=INR`;
}

export function openUpiApp(upiLink: string): void {
  window.location.href = upiLink;
}
