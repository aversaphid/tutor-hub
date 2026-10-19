type SSEController = ReadableStreamDefaultController;

export interface SSESubscriber {
  userId: string;
  role: string;
  controller: SSEController;
}

export interface CalculatorActionPayload {
  sessionId?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  actionType:
    | "BUTTON"
    | "NAV"
    | "SYNC_TOGGLE"
    | "FULL_STATE"
    | "CURSOR_MOVE"
    | "CURSOR_CLICK"
    | "CURSOR_LEAVE";
  actionValue?: string;
  fullState?: any;
  cursorPos?: { x: number; y: number };
  isSynced?: boolean;
  timestamp?: number;
  targetUserIds?: string[];
}

export interface SessionUpdatePayload {
  type: string;
  sessionId?: string;
  status?: string;
  timestamp?: number;
}

export interface PresenceUpdatePayload {
  userId: string;
  online: boolean;
  timestamp?: number;
}

interface GlobalWithSSE {
  __sseSubscribers?: Set<SSESubscriber>;
  __sseChannel?: any;
}

const globalStore = globalThis as unknown as GlobalWithSSE;
if (!globalStore.__sseSubscribers) {
  globalStore.__sseSubscribers = new Set<SSESubscriber>();
}

// In-memory set of active SSE subscribers connected to this specific isolate
const subscribers = globalStore.__sseSubscribers;

// Unique identifier for this isolate to prevent self-echo loops on the channel
const ISOLATE_ID =
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const BROADCAST_CHANNEL_NAME = "th_edge_sse_bus";

function getBroadcastChannel(): any | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!globalStore.__sseChannel) {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        handleRemoteBroadcast(event.data);
      };
      globalStore.__sseChannel = channel;
    } catch {
      return null;
    }
  }
  return globalStore.__sseChannel;
}

// Automatically subscribe this isolate to the global edge broadcast bus on startup
if (typeof BroadcastChannel !== "undefined") {
  getBroadcastChannel();
}

function handleRemoteBroadcast(msg: any) {
  if (!msg || typeof msg !== "object") return;
  // Ignore messages originated by this same isolate to prevent duplicates
  if (msg.originIsolate === ISOLATE_ID) return;

  switch (msg.type) {
    case "calculator-sync":
      deliverLocalCalculatorAction(msg.payload);
      break;
    case "session-update":
      deliverLocalSessionUpdate(msg.payload);
      break;
    case "presence-update":
      deliverLocalPresenceUpdate(msg.payload);
      break;
  }
}

function deliverLocalSessionUpdate(payload: SessionUpdatePayload) {
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

function deliverLocalPresenceUpdate(payload: PresenceUpdatePayload) {
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

function deliverLocalCalculatorAction(payload: CalculatorActionPayload) {
  if (subscribers.size === 0) return;

  const encoder = new TextEncoder();
  const eventData = JSON.stringify({
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  });
  const eventMessage = `event: calculator-sync\ndata: ${eventData}\n\n`;
  const bytes = encoder.encode(eventMessage);

  for (const sub of subscribers) {
    if (payload.targetUserIds && !payload.targetUserIds.includes(sub.userId)) {
      continue;
    }
    try {
      sub.controller.enqueue(bytes);
    } catch {
      subscribers.delete(sub);
    }
  }
}

export function registerSubscriber(subscriber: SSESubscriber): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function broadcastSessionUpdate(payload: SessionUpdatePayload) {
  // 1. Deliver to subscribers connected to this isolate
  deliverLocalSessionUpdate(payload);

  // 2. Broadcast across Deno Deploy edge isolates globally
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({
        originIsolate: ISOLATE_ID,
        type: "session-update",
        payload,
      });
    }
  } catch (err) {
    console.error("[SSE Bus] Failed to broadcast session update across isolates:", err);
  }
}

export function broadcastPresenceUpdate(payload: PresenceUpdatePayload) {
  // 1. Deliver to subscribers connected to this isolate
  deliverLocalPresenceUpdate(payload);

  // 2. Broadcast across Deno Deploy edge isolates globally
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({
        originIsolate: ISOLATE_ID,
        type: "presence-update",
        payload,
      });
    }
  } catch (err) {
    console.error("[SSE Bus] Failed to broadcast presence update across isolates:", err);
  }
}

export function broadcastCalculatorAction(payload: CalculatorActionPayload) {
  // 1. Deliver to subscribers connected to this isolate
  deliverLocalCalculatorAction(payload);

  // 2. Broadcast across Deno Deploy edge isolates globally
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({
        originIsolate: ISOLATE_ID,
        type: "calculator-sync",
        payload,
      });
    }
  } catch (err) {
    console.error("[SSE Bus] Failed to broadcast calculator action across isolates:", err);
  }
}
