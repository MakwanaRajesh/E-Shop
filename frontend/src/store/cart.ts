import { create } from 'zustand'
import api from '@/lib/api'
import type { Cart } from '@/types'

interface CartState {
  cart: Cart | null
  isOpen: boolean
  isLoading: boolean
  fetchCart: () => Promise<void>
  addItem: (productId: string, quantity?: number, variantId?: string) => Promise<void>
  updateItem: (cartItemId: string, quantity: number) => Promise<void>
  removeItem: (cartItemId: string) => Promise<void>
  clearCart: () => Promise<void>
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

export const useCartStore = create<CartState>()((set, get) => ({
  cart: null,
  isOpen: false,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get<Cart>('/api/cart')
      set({ cart: data })
    } catch {
      // Cart may not exist yet for guest users
      set({ cart: null })
    } finally {
      set({ isLoading: false })
    }
  },

  addItem: async (productId: string, quantity = 1, variantId?: string) => {
    set({ isLoading: true })
    try {
      const { data } = await api.post<Cart>('/api/cart/items', {
        productId,
        quantity,
        variantId,
      })
      set({ cart: data, isOpen: true })
    } finally {
      set({ isLoading: false })
    }
  },

  updateItem: async (cartItemId: string, quantity: number) => {
    set({ isLoading: true })
    try {
      const { data } = await api.put<Cart>(`/api/cart/items/${cartItemId}`, { quantity })
      set({ cart: data })
    } finally {
      set({ isLoading: false })
    }
  },

  removeItem: async (cartItemId: string) => {
    set({ isLoading: true })
    try {
      const { data } = await api.delete<Cart>(`/api/cart/items/${cartItemId}`)
      set({ cart: data })
    } finally {
      set({ isLoading: false })
    }
  },

  clearCart: async () => {
    set({ isLoading: true })
    try {
      await api.delete('/api/cart')
      set({ cart: null })
    } finally {
      set({ isLoading: false })
    }
  },

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open: boolean) => set({ isOpen: open }),
}))
