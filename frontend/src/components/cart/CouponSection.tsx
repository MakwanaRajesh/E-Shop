'use client'

import React from 'react'
import { Tag, Check, X, Sparkles, ChevronDown, ChevronUp, Percent, Gift } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface AvailableCoupon {
  code: string
  description: string
  discountType: number | string
  discountValue: number
  minOrderValue?: number
  maxDiscountAmount?: number
}

const FALLBACK_COUPONS: AvailableCoupon[] = [
  {
    code: 'NEXUS10',
    description: 'Exclusive 10% welcome discount on luxury order',
    discountType: 0,
    discountValue: 10,
    minOrderValue: 1000,
    maxDiscountAmount: 10000,
  },
  {
    code: 'FIRST500',
    description: 'Flat ₹500 instant discount on orders above ₹2,000',
    discountType: 1,
    discountValue: 500,
    minOrderValue: 2000,
  },
  {
    code: 'LUXE20',
    description: 'Elite 20% off on signature luxury collections above ₹5,000',
    discountType: 0,
    discountValue: 20,
    minOrderValue: 5000,
    maxDiscountAmount: 15000,
  },
  {
    code: 'VIPFESTIVE',
    description: 'Festive Celebration 15% off on orders above ₹3,000',
    discountType: 0,
    discountValue: 15,
    minOrderValue: 3000,
    maxDiscountAmount: 5000,
  },
]

interface CouponSectionProps {
  compact?: boolean
  className?: string
}

export function CouponSection({ compact = false, className = '' }: CouponSectionProps) {
  const { cart, appliedCoupon, applyCoupon, removeCoupon } = useCartStore()
  const [inputCode, setInputCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [showOffers, setShowOffers] = React.useState(false)
  const [availableCoupons, setAvailableCoupons] = React.useState<AvailableCoupon[]>(FALLBACK_COUPONS)

  const subtotal = cart?.subtotal ?? (cart as any)?.subTotal ?? 0

  // Fetch available coupons from backend
  React.useEffect(() => {
    let isMounted = true
    const loadCoupons = async () => {
      try {
        const { data } = await api.get<AvailableCoupon[]>('/api/coupons/available')
        if (isMounted && data && Array.isArray(data) && data.length > 0) {
          setAvailableCoupons(data)
        }
      } catch {
        // Retain fallback coupons
      }
    }
    loadCoupons()
    return () => {
      isMounted = false
    }
  }, [])

  const handleApply = async (codeToApply?: string) => {
    const targetCode = (codeToApply ?? inputCode).trim().toUpperCase()
    if (!targetCode) {
      toast.error('Please enter a coupon code')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post<{
        isValid: boolean
        message: string
        discountAmount: number
        couponCode?: string
      }>('/api/coupons/validate', {
        code: targetCode,
        cartTotal: subtotal,
      })

      if (data && data.isValid) {
        applyCoupon(targetCode, data.discountAmount, data.message)
        setInputCode('')
        setShowOffers(false)
        toast.success(`🎉 ${targetCode} applied! Saved ${formatCurrency(data.discountAmount)}`, {
          icon: '🏷️',
          duration: 4000,
        })
      } else {
        toast.error(data?.message || 'Invalid or inapplicable coupon code')
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } }
      toast.error(apiErr.response?.data?.message || 'Failed to apply coupon')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = () => {
    removeCoupon()
    toast.success('Coupon removed')
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* If coupon is already applied */}
      {appliedCoupon ? (
        <div className="bg-gold/10 border border-gold/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gold/20 text-gold flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-gold text-sm tracking-wide">
                  {appliedCoupon.code}
                </span>
                <span className="text-[10px] font-semibold uppercase bg-gold/20 text-gold px-1.5 py-0.5 rounded">
                  Applied
                </span>
              </div>
              <p className="text-xs text-beige-muted mt-0.5 truncate">
                Saved {formatCurrency(appliedCoupon.discountAmount)} on this order
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-beige-muted hover:text-error text-xs font-semibold px-2 py-1 rounded transition-colors"
            title="Remove Coupon"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Input Row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-gold/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Enter coupon code (e.g. NEXUS10)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleApply()
                  }
                }}
                className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold transition-colors font-mono tracking-wider uppercase"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleApply()}
              disabled={loading || !inputCode.trim()}
              className="px-4 text-xs font-semibold"
            >
              {loading ? 'Applying...' : 'Apply'}
            </Button>
          </div>

          {/* Toggle Available Offers */}
          <div>
            <button
              type="button"
              onClick={() => setShowOffers(!showOffers)}
              className="text-xs text-gold hover:text-gold-light transition-colors flex items-center justify-between w-full py-1 font-medium"
            >
              <span className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-gold" />
                View Available Coupons & Offers ({availableCoupons.length})
              </span>
              {showOffers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Offers List */}
            {showOffers && (
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1 animate-fade-in divide-y divide-border/40">
                {availableCoupons.map((c) => {
                  const meetsMin = !c.minOrderValue || subtotal >= c.minOrderValue
                  const needed = c.minOrderValue ? c.minOrderValue - subtotal : 0

                  return (
                    <div
                      key={c.code}
                      className="pt-2 pb-2 first:pt-1 flex items-start justify-between gap-3 bg-surface/50 hover:bg-surface-2/60 p-2.5 rounded-lg border border-border/60 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gold border border-gold/40 border-dashed px-2 py-0.5 rounded bg-gold/5">
                            {c.code}
                          </span>
                          {c.discountValue && (
                            <span className="text-[11px] font-semibold text-beige">
                              {c.discountType === 0 || c.discountType === 'Percentage'
                                ? `${c.discountValue}% OFF`
                                : `₹${c.discountValue} OFF`}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-beige-muted leading-tight">{c.description}</p>
                        {!meetsMin && needed > 0 && (
                          <p className="text-[10px] text-gold/80 font-medium">
                            Add {formatCurrency(needed)} more to unlock this offer
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApply(c.code)}
                        disabled={loading}
                        className={`text-xs font-bold uppercase px-2.5 py-1 rounded transition-all flex-shrink-0 ${
                          meetsMin
                            ? 'bg-gold/20 text-gold hover:bg-gold hover:text-background border border-gold/40'
                            : 'bg-surface-2 text-beige-muted/40 cursor-not-allowed border border-border'
                        }`}
                      >
                        Apply
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
