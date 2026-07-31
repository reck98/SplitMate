export interface UpiParams {
  payeeAddress: string;
  payeeName?: string;
  amount: number | string;
  currency?: string;
  transactionNote?: string;
}

export function generateUpiUri(params: UpiParams): string {
  const {
    payeeAddress,
    payeeName,
    amount,
    currency = "INR",
    transactionNote = "SplitMate Settlement",
  } = params;

  const queryParts: string[] = [
    `pa=${encodeURIComponent(payeeAddress)}`,
  ];

  if (payeeName && payeeName.trim().length > 0) {
    queryParts.push(`pn=${encodeURIComponent(payeeName.trim())}`);
  }

  const numericAmount = typeof amount === "number" ? amount : parseFloat(amount);
  const formattedAmount = isNaN(numericAmount) ? "0" : numericAmount.toString();
  queryParts.push(`am=${encodeURIComponent(formattedAmount)}`);
  queryParts.push(`cu=${encodeURIComponent(currency)}`);

  if (transactionNote && transactionNote.trim().length > 0) {
    queryParts.push(`tn=${encodeURIComponent(transactionNote.trim())}`);
  }

  return `upi://pay?${queryParts.join("&")}`;
}

export const generateUpiLink = generateUpiUri;

