import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProductListItem } from '@/types'

interface RecentlyViewedState {
  items: ProductListItem[]
  addProduct: (product: ProductListItem) => void
  removeBySlug: (slug: string) => void
  clear: () => void
}

const MAX_RECENTLY_VIEWED = 8

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addProduct: (product: ProductListItem) => {
        if (!product?.id) return
        const filtered = get().items.filter((item) => item.id !== product.id)
        set({ items: [product, ...filtered].slice(0, MAX_RECENTLY_VIEWED) })
      },

      removeBySlug: (slug: string) => {
        if (!slug) return
        const filtered = get().items.filter((item) => item.slug !== slug)
        if (filtered.length !== get().items.length) {
          set({ items: filtered })
        }
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'nexus-recently-viewed',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
    },
  ),
)
