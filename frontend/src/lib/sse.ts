import { getFirebaseToken } from "./firebase";

const API_URL = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentGroupId: string | null = null;

type SSECallbacks = {
  onUpdate: (data: any) => void;
  onDelete?: (groupId: string) => void;
};

let callbacks: SSECallbacks | null = null;

function cleanup(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

async function connect(): Promise<void> {
  if (!currentGroupId) return;

  cleanup();

  try {
    const token = await getFirebaseToken();
    if (!token) {
      reconnectTimer = setTimeout(connect, 2000);
      return;
    }

    const url = new URL(`${API_URL}/api/groups/${currentGroupId}/sse`);
    url.searchParams.set("token", token);

    eventSource = new EventSource(url.toString());

    eventSource.addEventListener("connected", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        callbacks?.onUpdate(data);
      } catch {}
    });

    eventSource.addEventListener("group_updated", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        callbacks?.onUpdate(data);
      } catch {}
    });

    eventSource.addEventListener("group_deleted", () => {
      cleanup();
      callbacks?.onDelete?.(currentGroupId!);
      currentGroupId = null;
    });

    eventSource.onerror = () => {
      cleanup();
      reconnectTimer = setTimeout(connect, 2000);
    };
  } catch {
    reconnectTimer = setTimeout(connect, 2000);
  }
}

export function connectGroupSSE(groupId: string, cb: SSECallbacks): void {
  currentGroupId = groupId;
  callbacks = cb;
  connect();
}

export function disconnectGroupSSE(): void {
  currentGroupId = null;
  callbacks = null;
  cleanup();
}
