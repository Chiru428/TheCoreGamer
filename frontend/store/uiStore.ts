import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface UIState {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  activeModal: string | null;
  modalData: unknown;
  openModal: (id: string, data?: unknown) => void;
  closeModal: () => void;
  consentGranted: boolean;
  consentChecked: boolean;
  setConsent: (granted: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  searchOverlayOpen: boolean;
  setSearchOverlayOpen: (open: boolean) => void;
  showCookieBanner: boolean;
  toggleCookieBanner: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      const d = document.documentElement;
      d.classList.add('disable-transitions');
      d.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      
      // Force reflow and remove class to re-enable transitions
      window.setTimeout(() => {
        d.classList.remove('disable-transitions');
      }, 0);
    }
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), toast.duration || 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  activeModal: null,
  modalData: null,
  openModal: (id, data) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  consentGranted: false,
  consentChecked: false,
  setConsent: (granted) => {
    set({ consentGranted: granted, consentChecked: true });
  },
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  searchOverlayOpen: false,
  setSearchOverlayOpen: (open) => set({ searchOverlayOpen: open }),
  showCookieBanner: false,
  toggleCookieBanner: () => set((s) => ({ showCookieBanner: !s.showCookieBanner })),
}));
