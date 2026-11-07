import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '@/lib/api'
import type { Cart, CartItem } from '@/types'
import toast from 'react-hot-toast'

export const MAX_QTY_PER_PRODUCT = 10
export const MAX_CART_TOTAL_ITEMS = 20

export interface ProductMeta {
  name: string
  slug?: string
  price: number
  imageUrl?: string
  stock?: number
  variantName?: string
  variantValue?: string
}

export interface AppliedCouponInfo {
  code: string
  discountAmount: number
  message?: string
}

interface CartState {
  cart: Cart | null
  appliedCoupon: AppliedCouponInfo | null
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
  applyCoupon: (code: string, discountAmount: number, message?: string) => void
  removeCoupon: () => void
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

const recalculateCart = (items: CartItem[], coupon?: AppliedCouponInfo | null): Cart => {
  const subTotal = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1), 0)
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const discount = coupon ? coupon.discountAmount : 0
  const finalTotal = Math.max(0, subTotal - discount)
  return {
    id: 'guest-cart',
    items,
    subtotal: subTotal,
    subTotal: subTotal,
    discountAmount: discount,
    couponCode: coupon?.code,
    total: finalTotal,
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
      appliedCoupon: null,
      isOpen: false,
      isLoading: false,

      applyCoupon: (code: string, discountAmount: number, message?: string) => {
        const coupon: AppliedCouponInfo = { code: code.toUpperCase(), discountAmount, message }
        const currentCart = get().cart
        if (currentCart) {
          set({
            appliedCoupon: coupon,
            cart: recalculateCart(currentCart.items, coupon),
          })
        } else {
          set({ appliedCoupon: coupon })
        }
      },

      removeCoupon: () => {
        const currentCart = get().cart
        if (currentCart) {
          set({
            appliedCoupon: null,
            cart: recalculateCart(currentCart.items, null),
          })
        } else {
          set({ appliedCoupon: null })
        }
      },

      fetchCart: async () => {
        if (!isAuth()) return
        set({ isLoading: true })
        try {
          const { data } = await api.get<any>('/api/cart')
          if (data) {
            const currentCoupon = get().appliedCoupon
            const sub = data.subTotal ?? data.subtotal ?? 0
            const discount = currentCoupon ? currentCoupon.discountAmount : 0
            const normalized: Cart = {
              id: data.id,
              items: data.items ?? [],
              subtotal: sub,
              subTotal: sub,
              discountAmount: discount,
              couponCode: currentCoupon?.code,
              total: Math.max(0, sub - discount),
              itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
              createdAt: data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt ?? new Date().toISOString(),
            }
            set({ cart: normalized })
          }
        } catch {
          // If server fails, retain existing local cart
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (productId: string, quantity = 1, variantId?: string, meta?: ProductMeta) => {
        // 1. Instant Optimistic Local Update (SHEIN / AJIO pattern)
        const currentCart = get().cart
        const existingItems = currentCart?.items ? [...currentCart.items] : []
        const currentTotalItems = existingItems.reduce((sum, i) => sum + (i.quantity || 1), 0)

        const existingIdx = existingItems.findIndex(
          (i) => i.productId === productId && (variantId ? i.variantId === variantId : true),
        )

        const currentQty = existingIdx >= 0 ? existingItems[existingIdx].quantity : 0

        // Enforce max 10 per product
        if (currentQty >= MAX_QTY_PER_PRODUCT) {
          toast.error(`Maximum limit of ${MAX_QTY_PER_PRODUCT} units reached for this item.`)
          return
        }

        // Clamp quantity if addition exceeds 10
        let allowedAddQty = quantity
        if (currentQty + allowedAddQty > MAX_QTY_PER_PRODUCT) {
          allowedAddQty = MAX_QTY_PER_PRODUCT - currentQty
          toast(`Added ${allowedAddQty} unit(s) to meet max product limit of ${MAX_QTY_PER_PRODUCT}.`, { icon: 'ℹ️' })
        }

        // Enforce max 20 for entire cart
        if (currentTotalItems >= MAX_CART_TOTAL_ITEMS) {
          toast.error(`Cart limit reached! Maximum ${MAX_CART_TOTAL_ITEMS} items allowed in the entire bag.`)
          return
        }

        if (currentTotalItems + allowedAddQty > MAX_CART_TOTAL_ITEMS) {
          allowedAddQty = MAX_CART_TOTAL_ITEMS - currentTotalItems
          toast(`Added ${allowedAddQty} item(s) to meet total cart limit of ${MAX_CART_TOTAL_ITEMS}.`, { icon: 'ℹ️' })
        }

        if (allowedAddQty <= 0) return

        const unitPrice = meta?.price ?? 0
        if (existingIdx >= 0) {
          const current = existingItems[existingIdx]
          const newQty = current.quantity + allowedAddQty
          existingItems[existingIdx] = {
            ...current,
            quantity: newQty,
            totalPrice: current.unitPrice * newQty,
          }
        } else {
          const newItem: CartItem = {
            id: `item-${productId}-${variantId ?? 'main'}-${Date.now()}`,
            productId,
            productName: meta?.name ?? 'Luxury Product',
            productSlug: meta?.slug ?? '',
            productImageUrl: meta?.imageUrl,
            variantId,
            variantName: meta?.variantName,
            variantValue: meta?.variantValue,
            quantity: allowedAddQty,
            unitPrice,
            totalPrice: unitPrice * allowedAddQty,
            availableStock: meta?.stock ?? 10,
          }
          existingItems.push(newItem)
        }

        // Immediately update state and open Slide-Over Mini Cart Drawer!
        const optimisticCart = recalculateCart(existingItems, get().appliedCoupon)
        set({ cart: optimisticCart, isOpen: true })

        // 2. Background Server Sync (if authenticated)
        if (isAuth()) {
          try {
            const { data } = await api.post<any>('/api/cart/items', {
              productId,
              quantity: allowedAddQty,
              variantId: variantId || null,
            })
            if (data) {
              const currentCoupon = get().appliedCoupon
              const sub = data.subTotal ?? data.subtotal ?? 0
              const discount = currentCoupon ? currentCoupon.discountAmount : 0
              const serverNormalized: Cart = {
                id: data.id,
                items: data.items ?? [],
                subtotal: sub,
                subTotal: sub,
                discountAmount: discount,
                couponCode: currentCoupon?.code,
                total: Math.max(0, sub - discount),
                itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
                totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
                createdAt: data.createdAt ?? new Date().toISOString(),
                updatedAt: data.updatedAt ?? new Date().toISOString(),
              }
              set({ cart: serverNormalized })
            }
          } catch {
            // Keep optimistic cart intact on network failure
          }
        }
      },

      updateItem: async (cartItemId: string, quantity: number) => {
        if (quantity < 1) return
        let validQty = quantity

        if (validQty > MAX_QTY_PER_PRODUCT) {
          toast.error(`Maximum ${MAX_QTY_PER_PRODUCT} units allowed per product.`)
          validQty = MAX_QTY_PER_PRODUCT
        }

        const currentItems = get().cart?.items ? [...get().cart!.items] : []
        const otherItemsCount = currentItems.filter((i) => i.id !== cartItemId).reduce((sum, i) => sum + (i.quantity || 1), 0)

        if (otherItemsCount + validQty > MAX_CART_TOTAL_ITEMS) {
          validQty = Math.max(1, MAX_CART_TOTAL_ITEMS - otherItemsCount)
          toast.error(`Cart limit reached! Maximum ${MAX_CART_TOTAL_ITEMS} items allowed in the entire bag.`)
        }

        const idx = currentItems.findIndex((i) => i.id === cartItemId)
        if (idx >= 0) {
          const item = currentItems[idx]
          currentItems[idx] = {
            ...item,
            quantity: validQty,
            totalPrice: item.unitPrice * validQty,
          }
          set({ cart: recalculateCart(currentItems, get().appliedCoupon) })
        }

        if (isAuth() && !cartItemId.startsWith('item-')) {
          try {
            const { data } = await api.put<any>(`/api/cart/items/${cartItemId}`, { quantity: validQty })
            if (data) {
              const currentCoupon = get().appliedCoupon
              const sub = data.subTotal ?? data.subtotal ?? 0
              const discount = currentCoupon ? currentCoupon.discountAmount : 0
              set({
                cart: {
                  id: data.id,
                  items: data.items ?? [],
                  subtotal: sub,
                  subTotal: sub,
                  discountAmount: discount,
                  couponCode: currentCoupon?.code,
                  total: Math.max(0, sub - discount),
                  itemCount: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
                  totalItems: data.totalItems ?? data.itemCount ?? (data.items?.length || 0),
                  createdAt: data.createdAt ?? new Date().toISOString(),
                  updatedAt: data.updatedAt ?? new Date().toISOString(),
                },
              })
            }
          } catch {
            // Keep optimistic update
          }
        }
      },

      removeItem: async (cartItemId: string) => {
        const currentItems = get().cart?.items ? [...get().cart!.items] : []
        const filtered = currentItems.filter((i) => i.id !== cartItemId)
        set({ cart: recalculateCart(filtered, get().appliedCoupon) })

        if (isAuth() && !cartItemId.startsWith('item-')) {
          try {
            await api.delete<any>(`/api/cart/items/${cartItemId}`)
          } catch {
            // Keep optimistic removal
          }
        }
      },

      clearCart: async () => {
        set({ cart: null, appliedCoupon: null })
        if (isAuth()) {
          try {
            await api.delete('/api/cart').catch(() => null)
          } catch {
            // ignore
          }
        }
      },

      syncGuestCartToServer: async () => {
        const currentCart = get().cart
        if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
          await get().fetchCart()
          return
        }

        const localItems = currentCart.items
        for (const item of localItems) {
          try {
            await api.post('/api/cart/items', {
              productId: item.productId,
              quantity: item.quantity,
              variantId: item.variantId || null,
            })
          } catch {
            // Ignore single item conflict
          }
        }

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
