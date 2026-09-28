type SSEController = ReadableStreamDefaultController;

export interface SSESubscriber {
  userId: string;
  role: string;
  controller: SSEController;
}

// In-memory set of active SSE subscribers
const subscribers = new Set<SSESubscriber>();

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
