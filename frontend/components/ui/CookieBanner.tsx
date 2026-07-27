'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ChevronRight, Shield, BarChart2, Megaphone } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface ConsentPrefs {
  necessary: boolean;
  analytics: boolean;
  advertising: boolean;
  timestamp: string;
}

const CONSENT_KEY = 'gdpr_consent';
const LEGACY_KEY = 'cookie-consent';
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function readStoredConsent(): ConsentPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    if (raw === '1') return { necessary: true, analytics: true, advertising: true, timestamp: new Date(0).toISOString() };
    if (raw === '0') return { necessary: true, analytics: false, advertising: false, timestamp: new Date(0).toISOString() };
    const parsed: ConsentPrefs = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function isExpired(prefs: ConsentPrefs): boolean {
  return Date.now() - new Date(prefs.timestamp).getTime() > CONSENT_MAX_AGE_MS;
}

function persistConsent(prefs: ConsentPrefs) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  localStorage.setItem(LEGACY_KEY, prefs.analytics ? 'essential,analytics' : 'essential');
}

function fireConsentEvent(prefs: ConsentPrefs) {
  window.dispatchEvent(new CustomEvent('consent-updated', { detail: prefs }));
}

export default function CookieBanner() {
  const { setConsent, showCookieBanner, toggleCookieBanner } = useUIStore();
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalPrefs, setModalPrefs] = useState({ analytics: true, advertising: false });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored && !isExpired(stored)) {
      setConsent(stored.advertising);
      fireConsentEvent(stored);
    } else {
      setVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showCookieBanner) {
      setVisible(true);
      toggleCookieBanner();
    }
  }, [showCookieBanner, toggleCookieBanner]);

  const applyConsent = (analytics: boolean, advertising: boolean) => {
    const prefs: ConsentPrefs = {
      necessary: true,
      analytics,
      advertising,
      timestamp: new Date().toISOString(),
    };
    persistConsent(prefs);
    setConsent(advertising);
    fireConsentEvent(prefs);
    setVisible(false);
    setShowModal(false);
  };

  const handleAcceptAll = () => applyConsent(true, true);
  const handleRejectAll = () => applyConsent(false, false);
  const handleSavePrefs = () => applyConsent(modalPrefs.analytics, modalPrefs.advertising);

  const openModal = () => {
    const stored = readStoredConsent();
    if (stored) setModalPrefs({ analytics: stored.analytics, advertising: stored.advertising });
    setShowModal(true);
  };

  return (
    <>
      {/* Main banner */}
      <AnimatePresence>
        {visible && !showModal && (
          <motion.div
            data-cookie-banner
            role="dialog"
            aria-modal="true"
            aria-label="Cookie consent"
            initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[90] p-4 md:p-6 flex justify-center"
          >
            <div
              className="w-full max-w-2xl rounded-2xl shadow-2xl p-5 md:p-6"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text)' }}>
                We use cookies to personalise content and analyse traffic. Analytics and advertising cookies are optional — necessary cookies keep the site working.{' '}
                <a href="/privacy" className="underline" style={{ color: 'var(--accent)' }}>Privacy Policy</a>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
                >
                  Reject All
                </button>
                <button
                  onClick={openModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80 flex items-center gap-1"
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  Manage Preferences <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
            />
            <div className="fixed inset-0 z-[96] flex items-end sm:items-center justify-center p-4 pointer-events-none">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Cookie preferences"
                className="pointer-events-auto w-full max-w-md rounded-2xl shadow-2xl p-6"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Cookie Preferences</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-md transition-opacity hover:opacity-70"
                    style={{ color: 'var(--muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {/* Necessary — always on */}
                  <div
                    className="flex items-start justify-between gap-4 p-4 rounded-xl"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Necessary</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Session management, security, preferences. Always active.</p>
                      </div>
                    </div>
                    <div
                      aria-checked="true"
                      role="switch"
                      aria-label="Necessary cookies (always on)"
                      className="relative w-9 h-5 rounded-full shrink-0"
                      style={{ background: 'var(--accent)', opacity: 0.5 }}
                    >
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>

                  {/* Analytics */}
                  <div
                    className="flex items-start justify-between gap-4 p-4 rounded-xl"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <BarChart2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--muted)' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Analytics</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Google Analytics 4, Microsoft Clarity — helps us understand how the site is used.</p>
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={modalPrefs.analytics}
                      aria-label="Analytics cookies"
                      onClick={() => setModalPrefs(p => ({ ...p, analytics: !p.analytics }))}
                      className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                      style={{ background: modalPrefs.analytics ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer' }}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${modalPrefs.analytics ? 'right-0.5' : 'left-0.5'}`}
                      />
                    </button>
                  </div>

                  {/* Advertising */}
                  <div
                    className="flex items-start justify-between gap-4 p-4 rounded-xl"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <Megaphone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--muted)' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Advertising</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Google AdSense — enables relevant ads. Turning this off shows non-personalised ads.</p>
                      </div>
                    </div>
                    <button
                      role="switch"
                      aria-checked={modalPrefs.advertising}
                      aria-label="Advertising cookies"
                      onClick={() => setModalPrefs(p => ({ ...p, advertising: !p.advertising }))}
                      className="relative w-9 h-5 rounded-full shrink-0 transition-colors"
                      style={{ background: modalPrefs.advertising ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer' }}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${modalPrefs.advertising ? 'right-0.5' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSavePrefs}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
                  >
                    Accept All
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
