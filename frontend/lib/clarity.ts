export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '';

const SCRIPT_ID = 'ms-clarity';

export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem('gdpr_consent');
  if (raw) {
    if (raw === '1') return true;
    if (raw === '0') return false;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.analytics === 'boolean') return parsed.analytics;
    } catch {}
  }
  // Legacy fallback: old 'cookie-consent' key
  const legacy = localStorage.getItem('cookie-consent');
  return !!legacy && legacy.includes('analytics');
};

/** Injects the Microsoft Clarity tag, gated on prod, project ID, and analytics consent. */
export const loadClarity = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;
  if (!CLARITY_PROJECT_ID) return;
  if (!hasAnalyticsConsent()) return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.type = 'text/javascript';
  script.innerHTML = `(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`;
  document.head.appendChild(script);
};

/** Safe wrapper for Clarity custom events — no-ops if Clarity hasn't loaded (no consent, dev mode, etc). */
export const trackClarityEvent = (name: string) => {
  if (typeof window !== 'undefined' && typeof (window as any).clarity === 'function') {
    (window as any).clarity('event', name);
  }
};
