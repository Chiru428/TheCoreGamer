import { create } from 'zustand';

interface ProfileModalState {
  /** Username whose profile modal is open, or null when closed. */
  username: string | null;
  /** True when the caller already knows this user is a staff article author
   *  (e.g. opened from a byline) — lets the modal render the Articles/Comments
   *  tabs immediately instead of flashing Comments/Reviews while the profile
   *  summary is still loading. */
  isAuthorHint: boolean;
  /** Opens the profile modal for any user, staff or not — the modal itself
   *  fetches the profile and switches to an "Articles" tab for staff authors. */
  openProfile: (username: string, isAuthorHint?: boolean) => void;
  closeProfile: () => void;
}

export const useProfileModalStore = create<ProfileModalState>((set) => ({
  username: null,
  isAuthorHint: false,
  openProfile: (username, isAuthorHint = false) => set({ username, isAuthorHint }),
  closeProfile: () => set({ username: null, isAuthorHint: false }),
}));
