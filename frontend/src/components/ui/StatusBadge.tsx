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
    badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/15 hover:border-emerald-400'
    dotStyle = 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
    IconComponent = CheckCircle2
    if (!label) {
      if (norm === 'instock') displayLabel = 'In Stock'
      else if (norm === 'delivered') displayLabel = 'Delivered'
      else if (norm === 'paid' || norm === 'completed') displayLabel = 'Paid'
      else if (norm === 'active') displayLabel = 'Active'
    }
  }
  // 2. Cancelled / Failed / Out of Stock / Inactive -> Rich Velvet Ruby Red
  else if (['cancelled', 'failed', 'outofstock', 'inactive'].includes(norm)) {
    badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/15 hover:border-rose-400'
    dotStyle = 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
    IconComponent = XCircle
    if (!label) {
      if (norm === 'outofstock') displayLabel = 'Out of Stock'
      else if (norm === 'cancelled') displayLabel = 'Cancelled'
      else if (norm === 'failed') displayLabel = 'Payment Failed'
      else if (norm === 'inactive') displayLabel = 'Inactive'
    }
  }
  // 3. Shipped / Out for Delivery / In Transit -> Sapphire Azure Blue
  else if (['shipped', 'outfordelivery', 'dispatched', 'intransit'].includes(norm)) {
    badgeStyle = 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-sm shadow-sky-500/15 hover:border-sky-400'
    dotStyle = 'bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.7)]'
    IconComponent = Truck
    if (!label) {
      if (norm.includes('outfordelivery')) displayLabel = 'Out for Delivery'
      else displayLabel = 'Dispatched'
    }
  }
  // 4. Processing / Preparing -> Royal Amethyst Purple
  else if (['processing', 'inproduction', 'preparing'].includes(norm)) {
    badgeStyle = 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/15 hover:border-purple-400'
    dotStyle = 'bg-purple-400 animate-ping'
    IconComponent = Sparkles
    if (!label) displayLabel = 'Processing'
  }
  // 5. Confirmed -> Imperial Gold
  else if (['confirmed'].includes(norm)) {
    badgeStyle = 'bg-gold/15 text-gold border-gold/40 shadow-sm shadow-gold/15 hover:border-gold'
    dotStyle = 'bg-gold shadow-[0_0_8px_rgba(201,168,76,0.7)]'
    IconComponent = ShieldCheck
    if (!label) displayLabel = 'Confirmed'
  }
  // 6. Pending / Payment Pending / Low Stock -> Radiant Topaz Amber
  else if (['pending', 'paymentpending', 'lowstock', 'awaitingpayment'].includes(norm)) {
    badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/15 hover:border-amber-400 animate-pulse'
    dotStyle = 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.7)]'
    IconComponent = norm === 'lowstock' ? AlertTriangle : Clock
    if (!label) {
      if (norm === 'lowstock') displayLabel = 'Low Stock'
      else if (norm.includes('payment')) displayLabel = 'Payment Pending'
      else displayLabel = 'Pending'
    }
  }
  // 7. Refunded -> Plum Slate
  else if (['refunded', 'returned'].includes(norm)) {
    badgeStyle = 'bg-slate-500/15 text-slate-300 border-slate-500/40 shadow-sm shadow-slate-500/15'
    dotStyle = 'bg-slate-400'
    IconComponent = RotateCcw
    if (!label) displayLabel = 'Refunded'
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
