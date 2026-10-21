import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/lib/api'
import type { WishlistItem } from '@/types'

interface WishlistState {
  items: WishlistItem[]
  isLoading: boolean
  fetchWishlist: () => Promise<void>
  addItem: (productId: string) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      fetchWishlist: async () => {
        set({ isLoading: true })
        try {
          const { data } = await api.get<any>('/api/wishlist')
          const list = Array.isArray(data) ? data : (data?.items ?? [])
          set({ items: list })
        } catch {
          set({ items: [] })
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (productId: string) => {
        try {
          await api.post(`/api/wishlist/${productId}`, { productId })
          await get().fetchWishlist()
        } catch {
          // Keep current state on error
        }
      },

      removeItem: async (productId: string) => {
        // Optimistic remove
        const prev = get().items
        set({ items: prev.filter((i) => i.productId !== productId) })
        try {
          await api.delete(`/api/wishlist/${productId}`)
        } catch {
          // Revert
          set({ items: prev })
        }
      },

      isInWishlist: (productId: string) =>
        get().items.some((item) => item.productId === productId),
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
    },
  ),
)
