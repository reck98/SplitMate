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
  net_balance: number;
  paid: number;
  share: number;
  received: number;
  paid_out: number;
}

export interface SimplifiedDebt {
  from: {
    user_id: string;
    name: string;
  };
  to: {
    user_id: string;
    name: string;
  };
  amount: number;
}

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
