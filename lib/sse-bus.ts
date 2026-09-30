type SSEController = ReadableStreamDefaultController;

export interface SSESubscriber {
  userId: string;
  role: string;
  controller: SSEController;
}

interface GlobalWithSSE {
  __sseSubscribers?: Set<SSESubscriber>;
}

const globalStore = globalThis as unknown as GlobalWithSSE;
if (!globalStore.__sseSubscribers) {
  globalStore.__sseSubscribers = new Set<SSESubscriber>();
}

// In-memory set of active SSE subscribers
const subscribers = globalStore.__sseSubscribers;

export function registerSubscriber(subscriber: SSESubscriber): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function broadcastSessionUpdate(payload: {
  type: string;
  sessionId?: string;
  status?: string;
  timestamp?: number;
}) {
  if (subscribers.size === 0) return;

  const encoder = new TextEncoder();
  const eventData = JSON.stringify({
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  });
  const eventMessage = `event: session-update\ndata: ${eventData}\n\n`;
  const bytes = encoder.encode(eventMessage);

  for (const sub of subscribers) {
    try {
      sub.controller.enqueue(bytes);
    } catch {
      subscribers.delete(sub);
    }
  }
}

export function broadcastPresenceUpdate(payload: {
  userId: string;
  online: boolean;
  timestamp?: number;
}) {
  if (subscribers.size === 0) return;

  const encoder = new TextEncoder();
  const eventData = JSON.stringify({
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  });
  const eventMessage = `event: presence-update\ndata: ${eventData}\n\n`;
  const bytes = encoder.encode(eventMessage);

  for (const sub of subscribers) {
    try {
      sub.controller.enqueue(bytes);
    } catch {
      subscribers.delete(sub);
    }
  }
}
