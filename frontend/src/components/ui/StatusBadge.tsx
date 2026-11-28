'use client'

import React from 'react'
import {
  CheckCircle2,
  XCircle,
  Truck,
  Sparkles,
  Clock,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType =
  | 'delivered'
  | 'cancelled'
  | 'shipped'
  | 'out_for_delivery'
  | 'outfordelivery'
  | 'processing'
  | 'confirmed'
  | 'pending'
  | 'payment_pending'
  | 'paymentpending'
  | 'refunded'
  | 'paid'
  | 'completed'
  | 'failed'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'active'
  | 'inactive'
  | string

interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showDot?: boolean
  className?: string
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const norm = (status ?? '').toString().toLowerCase().replace(/[\s-_]/g, '')

  let badgeStyle = 'bg-surface-2 text-beige-muted border-border'
  let dotStyle = 'bg-beige-muted'
  let displayLabel = label ?? status?.toString() ?? 'Unknown'
  let IconComponent: React.ComponentType<{ className?: string }> | null = null

  // 1. Delivered / Completed / Paid / In Stock -> Vibrant Luxury Emerald Green
  if (['delivered', 'completed', 'paid', 'instock', 'active'].includes(norm)) {
    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm hover:border-emerald-400'
    dotStyle = 'bg-emerald-500'
    IconComponent = CheckCircle2
    if (!label) {
      if (norm === 'instock') displayLabel = 'In Stock'
      else if (norm === 'delivered') displayLabel = 'Delivered'
      else if (norm === 'paid' || norm === 'completed') displayLabel = 'Paid'
      else if (norm === 'active') displayLabel = 'Active'
    }
  }
  // 2. Cancelled / Failed / Out of Stock / Inactive / Rejected -> Rich Velvet Ruby Red
  else if (['cancelled', 'failed', 'outofstock', 'inactive', 'rejected'].includes(norm)) {
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm hover:border-rose-400'
    dotStyle = 'bg-rose-500'
    IconComponent = XCircle
    if (!label) {
      if (norm === 'outofstock') displayLabel = 'Out of Stock'
      else if (norm === 'cancelled') displayLabel = 'Cancelled'
      else if (norm === 'failed') displayLabel = 'Payment Failed'
      else if (norm === 'rejected') displayLabel = 'Return Declined'
      else if (norm === 'inactive') displayLabel = 'Inactive'
    }
  }
  // 3. Shipped / Out for Delivery / In Transit / Picked Up -> Sapphire Azure Blue
  else if (['shipped', 'outfordelivery', 'dispatched', 'intransit', 'pickedup', 'approved'].includes(norm)) {
    badgeStyle = 'bg-sky-50 text-sky-700 border-sky-200 shadow-sm hover:border-sky-400'
    dotStyle = 'bg-sky-500 animate-pulse'
    IconComponent = Truck
    if (!label) {
      if (norm.includes('outfordelivery')) displayLabel = 'Out for Delivery'
      else if (norm === 'pickedup') displayLabel = 'Picked Up'
      else if (norm === 'approved') displayLabel = 'Pickup Approved'
      else displayLabel = 'Dispatched'
    }
  }
  // 4. Processing / Preparing / Received QC -> Royal Amethyst Purple
  else if (['processing', 'inproduction', 'preparing', 'received'].includes(norm)) {
    badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm hover:border-purple-400'
    dotStyle = 'bg-purple-500 animate-ping'
    IconComponent = Sparkles
    if (!label) displayLabel = norm === 'received' ? 'QC Passed' : 'Processing'
  }
  // 5. Confirmed -> Imperial Gold
  else if (['confirmed'].includes(norm)) {
    badgeStyle = 'bg-gold/15 text-gold-dark border-gold/40 shadow-sm hover:border-gold'
    dotStyle = 'bg-gold'
    IconComponent = ShieldCheck
    if (!label) displayLabel = 'Confirmed'
  }
  // 6. Pending / Payment Pending / Low Stock / Return Requested -> Radiant Topaz Amber
  else if (['pending', 'paymentpending', 'lowstock', 'awaitingpayment', 'requested', 'refundinitiated'].includes(norm)) {
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm hover:border-amber-400'
    dotStyle = 'bg-amber-500 animate-pulse'
    IconComponent = norm === 'lowstock' ? AlertTriangle : Clock
    if (!label) {
      if (norm === 'lowstock') displayLabel = 'Low Stock'
      else if (norm === 'requested') displayLabel = 'Return Requested'
      else if (norm === 'refundinitiated') displayLabel = 'Refund Initiated'
      else if (norm.includes('payment')) displayLabel = 'Payment Pending'
      else displayLabel = 'Pending'
    }
  }
  // 7. Refunded / Partially Refunded / Refund Completed -> Plum Slate
  else if (['refunded', 'returned', 'refundcompleted', 'partiallyrefunded'].includes(norm)) {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
    dotStyle = 'bg-emerald-600'
    IconComponent = RotateCcw
    if (!label) {
      if (norm === 'partiallyrefunded') displayLabel = 'Partially Refunded'
      else if (norm === 'refundcompleted') displayLabel = 'Refund Settled'
      else displayLabel = 'Refunded'
    }
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size]

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-all duration-300 select-none whitespace-nowrap',
        badgeStyle,
        sizeClasses,
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotStyle)} />
      )}
      {showIcon && IconComponent && (
        <IconComponent className={cn('flex-shrink-0', iconSizes)} />
      )}
      <span className="capitalize font-semibold tracking-wide">{displayLabel}</span>
    </span>
  )
}
