import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    firebase_uid: string;
    email: string;
    name: string;
    avatar: string | null;
    upi_id: string | null;
    is_profile_complete: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface BalanceInfo {
  user_id: string;
  name: string;
  lent: number;
  owed: number;
  net_balance: number;
  paid: number;
  share: number;
  received: number;
  paid_out: number;
}

export interface Obligation {
  id: string;
  expenseId: string;
  expense_id: string;
  expenseTitle: string;
  description: string;
  payerId: string;
  payer_id: string;
  payerName: string;
  payer_name: string;
  debtorId: string;
  debtor_id: string;
  debtorName: string;
  debtor_name: string;
  amount: number;
  originalAmount: number;
  original_amount: number;
  createdAt: string;
  created_at: string;
  from: {
    user_id: string;
    name: string;
  };
  to: {
    user_id: string;
    name: string;
  };
}

export type SimplifiedDebt = Obligation;
export type DetailedDebt = Obligation;

export interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
  avatar: string | null;
  upi_id: string | null;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}
