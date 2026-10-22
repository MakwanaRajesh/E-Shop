'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  X,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Package,
} from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { CouponSection } from '@/components/cart/CouponSection'
import toast from 'react-hot-toast'

const FREE_SHIPPING_THRESHOLD = 5000

export function CartDrawer() {
  const router = useRouter()
  const { cart, isOpen, setOpen, updateItem, removeItem, isLoading } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setOpen])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const items = cart?.items ?? []
  const subtotal = cart?.subtotal ?? (cart as any)?.subTotal ?? 0
  const itemCount = cart?.itemCount ?? (cart as any)?.totalItems ?? items.reduce((s, i) => s + i.quantity, 0)
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))

  const handleCheckout = () => {
    setOpen(false)
    if (!isAuthenticated) {
      toast('Please sign in to proceed to checkout', { icon: '🔒' })
      openAuthModal('login', '/checkout')
    } else {
      router.push('/checkout')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border flex flex-col shadow-2xl animate-slide-left text-beige">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-gold" />
              <h2 className="font-serif text-lg font-bold text-beige">
                Shopping Bag{' '}
                <span className="text-xs text-beige-muted font-normal">
                  ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Free Shipping Meter (SHEIN / AJIO Style) */}
          <div className="bg-surface-2/60 px-5 py-3 border-b border-border">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              {remainingForFreeShipping === 0 ? (
                <span className="text-success flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Unlocked FREE Luxury Express Delivery!
                </span>
              ) : (
                <span className="text-beige-muted">
                  Add <span className="text-gold font-semibold">{formatCurrency(remainingForFreeShipping)}</span> for{' '}
                  <span className="text-beige font-semibold">FREE Delivery</span>
                </span>
              )}
              <span className="text-[11px] text-gold font-mono">{shippingProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500 rounded-full"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-border">
            {items.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-beige-muted/40" />
                </div>
                <p className="font-serif text-lg font-semibold text-beige mb-1">Your bag is empty</p>
                <p className="text-xs text-beige-muted mb-6">
                  Explore exquisite timepieces, jewelry, and fragrances.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setOpen(false)
                    router.push('/products')
                  }}
                >
                  Explore Collection
                </Button>
              </div>
            ) : (
              items.map((item) => {
                const img = item.productImageUrl ?? item.product?.primaryImageUrl ?? item.product?.primaryImage
                return (
                  <div key={item.id} className="py-4 flex gap-3.5 group">
                    {/* Thumbnail */}
                    <div className="relative w-18 h-20 w-20 flex-shrink-0 bg-surface-2 rounded-xl overflow-hidden border border-border">
                      {img ? (
                        <Image
                          src={img}
                          alt={item.productName ?? 'Product'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="80px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-beige-muted/30">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.productSlug ?? item.product?.slug ?? ''}`}
                            onClick={() => setOpen(false)}
                            className="font-serif text-sm font-semibold text-beige hover:text-gold transition-colors line-clamp-1"
                          >
                            {item.productName ?? item.product?.name ?? 'Product'}
                          </Link>
                          <button
                            onClick={() => {
                              removeItem(item.id)
                              toast.success('Removed from bag')
                            }}
                            className="text-beige-muted hover:text-error transition-colors flex-shrink-0"
                            aria-label="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {(item.variantName || item.variantValue) && (
                          <span className="text-[11px] text-gold/80 block mt-0.5">
                            {item.variantName} {item.variantValue ? `: ${item.variantValue}` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {/* Stepper */}
                        <div className="flex items-center border border-border rounded-lg bg-surface-2 overflow-hidden">
                          <button
                            onClick={() => updateItem(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isLoading}
                            className="w-7 h-7 flex items-center justify-center text-beige-muted hover:text-beige disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold text-beige">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItem(item.id, item.quantity + 1)}
                            disabled={isLoading}
                            className="w-7 h-7 flex items-center justify-center text-beige-muted hover:text-beige"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <span className="font-serif text-sm font-bold text-beige">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Sticky Bottom Actions */}
          {items.length > 0 && (
            <div className="p-5 border-t border-border bg-surface space-y-4 max-h-[50vh] overflow-y-auto">
              {/* Promo Code & Available Vouchers */}
              <CouponSection compact />

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-beige-muted">
                  <span>Subtotal</span>
                  <span className="text-beige font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {((cart as any)?.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-success font-medium">
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency((cart as any).discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-beige-muted">
                  <span>Estimated Delivery</span>
                  <span className="text-success font-medium">
                    {remainingForFreeShipping === 0 ? 'FREE' : '₹49'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-border">
                  <span className="font-semibold text-beige text-sm">Estimated Total</span>
                  <span className="font-serif text-xl font-bold gold-text-gradient">
                    {formatCurrency(
                      Math.max(
                        0,
                        subtotal -
                          ((cart as any)?.discountAmount ?? 0) +
                          (remainingForFreeShipping === 0 ? 0 : 49),
                      ),
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setOpen(false)
                    router.push('/cart')
                  }}
                  className="w-full text-xs"
                >
                  View Full Bag
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCheckout}
                  className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  Checkout
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <p className="text-[11px] text-beige-muted/50 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-gold" />
                Guaranteed Authentic • 7-Day Return Privilege
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
