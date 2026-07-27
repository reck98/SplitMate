export function generateUpiLink(params: {
  payeeAddress: string;
  amount: number | string;
  transactionNote?: string;
}): string {
  const { payeeAddress, amount } = params;

  return `upi://pay?pa=${payeeAddress}&am=${amount}&cu=INR`;
}

export function validateUpiId(upiId: string): boolean {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return upiRegex.test(upiId);
}
