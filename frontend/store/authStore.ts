import { create } from 'zustand';
import type { User, Role } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearSession: () => void;
  hasRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  clearSession: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  hasRole: (roles) => {
    const { user } = get();
    return !!user && roles.includes(user.role);
  },
}));
