import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BOOutTZVZ--YEZwEY4VVRV9M46719kdqIX2Gw8SrAR9R3GCKxLGsfEPmup6HAKjuDmwXsTQ4sK-t-_8soIhs52Q";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const isPreviewHost = () =>
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app"));

const isInIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // No registrar SW en iframe del editor de Lovable
  if (isInIframe()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("SW register failed", e);
    return null;
  }
}

export async function ensurePushSubscription(userId: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (isInIframe()) return false;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
    if (!reg) return false;

    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return false;
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh!,
        auth_key: json.keys.auth!,
        user_agent: navigator.userAgent,
      },
      { onConflict: "endpoint" }
    );
    return true;
  } catch (e) {
    console.warn("push subscribe failed", e);
    return false;
  }
}

export async function notifyAll(title: string, body: string, url = "/") {
  try {
    await supabase.functions.invoke("send-push", { body: { all: true, title, body, url } });
  } catch (e) {
    console.warn("send-push failed", e);
  }
}
