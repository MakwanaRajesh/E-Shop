import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/lib/api'
import type { WishlistItem, ProductListItem } from '@/types'

interface WishlistState {
  items: WishlistItem[]
  isLoading: boolean
  fetchWishlist: () => Promise<void>
  addItem: (productId: string, product?: Partial<ProductListItem>) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
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
          // If unauthenticated or network error, keep existing local items
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (productId: string, product?: Partial<ProductListItem>) => {
        const prev = get().items
        if (prev.some((i) => i.productId === productId)) return

        // Optimistic add
        const placeholder: WishlistItem = {
          id: `wishlist-${productId}-${Date.now()}`,
          userId: '',
          productId,
          product: (product as ProductListItem) ?? ({
            id: productId,
            name: product?.name ?? 'Luxury Item',
            slug: product?.slug ?? '',
            price: product?.price ?? 0,
            primaryImageUrl: product?.primaryImageUrl,
            categoryName: product?.categoryName ?? 'Collection',
            averageRating: 5,
            reviewCount: 1,
            isFeatured: false,
          } as ProductListItem),
          createdAt: new Date().toISOString(),
        }

        set({ items: [placeholder, ...prev] })

        try {
          await api.post(`/api/wishlist/${productId}`, { productId })
          // Refresh from server to get canonical item IDs
          await get().fetchWishlist()
        } catch {
          // Revert optimistic add on failure
          set({ items: prev })
          throw new Error('Could not add to wishlist')
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

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
    },
  ),
)
