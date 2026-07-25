import { type Response } from "express";

interface SSEClient {
  userId: string;
  res: Response;
}

const groupConnections = new Map<string, Map<string, SSEClient>>();
const keepAliveTimers = new Map<string, ReturnType<typeof setInterval>>();

function sendEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function subscribe(groupId: string, userId: string, res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let group = groupConnections.get(groupId);
  if (!group) {
    group = new Map();
    groupConnections.set(groupId, group);
  }

  group.set(userId, { userId, res });

  const keepAliveId = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 30000);
  keepAliveTimers.set(`${groupId}:${userId}`, keepAliveId);

  res.on("close", () => {
    unsubscribe(groupId, userId);
  });
}

export function unsubscribe(groupId: string, userId: string): void {
  const group = groupConnections.get(groupId);
  if (!group) return;

  group.delete(userId);

  const timerId = keepAliveTimers.get(`${groupId}:${userId}`);
  if (timerId) {
    clearInterval(timerId);
    keepAliveTimers.delete(`${groupId}:${userId}`);
  }

  if (group.size === 0) {
    groupConnections.delete(groupId);
  }
}

export function broadcast(groupId: string, event: string, data: unknown): void {
  const group = groupConnections.get(groupId);
  if (!group) return;

  for (const [, client] of group) {
    try {
      sendEvent(client.res, event, data);
    } catch {
      unsubscribe(groupId, client.userId);
    }
  }
}

export function getConnectionCount(): number {
  let count = 0;
  for (const [, group] of groupConnections) {
    count += group.size;
  }
  return count;
}
