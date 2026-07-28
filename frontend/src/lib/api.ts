import { getFirebaseToken } from "./firebase";

const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

interface ApiOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(
  endpoint: string,
  options: ApiOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body } = options;

  let token = await getFirebaseToken(isRetry);

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

  if (response.status === 401 && !isRetry) {
    return request<T>(endpoint, options, true);
  }

  const data = await response.json().catch(() => ({
    success: false,
    error: {
      code: "HTTP_ERROR",
      message: `HTTP ${response.status} server error`,
    },
  }));

  if (!data.success) {
    let message = data.error?.message;
    if (response.status === 401) {
      message = "Session expired. Please login again.";
    } else if (response.status === 403) {
      message = message || "You do not have permission to perform this action.";
    } else if (response.status === 404) {
      message = message || "The requested resource was not found.";
    } else if (!message || message === "An unexpected error occurred.") {
      message = "Failed to complete request. Please try again.";
    }

    const error = new Error(message);
    (error as any).code = data.error?.code || `HTTP_${response.status}`;
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
    updateProfile: (data: { name?: string; upi_id?: string } | string) => {
      const body = typeof data === "string" ? { upi_id: data } : data;
      return request<{
        id: string;
        firebase_uid: string;
        email: string;
        name: string;
        avatar: string | null;
        upi_id: string | null;
        is_profile_complete: boolean;
      }>("/me", { method: "PATCH", body });
    },
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
        obligations: any[];
        simplified_debts: any[];
      }>(`/groups/${id}`),
    create: (name: string) =>
      request("/groups", { method: "POST", body: { name } }),
    delete: (id: string) => request(`/groups/${id}`, { method: "DELETE" }),
    join: (invite_code: string) =>
      request("/groups/join", { method: "POST", body: { invite_code } }),
    leave: (id: string) => request(`/groups/${id}/leave`, { method: "POST" }),
  },

  expenses: {
    create: (
      groupId: string,
      data: {
        description: string;
        amount: number;
        split_type: "equal" | "custom";
        participants: string[] | { user_id: string; share_amount: number }[];
      },
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
      },
    ) =>
      request(`/expenses/${id}`, {
        method: "PATCH",
        body: data,
      }),
    delete: (id: string) => request(`/expenses/${id}`, { method: "DELETE" }),
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
      data: { payer_id: string; receiver_id: string; amount: number; expense_id?: string },
    ) =>
      request(`/groups/${groupId}/settlements`, {
        method: "POST",
        body: data,
      }),
  },
};
