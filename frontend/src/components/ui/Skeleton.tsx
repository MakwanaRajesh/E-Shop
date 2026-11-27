import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn('shimmer rounded-md', className)} style={style} />
}

interface ProductCardSkeletonProps {
  staggerIndex?: number
}

function ProductCardSkeleton({ staggerIndex = 0 }: ProductCardSkeletonProps) {
  const delayStyle = { animationDelay: `${(staggerIndex % 6) * 90}ms` }
  return (
    <div className="bg-surface rounded-2xl overflow-hidden border border-[#E7E5E4] shadow-sm flex flex-col">
      <div className="relative aspect-square w-full bg-[#F5F2EB] overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" style={delayStyle} />
        {/* Floating discount & wishlist placeholder chrome matching ProductCard */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <div className="h-5 w-14 rounded-full bg-white/70 shimmer" style={delayStyle} />
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <div className="w-8 h-8 rounded-full bg-white/75 shimmer" style={delayStyle} />
          <div className="w-8 h-8 rounded-full bg-white/75 shimmer" style={delayStyle} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full border border-[#C5A059]/25 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#C5A059]/60 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-24 rounded-full" style={delayStyle} />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full" style={delayStyle} />
            <Skeleton className="h-4 w-3/4" style={delayStyle} />
          </div>
          {/* 5-star rating placeholder */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, starIdx) => (
                <Skeleton key={starIdx} className="w-3 h-3 rounded-sm" style={delayStyle} />
              ))}
            </div>
            <Skeleton className="h-3 w-12 rounded-full" style={delayStyle} />
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-6 w-20" style={delayStyle} />
            <Skeleton className="h-4 w-14" style={delayStyle} />
          </div>
          <Skeleton className="h-9 w-full rounded-xl sm:hidden" style={delayStyle} />
        </div>
      </div>
    </div>
  )
}

interface ProductGridSkeletonProps {
  count?: number
  label?: string
  gridClassName?: string
}

function ProductGridSkeleton({
  count = 6,
  label = 'Curating collection pieces...',
  gridClassName = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6',
}: ProductGridSkeletonProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface border border-border/80">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
          <span className="text-xs font-medium text-beige-muted">{label}</span>
        </div>
        <span className="text-[11px] font-mono text-gold/80">Loading items</span>
      </div>
      <div className={gridClassName}>
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} staggerIndex={i} />
        ))}
      </div>
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12" aria-busy="true" aria-label="Loading product details">
      <div className="space-y-4">
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border bg-[#F5F2EB]">
          <Skeleton className="w-full h-full rounded-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gold/30 shadow-sm">
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
              <span className="text-xs font-medium text-beige">Loading gallery...</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-9 w-11/12" />
          <Skeleton className="h-9 w-2/3" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-baseline gap-3 pt-1">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-2.5 pt-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-16 rounded-xl" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export { Skeleton, ProductCardSkeleton, ProductGridSkeleton, ProductDetailSkeleton }
