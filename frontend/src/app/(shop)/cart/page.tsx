'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Package, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'
import { formatCurrency, optimizeImageUrl } from '@/lib/utils'
import { CouponSection } from '@/components/cart/CouponSection'
import toast from 'react-hot-toast'

export default function CartPage() {
  const router = useRouter()
  const { cart, updateItem, removeItem, isLoading, fetchCart, appliedCoupon } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchCart()
    }
  }, [isAuthenticated, fetchCart])

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    if (newQty < 1) return
    try {
      await updateItem(itemId, newQty)
    } catch {
      toast.error('Failed to update quantity')
    }
  }

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId)
      toast.success('Item removed from cart')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast('Please sign in or register to complete your order', { icon: '🔒' })
      openAuthModal('login', '/checkout')
      return
    }
    router.push('/checkout')
  }

  if (isLoading && !cart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <Package className="w-10 h-10 text-beige-muted/40" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-beige mb-3">Your Cart is Empty</h2>
        <p className="text-beige-muted mb-8">
          Looks like you haven&apos;t added any luxury items yet. Start exploring our catalog!
        </p>
        <Button variant="primary" size="lg" asChild>
          <Link href="/products">
            <ShoppingBag className="w-5 h-5 mr-2" />
            Start Shopping
          </Link>
        </Button>
      </div>
    )
  }

  const subtotal = cart.subtotal ?? (cart as any).subTotal ?? 0
  const itemCount = cart.itemCount ?? (cart as any).totalItems ?? cart.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const discount = appliedCoupon?.discountAmount ?? (cart as any).discountAmount ?? 0
  const finalTotal = Math.max(0, subtotal - discount)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige mb-8">
        Shopping Bag
        <span className="text-lg text-beige-muted font-normal ml-3">
          ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Cart Items ── */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const rawImg = item.product?.primaryImageUrl ?? item.product?.primaryImage ?? item.productImageUrl
            const img = rawImg ? optimizeImageUrl(rawImg, 180, 70) : null

            return (
              <div
                key={item.id}
                className="bg-surface border border-border rounded-xl p-4 sm:p-5 flex gap-4 transition-all hover:border-gold/30"
              >
                {/* Product image */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-2 border border-border">
                  {img ? (
                    <Image
                      src={img}
                      alt={item.product?.name ?? item.productName ?? 'Product'}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-8 h-8 text-beige-muted/30" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gold mb-1 font-medium">
                        {item.product?.categoryName ?? item.product?.category?.name ?? 'Collection'}
                      </p>
                      <Link
                        href={`/products/${item.product?.slug ?? item.productSlug ?? ''}`}
                        className="font-serif text-base font-medium text-beige hover:text-gold transition-colors line-clamp-2"
                      >
                        {item.product?.name ?? item.productName ?? 'Product'}
                      </Link>
                      {(item.variantName ?? item.variant?.name) && (
                        <p className="text-xs text-beige-muted mt-1">
                          {item.variantName ?? item.variant?.name}
                          {item.variantValue ? `: ${item.variantValue}` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-beige-muted hover:text-error transition-colors flex-shrink-0 p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity */}
                    <div className="flex items-center border border-border rounded-lg bg-surface-2 overflow-hidden">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isLoading}
                        className="w-8 h-8 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface transition-colors disabled:opacity-30"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-beige">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={isLoading}
                        className="w-8 h-8 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface transition-colors disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-semibold text-beige">{formatCurrency(item.totalPrice)}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-beige-muted">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Order Summary ── */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-xl p-6 sticky top-24 space-y-5">
            <h2 className="font-serif text-xl font-bold text-beige">Order Summary</h2>

            {/* Coupons & Promo Codes Section (AJIO / SHEIN Style) */}
            <div className="pt-1 border-t border-border/60">
              <CouponSection />
            </div>

            <div className="h-px bg-border" />

            {/* Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-beige-muted">Subtotal ({itemCount} items)</span>
                <span className="text-beige font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-beige-muted">Delivery</span>
                <span className="text-success text-xs font-semibold uppercase">Complimentary</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-between items-center">
              <span className="font-semibold text-beige">Total Payable</span>
              <span className="font-serif text-2xl font-bold gold-text-gradient">
                {formatCurrency(finalTotal)}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleCheckout}
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="sm" className="w-full text-beige-muted hover:text-beige" asChild>
              <Link href="/products">← Continue Shopping</Link>
            </Button>

            <p className="text-[11px] text-beige-muted/60 text-center flex items-center justify-center gap-1.5 pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-gold" />
              100% Secure Checkout • Genuine Quality Assured
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
