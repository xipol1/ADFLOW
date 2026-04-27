import { useState, useCallback, useEffect } from 'react';
import apiService from '../services/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function usePushNotifications() {
  const [isSupported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window);
  const [permission, setPermission] = useState(() => isSupported ? Notification.permission : 'denied');
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setSubscription(sub));
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return null;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return null;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    setSubscription(sub);
    // Send to backend
    try { await apiService.request('/notifications/push-subscribe', { method: 'POST', data: { subscription: sub.toJSON() } }); } catch {}
    return sub;
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);
      try { await apiService.request('/notifications/push-unsubscribe', { method: 'POST' }); } catch {}
    }
  }, [subscription]);

  return { isSupported, permission, subscription, subscribe, unsubscribe };
}
