import { getFirebaseToken } from "./firebase";

const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const token = await getFirebaseToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!data.success) {
    const error = new Error(data.error?.message || "An error occurred");
    (error as any).code = data.error?.code;
    (error as any).status = response.status;
    throw error;
  }

  return data.data;
}

export const api = {
  auth: {
    firebase: () =>
      request<{
        id: string;
        firebase_uid: string;
        email: string;
        name: string;
        avatar: string | null;
        upi_id: string | null;
        is_profile_complete: boolean;
      }>("/auth/firebase", { method: "POST" }),
    me: () =>
      request<{
        id: string;
        firebase_uid: string;
        email: string;
        name: string;
        avatar: string | null;
        upi_id: string | null;
        is_profile_complete: boolean;
      }>("/me"),
    updateProfile: (upi_id: string) =>
      request("/me", { method: "PATCH", body: { upi_id } }),
  },

  groups: {
    list: () =>
      request<
        Array<{
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          member_count: number;
        }>
      >("/groups"),
    get: (id: string) =>
      request<{
        group: any;
        members: any[];
        expenses: any[];
        balances: any[];
        settlements: any[];
        simplified_debts: any[];
      }>(`/groups/${id}`),
    create: (name: string) =>
      request("/groups", { method: "POST", body: { name } }),
    delete: (id: string) =>
      request(`/groups/${id}`, { method: "DELETE" }),
    join: (invite_code: string) =>
      request("/groups/join", { method: "POST", body: { invite_code } }),
    leave: (id: string) =>
      request(`/groups/${id}/leave`, { method: "POST" }),
  },

  expenses: {
    create: (
      groupId: string,
      data: {
        description: string;
        amount: number;
        split_type: "equal" | "custom";
        participants: string[] | { user_id: string; share_amount: number }[];
      }
    ) =>
      request(`/groups/${groupId}/expenses`, {
        method: "POST",
        body: data,
      }),
    update: (
      id: string,
      data: {
        description: string;
        amount: number;
        split_type: "equal" | "custom";
        participants: string[] | { user_id: string; share_amount: number }[];
      }
    ) =>
      request(`/expenses/${id}`, {
        method: "PATCH",
        body: data,
      }),
    delete: (id: string) =>
      request(`/expenses/${id}`, { method: "DELETE" }),
  },

  dashboard: {
    get: () =>
      request<{
        user: {
          id: string;
          firebase_uid: string;
          email: string;
          name: string;
          avatar: string | null;
          upi_id: string | null;
          is_profile_complete: boolean;
        };
        groups: Array<{
          id: string;
          name: string;
          owner_id: string;
          invite_code: string;
          member_count: number;
        }>;
      }>("/dashboard"),
  },

  settlements: {
    create: (
      groupId: string,
      data: { payer_id: string; receiver_id: string; amount: number }
    ) =>
      request(`/groups/${groupId}/settlements`, {
        method: "POST",
        body: data,
      }),
  },
};
