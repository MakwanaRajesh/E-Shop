import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/lib/api'
import type { Cart, CartItem } from '@/types'

export interface ProductMeta {
  name: string
  slug?: string
  price: number
  imageUrl?: string
  stock?: number
  variantName?: string
  variantValue?: string
}

interface CartState {
  cart: Cart | null
  isOpen: boolean
  isLoading: boolean
  fetchCart: () => Promise<void>
  addItem: (
    productId: string,
    quantity?: number,
    variantId?: string,
    meta?: ProductMeta,
  ) => Promise<void>
  updateItem: (cartItemId: string, quantity: number) => Promise<void>
  removeItem: (cartItemId: string) => Promise<void>
  clearCart: () => Promise<void>
  syncGuestCartToServer: () => Promise<void>
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

const isAuth = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem('auth-storage')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!parsed?.state?.accessToken
  } catch {
    return false
  }
}

const recalculateCart = (items: CartItem[]): Cart => {
  const subTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    id: 'guest-cart',
    items,
    subtotal: subTotal,
    subTotal: subTotal,
    total: subTotal,
    itemCount: totalItems,
    totalItems: totalItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      isOpen: false,
      isLoading: false,

      fetchCart: async () => {
        if (!isAuth()) {
          // Keep current local guest cart
          return
        }
        set({ isLoading: true })
        try {
          const { data } = await api.get<any>('/api/cart')
          if (data) {
            const normalized: Cart = {
              id: data.id,
              items: data.items ?? [],
              subtotal: data.subTotal ?? data.subtotal ?? 0,
              subTotal: data.subTotal ?? data.subtotal ?? 0,
              total: data.subTotal ?? data.subtotal ?? 0,
              itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              createdAt: data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt ?? new Date().toISOString(),
            }
            set({ cart: normalized })
          }
        } catch {
          // If server fails or user has empty cart
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (productId: string, quantity = 1, variantId?: string, meta?: ProductMeta) => {
        set({ isLoading: true })
        try {
          if (isAuth()) {
            const { data } = await api.post<any>('/api/cart/items', {
              productId,
              quantity,
              variantId,
            })
            const normalized: Cart = {
              id: data.id,
              items: data.items ?? [],
              subtotal: data.subTotal ?? data.subtotal ?? 0,
              subTotal: data.subTotal ?? data.subtotal ?? 0,
              total: data.subTotal ?? data.subtotal ?? 0,
              itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              createdAt: data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt ?? new Date().toISOString(),
            }
            set({ cart: normalized, isOpen: true })
          } else {
            // Guest local cart handling
            const currentCart = get().cart
            const existingItems = currentCart?.items ? [...currentCart.items] : []
            const existingIdx = existingItems.findIndex(
              (i) => i.productId === productId && (variantId ? i.variantId === variantId : true),
            )

            if (existingIdx >= 0) {
              const current = existingItems[existingIdx]
              const newQty = current.quantity + quantity
              existingItems[existingIdx] = {
                ...current,
                quantity: newQty,
                totalPrice: current.unitPrice * newQty,
              }
            } else {
              const price = meta?.price ?? 0
              const newItem: CartItem = {
                id: `guest-${productId}-${variantId ?? 'main'}-${Date.now()}`,
                productId,
                productName: meta?.name ?? 'Luxury Product',
                productSlug: meta?.slug ?? '',
                productImageUrl: meta?.imageUrl,
                variantId,
                variantName: meta?.variantName,
                variantValue: meta?.variantValue,
                quantity,
                unitPrice: price,
                totalPrice: price * quantity,
                availableStock: meta?.stock ?? 10,
              }
              existingItems.push(newItem)
            }

            const updatedCart = recalculateCart(existingItems)
            set({ cart: updatedCart, isOpen: true })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      updateItem: async (cartItemId: string, quantity: number) => {
        if (quantity < 1) return
        set({ isLoading: true })
        try {
          if (isAuth()) {
            const { data } = await api.put<any>(`/api/cart/items/${cartItemId}`, { quantity })
            const normalized: Cart = {
              id: data.id,
              items: data.items ?? [],
              subtotal: data.subTotal ?? data.subtotal ?? 0,
              subTotal: data.subTotal ?? data.subtotal ?? 0,
              total: data.subTotal ?? data.subtotal ?? 0,
              itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              createdAt: data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt ?? new Date().toISOString(),
            }
            set({ cart: normalized })
          } else {
            const currentItems = get().cart?.items ? [...get().cart!.items] : []
            const idx = currentItems.findIndex((i) => i.id === cartItemId)
            if (idx >= 0) {
              const item = currentItems[idx]
              currentItems[idx] = {
                ...item,
                quantity,
                totalPrice: item.unitPrice * quantity,
              }
              set({ cart: recalculateCart(currentItems) })
            }
          }
        } finally {
          set({ isLoading: false })
        }
      },

      removeItem: async (cartItemId: string) => {
        set({ isLoading: true })
        try {
          if (isAuth()) {
            const { data } = await api.delete<any>(`/api/cart/items/${cartItemId}`)
            const normalized: Cart = {
              id: data.id,
              items: data.items ?? [],
              subtotal: data.subTotal ?? data.subtotal ?? 0,
              subTotal: data.subTotal ?? data.subtotal ?? 0,
              total: data.subTotal ?? data.subtotal ?? 0,
              itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              createdAt: data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt ?? new Date().toISOString(),
            }
            set({ cart: normalized })
          } else {
            const currentItems = get().cart?.items ? [...get().cart!.items] : []
            const filtered = currentItems.filter((i) => i.id !== cartItemId)
            set({ cart: recalculateCart(filtered) })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      clearCart: async () => {
        set({ isLoading: true })
        try {
          if (isAuth()) {
            await api.delete('/api/cart').catch(() => null)
          }
          set({ cart: null })
        } finally {
          set({ isLoading: false })
        }
      },

      syncGuestCartToServer: async () => {
        const currentCart = get().cart
        if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
          await get().fetchCart()
          return
        }

        // Only sync if these are guest items
        const guestItems = currentCart.items.filter((i) => i.id.startsWith('guest-'))
        if (guestItems.length > 0) {
          for (const item of guestItems) {
            try {
              await api.post('/api/cart/items', {
                productId: item.productId,
                quantity: item.quantity,
                variantId: item.variantId,
              })
            } catch {
              // Ignore single item conflict
            }
          }
        }

        // Fetch refreshed server cart
        await get().fetchCart()
      },

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (open: boolean) => set({ isOpen: open }),
    }),
    {
      name: 'nexus-cart-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (null as unknown as Storage),
      ),
    },
  ),
)
