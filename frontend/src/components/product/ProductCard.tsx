'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star, Eye, X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency, getStockStatus, calculateDiscount, optimizeImageUrl } from '@/lib/utils'
import type { ProductListItem } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import toast from 'react-hot-toast'

interface ProductCardProps {
  product: ProductListItem
  className?: string
  priority?: boolean
}

export function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const [isAddingToCart, setIsAddingToCart] = React.useState(false)
  const [activeImageIdx, setActiveImageIdx] = React.useState(0)
  const [quickViewImageIdx, setQuickViewImageIdx] = React.useState(0)
  const [failedSlides, setFailedSlides] = React.useState<Record<number, boolean>>({})
  const [quickViewOpen, setQuickViewOpen] = React.useState(false)
  const galleryRef = React.useRef<HTMLDivElement | null>(null)
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const { isInWishlist, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore()
  const { open: openAuthModal } = useAuthModalStore()

  const stockCount = product.stock ?? product.stockQuantity ?? 0
  const stockStatus = getStockStatus(stockCount)
  const discount = calculateDiscount(product.price, product.compareAtPrice)
  const inWishlist = isInWishlist(product.id)
  const imageUrl = product.primaryImageUrl ?? product.primaryImage
  const categoryLabel = product.categoryName ?? product.category?.name ?? 'Collection'
  const cardImages = React.useMemo(() => {
    const urls = (product.imageUrls ?? []).filter((u): u is string => Boolean(u && u.trim()))
    if (urls.length > 0) return urls
    return imageUrl ? [imageUrl] : []
  }, [product.imageUrls, imageUrl])

  React.useEffect(() => {
    setActiveImageIdx(0)
    setQuickViewImageIdx(0)
    setFailedSlides({})
    if (galleryRef.current) {
      galleryRef.current.scrollLeft = 0
    }
  }, [product.id])

  const scrollToCardImage = React.useCallback(
    (targetIdx: number) => {
      if (cardImages.length === 0) return
      const wrapped = ((targetIdx % cardImages.length) + cardImages.length) % cardImages.length
      const container = galleryRef.current
      if (container && container.clientWidth > 0) {
        container.scrollTo({ left: wrapped * container.clientWidth, behavior: 'smooth' })
      }
      setActiveImageIdx(wrapped)
    },
    [cardImages.length],
  )

  const handleCardGalleryScroll = React.useCallback(() => {
    const container = galleryRef.current
    if (!container || container.clientWidth === 0 || cardImages.length <= 1) return
    const nextIdx = Math.round(container.scrollLeft / container.clientWidth)
    if (nextIdx >= 0 && nextIdx < cardImages.length) {
      setActiveImageIdx(nextIdx)
    }
  }, [cardImages.length])

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsAddingToCart(true)
    try {
      await addItem(product.id, 1, undefined, {
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: imageUrl,
        stock: stockCount,
      })
      toast.success(`${product.name} added to cart!`, {
        icon: '🛍️',
        position: 'bottom-right',
      })
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast('Please sign in to save items to your wishlist', { icon: '🤍' })
      openAuthModal('login')
      return
    }
    if (inWishlist) {
      await removeFromWishlist(product.id)
      toast.success('Removed from wishlist')
    } else {
      await addToWishlist(product.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        primaryImageUrl: imageUrl,
        categoryName: categoryLabel,
      })
      toast.success('Saved to wishlist!', { icon: '💛' })
    }
  }

  return (
    <>
    <article
      className={cn(
        'group h-full flex flex-col bg-white border border-[#E7E5E4] rounded-2xl overflow-hidden',
        'transition-all duration-300 shadow-sm hover:border-[#C5A059] hover:shadow-xl md:hover:-translate-y-1',
        className,
      )}
    >
      {/* Horizontal Scrollable Image Gallery */}
      <div className="relative aspect-square overflow-hidden bg-[#F5F2EB]">
        {cardImages.length > 0 ? (
          <div
            ref={galleryRef}
            onScroll={handleCardGalleryScroll}
            className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {cardImages.map((src, idx) => (
              <Link
                key={`${product.id}-slide-${idx}`}
                href={`/products/${product.slug}`}
                className="relative w-full h-full flex-shrink-0 snap-center block"
                aria-label={`View ${product.name}${cardImages.length > 1 ? ` - image ${idx + 1} of ${cardImages.length}` : ''}`}
              >
                {!failedSlides[idx] ? (
                  <Image
                    src={optimizeImageUrl(src, 450, 70)}
                    alt={idx === 0 ? product.name : `${product.name} - view ${idx + 1}`}
                    fill
                    priority={priority && idx === 0}
                    loading={priority && idx === 0 ? 'eager' : 'lazy'}
                    fetchPriority={priority && idx === 0 ? 'high' : 'auto'}
                    decoding="async"
                    onError={() => setFailedSlides((prev) => ({ ...prev, [idx]: true }))}
                    className="object-cover transition-transform duration-300 md:group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#A8A29E]/40">
                    <ShoppingCart className="w-16 h-16" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            className="relative w-full h-full flex items-center justify-center text-[#A8A29E]/40"
            aria-label={`View ${product.name}`}
          >
            <ShoppingCart className="w-16 h-16" />
          </Link>
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20 pointer-events-none">
          {discount > 0 && (
            <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-mono font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-sm tracking-wider">
              -{discount}% OFF
            </span>
          )}
          <StatusBadge
            status={stockStatus.badgeType}
            label={stockStatus.label}
            size="sm"
          />
        </div>

        {/* Wishlist & Quick View buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
          <button
            type="button"
            onClick={handleWishlist}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              'bg-white/90 backdrop-blur-sm border border-[#E7E5E4] shadow-sm',
              'transition-all duration-200',
              inWishlist
                ? 'text-[#991B1B] border-[#FECACA] bg-[#FEF2F2]'
                : 'text-[#78716C] hover:text-[#991B1B] hover:border-[#FECACA]',
            )}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className="w-4 h-4"
              fill={inWishlist ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setQuickViewImageIdx(activeImageIdx)
              setQuickViewOpen(true)
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm border border-[#E7E5E4] shadow-sm text-[#78716C] hover:text-[#C5A059] hover:border-[#C5A059] transition-all duration-200"
            aria-label={`Quick view ${product.name}`}
            title="Quick View"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-image prev/next arrows & dots */}
        {cardImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                scrollToCardImage(activeImageIdx - 1)
              }}
              aria-label={`Previous image for ${product.name}`}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-[#E7E5E4] hover:border-[#C5A059] shadow-sm flex items-center justify-center text-[#111111] transition-opacity opacity-90 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                scrollToCardImage(activeImageIdx + 1)
              }}
              aria-label={`Next image for ${product.name}`}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-[#E7E5E4] hover:border-[#C5A059] shadow-sm flex items-center justify-center text-[#111111] transition-opacity opacity-90 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              {cardImages.map((_, idx) => (
                <button
                  key={`${product.id}-dot-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    scrollToCardImage(idx)
                  }}
                  aria-label={`Show image ${idx + 1} of ${cardImages.length}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    idx === activeImageIdx ? 'w-4 bg-[#C5A059]' : 'w-1.5 bg-white/75 hover:bg-white',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Category */}
          <p className="text-xs text-[#C5A059] uppercase tracking-wider font-semibold">
            {categoryLabel}
          </p>

          {/* Name */}
          <Link href={`/products/${product.slug}`} className="block">
            <h3 className="font-serif text-base font-semibold text-[#111111] leading-snug line-clamp-2 hover:text-[#C5A059] transition-colors duration-200">
              {product.name}
            </h3>
          </Link>

          {/* Rating out of 5 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => {
                  const ratingVal = product.averageRating ?? 0
                  const filled = i < Math.round(ratingVal)
                  return (
                    <Star
                      key={i}
                      className={cn(
                        'w-3 h-3',
                        filled && ratingVal > 0
                          ? 'text-[#C5A059] fill-[#C5A059]'
                          : 'text-[#E7E5E4] fill-[#E7E5E4]',
                      )}
                    />
                  )
                })}
              </div>
              <span className="text-[11px] font-semibold text-[#111111] tabular-nums">
                {(product.averageRating ?? 0) > 0 ? `${(product.averageRating ?? 0).toFixed(1)}/5` : '0.0/5'}
              </span>
              <span className="text-[11px] text-[#78716C] tabular-nums">
                ({product.reviewCount ?? 0})
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-lg font-bold text-[#111111]">
              {formatCurrency(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-[#78716C] line-through font-normal">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Clean always-visible Add to Cart CTA */}
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full h-10 min-h-[40px] shrink-0 rounded-xl bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111] font-semibold text-xs shadow-sm transition-colors"
          onClick={handleAddToCart}
          isLoading={isAddingToCart}
          disabled={stockCount === 0}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>{stockCount === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
        </Button>
      </div>
    </article>

    {/* Quick View Modal */}
    {quickViewOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setQuickViewOpen(false)}
        />
        <div className="relative bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden z-10 animate-slide-up grid grid-cols-1 sm:grid-cols-2">
          <button
            onClick={() => setQuickViewOpen(false)}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 border border-[#E7E5E4] flex items-center justify-center text-[#57534E] hover:text-[#111111]"
            aria-label="Close quick view"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative aspect-square bg-[#F5F2EB]">
            {cardImages.length > 0 && !failedSlides[quickViewImageIdx] ? (
              <Image
                src={optimizeImageUrl(cardImages[quickViewImageIdx] ?? cardImages[0], 600, 80)}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#A8A29E]/40">
                <ShoppingCart className="w-16 h-16" />
              </div>
            )}
            {cardImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setQuickViewImageIdx((prev) => (prev === 0 ? cardImages.length - 1 : prev - 1))
                  }
                  aria-label="Previous preview image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 border border-[#E7E5E4] shadow-sm flex items-center justify-center text-[#111111] hover:border-[#C5A059]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuickViewImageIdx((prev) => (prev === cardImages.length - 1 ? 0 : prev + 1))
                  }
                  aria-label="Next preview image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 border border-[#E7E5E4] shadow-sm flex items-center justify-center text-[#111111] hover:border-[#C5A059]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {cardImages.map((_, idx) => (
                    <button
                      key={`qv-dot-${idx}`}
                      type="button"
                      onClick={() => setQuickViewImageIdx(idx)}
                      aria-label={`Preview image ${idx + 1}`}
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        idx === quickViewImageIdx ? 'w-4 bg-[#C5A059]' : 'w-1.5 bg-white/75',
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-[#C5A059] uppercase tracking-wider font-semibold">
                  {categoryLabel}
                </span>
                <StatusBadge status={stockStatus.badgeType} label={stockStatus.label} size="sm" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#111111] leading-snug">
                {product.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3.5 h-3.5',
                        (product.averageRating ?? 0) > 0 && i < Math.round(product.averageRating ?? 0)
                          ? 'text-[#C5A059] fill-[#C5A059]'
                          : 'text-[#E7E5E4] fill-[#E7E5E4]',
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-[#111111]">
                  {(product.averageRating ?? 0).toFixed(1)} / 5
                </span>
                <span className="text-xs text-[#78716C]">
                  ({product.reviewCount ?? 0} {(product.reviewCount ?? 0) === 1 ? 'review' : 'reviews'})
                </span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-bold text-[#111111]">
                  {formatCurrency(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-[#78716C] line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-xs font-bold text-[#991B1B]">({discount}% OFF)</span>
                )}
              </div>
              {product.shortDescription && (
                <p className="text-xs text-[#57534E] leading-relaxed">
                  {product.shortDescription}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111]"
                onClick={handleAddToCart}
                isLoading={isAddingToCart}
                disabled={stockCount === 0}
              >
                <ShoppingCart className="w-4 h-4" />
                {stockCount === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Link
                href={`/products/${product.slug}`}
                onClick={() => setQuickViewOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-[#E7E5E4] hover:border-[#C5A059] text-[#111111] hover:text-[#C5A059] rounded-xl py-2.5 text-xs font-semibold transition-colors"
              >
                <span>View Full Details & Sizing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
