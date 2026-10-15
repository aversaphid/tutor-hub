import webpush from "web-push";
import { prisma } from "./prisma";
import { getEnv } from "./env";

const VAPID_PUBLIC_KEY =
  getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY") ||
  "BJdTbAtKYOQu6AlJbtqMd8a7SBtQUqlHu7dyyjtCo7eahepsCWrIIFMTmXDRwNW9AFi3RdNj76bhPUcnPBOL7Fw";

const VAPID_PRIVATE_KEY =
  getEnv("VAPID_PRIVATE_KEY") ||
  "oEtfmVjBxyOY3d5kYhINFwpM-uU3crlWw9mz1oJuFRY";

const VAPID_SUBJECT =
  getEnv("VAPID_SUBJECT") || "mailto:support@lbmathstuition.co.uk";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn("[WebPush] Initialization notice:", err);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Send a web push notification to all active device subscriptions registered to a specific user.
 * Automatically cleans up invalid, expired (410 Gone / 404), or unsubscribed endpoints.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: payload.icon || "/icon-192.png",
      badge: payload.badge || "/favicon.ico",
      tag: payload.tag || "lbmaths-notification",
      data: payload.data || {},
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sent++;
        } catch (error: any) {
          failed++;
          // HTTP 404 or 410 means the subscription is no longer valid
          if (error.statusCode === 404 || error.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.warn(`[WebPush] Failed delivering to ${sub.endpoint}:`, error.message);
          }
        }
      })
    );

    // Prune expired endpoints in background
    if (expiredEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      }).catch(() => {});
    }

    return { sent, failed };
  } catch (err) {
    console.error("[WebPush] Error sending push to user:", err);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Broadcast a push notification to multiple users (e.g. both student and tutor for a session).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  let totalSent = 0;
  let totalFailed = 0;

  for (const id of uniqueIds) {
    const res = await sendPushToUser(id, payload);
    totalSent += res.sent;
    totalFailed += res.failed;
  }

  return { sent: totalSent, failed: totalFailed };
}
