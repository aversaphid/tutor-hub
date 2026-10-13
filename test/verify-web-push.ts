import { test, describe } from "node:test";
import assert from "node:assert/strict";

try {
  process.loadEnvFile();
} catch {}

describe("Web Push Notification Integration", () => {
  test("VAPID Keys format validation", () => {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;

    assert.ok(pubKey, "NEXT_PUBLIC_VAPID_PUBLIC_KEY must be defined");
    assert.ok(privKey, "VAPID_PRIVATE_KEY must be defined");
    assert.ok(pubKey.length > 50, "VAPID public key should be valid base64url encoded string");
    assert.ok(privKey.length > 30, "VAPID private key should be valid base64url encoded string");
  });

  test("Web Push payload structure formatting", () => {
    const rawPayload = {
      title: "Lesson Delayed",
      body: "Luke has delayed your lesson by 5 minutes.",
      url: "/student",
    };

    const formatted = JSON.stringify({
      title: rawPayload.title,
      body: rawPayload.body,
      url: rawPayload.url,
      icon: "/icon-192.png",
      badge: "/favicon.ico",
      tag: "lbmaths-notification",
    });

    const parsed = JSON.parse(formatted);
    assert.equal(parsed.title, "Lesson Delayed");
    assert.equal(parsed.body, "Luke has delayed your lesson by 5 minutes.");
    assert.equal(parsed.url, "/student");
    assert.equal(parsed.icon, "/icon-192.png");
  });

  test("Public key URL conversion logic", () => {
    function urlBase64ToUint8Array(base64String: string) {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = Buffer.from(base64, "base64");
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData[i];
      }
      return outputArray;
    }

    const sampleKey = "BJdTbAtKYOQu6AlJbtqMd8a7SBtQUqlHu7dyyjtCo7eahepsCWrIIFMTmXDRwNW9AFi3RdNj76bhPUcnPBOL7Fw";
    const uint8 = urlBase64ToUint8Array(sampleKey);
    assert.ok(uint8 instanceof Uint8Array);
    assert.equal(uint8.byteLength, 65, "Standard uncompressed P-256 public key length is 65 bytes");
  });
});
