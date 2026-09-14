'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, Minus, Plus, ShoppingBag, Tag, ArrowRight, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { CouponValidation } from '@/types'

export default function CartPage() {
  const router = useRouter()
  const { cart, updateItem, removeItem, isLoading, fetchCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()
  const [couponCode, setCouponCode] = React.useState('')
  const [couponLoading, setCouponLoading] = React.useState(false)
  const [couponResult, setCouponResult] = React.useState<CouponValidation | null>(null)

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const { data } = await api.post<CouponValidation>('/api/coupons/validate', {
        code: couponCode.trim(),
        cartTotal: cart?.subtotal ?? 0,
      })
      setCouponResult(data)
      if (data.isValid) {
        toast.success(`Coupon applied! You save ${formatCurrency(data.discountAmount)}`)
      } else {
        toast.error(data.message ?? 'Invalid coupon code')
      }
    } catch {
      toast.error('Failed to apply coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openAuthModal('login', '/checkout')
      return
    }
    router.push('/checkout')
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-beige-muted/40" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-beige mb-3">Your Cart</h2>
        <p className="text-beige-muted mb-8">Sign in to view your cart and checkout</p>
        <Button variant="primary" size="lg" onClick={() => openAuthModal('login', '/cart')}>
          Sign In to Continue
        </Button>
      </div>
    )
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
          Looks like you haven&apos;t added any items yet. Start exploring our collection!
        </p>
        <Button variant="primary" size="lg" asChild>
          <Link href="/products">
            <ShoppingBag className="w-5 h-5" />
            Start Shopping
          </Link>
        </Button>
      </div>
    )
  }

  const discount = couponResult?.isValid ? couponResult.discountAmount : 0
  const finalTotal = cart.subtotal - discount

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-serif text-4xl font-bold text-beige mb-8">
        Shopping Cart
        <span className="text-xl text-beige-muted font-normal ml-3">
          ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Cart Items ── */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-border rounded-xl p-4 sm:p-5 flex gap-4"
            >
              {/* Product image */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-2">
                {item.product?.primaryImageUrl ?? item.product?.primaryImage ?? item.productImageUrl ? (
                  <Image
                    src={(item.product?.primaryImageUrl ?? item.product?.primaryImage ?? item.productImageUrl)!}
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
                    <p className="text-xs text-gold mb-1">
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
                    className="text-beige-muted hover:text-error transition-colors flex-shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity */}
                  <div className="flex items-center border border-border rounded overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isLoading}
                      className="w-8 h-8 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors disabled:opacity-30"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-10 text-center text-sm text-beige">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={isLoading}
                      className="w-8 h-8 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors disabled:opacity-30"
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
          ))}
        </div>

        {/* ── Order Summary ── */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-xl p-6 sticky top-24 space-y-5">
            <h2 className="font-serif text-xl font-bold text-beige">Order Summary</h2>

            {/* Coupon */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-beige-muted flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Coupon Code
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleApplyCoupon}
                  isLoading={couponLoading}
                >
                  Apply
                </Button>
              </div>
              {couponResult?.isValid && (
                <p className="text-xs text-success">
                  ✓ {couponResult.message ?? `Discount applied: -${formatCurrency(couponResult.discountAmount)}`}
                </p>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-beige-muted">Subtotal ({cart.itemCount} items)</span>
                <span className="text-beige">{formatCurrency(cart.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-beige-muted">Shipping</span>
                <span className="text-success text-xs font-medium">FREE</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-between items-center">
              <span className="font-semibold text-beige">Total</span>
              <span className="font-serif text-2xl font-bold gold-text-gradient">
                {formatCurrency(finalTotal)}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleCheckout}
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
