import { create } from 'zustand';

interface NotifState {
  pushSubscription: PushSubscription | null;
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  pushSubscription: null,
  isSubscribed: false,
  isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  subscribe: async () => {
    try {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied. Please enable them in your browser settings.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      set({ pushSubscription: sub, isSubscribed: true });
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))) },
        }),
      }).catch(err => console.error('Failed to sync push subscription to server:', err));
    } catch (err) { console.error('Push subscription failed:', err); }
  },
  unsubscribe: async () => {
    const { pushSubscription } = get();
    if (pushSubscription) {
      await pushSubscription.unsubscribe();
      set({ pushSubscription: null, isSubscribed: false });
    }
  },
  checkSubscription: async () => {
    if (!get().isSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      set({ pushSubscription: sub, isSubscribed: !!sub });
    } catch { /* ignore */ }
  },
}));
