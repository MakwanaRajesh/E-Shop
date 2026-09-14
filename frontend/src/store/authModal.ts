import { create } from 'zustand'

type AuthModalTab = 'login' | 'register'

interface AuthModalState {
  isOpen: boolean
  defaultTab: AuthModalTab
  redirectAfterLogin?: string
  open: (tab?: AuthModalTab, redirectTo?: string) => void
  close: () => void
}

export const useAuthModalStore = create<AuthModalState>()((set) => ({
  isOpen: false,
  defaultTab: 'login',
  redirectAfterLogin: undefined,

  open: (tab: AuthModalTab = 'login', redirectTo?: string) =>
    set({ isOpen: true, defaultTab: tab, redirectAfterLogin: redirectTo }),

  close: () => set({ isOpen: false, redirectAfterLogin: undefined }),
}))
