export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && GA_TRACKING_ID && (window as any).gtag) {
    (window as any).gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

export const event = ({ action, category, label, value }: { action: string; category?: string; label?: string; value?: number }) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const setConsent = (granted: boolean) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied'
    });
  }
};

export const loadGA4 = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!GA_TRACKING_ID) return;
  if (document.getElementById('ga4-script')) return;

  (window as any).dataLayer = (window as any).dataLayer || [];
  if (!(window as any).gtag) {
    (window as any).gtag = function (...args: unknown[]) { (window as any).dataLayer.push(args); };
  }
  (window as any).gtag('js', new Date());
  (window as any).gtag('consent', 'update', { analytics_storage: 'granted' });
  (window as any).gtag('config', GA_TRACKING_ID, { anonymize_ip: true });

  const script = document.createElement('script');
  script.id = 'ga4-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);
};
