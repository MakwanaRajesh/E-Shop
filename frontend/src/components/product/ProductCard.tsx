'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
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
}

export function ProductCard({ product, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isAddingToCart, setIsAddingToCart] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
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
    <Link
      href={`/products/${product.slug}`}
      className={cn('group block', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'bg-white border border-[#E7E5E4] rounded-2xl overflow-hidden',
          'transition-all duration-300 shadow-sm',
          isHovered && 'border-[#C5A059] shadow-xl -translate-y-1',
        )}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-[#F5F2EB]">
          {/* Shimmer skeleton until image loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[#F5F2EB] animate-pulse flex items-center justify-center z-0">
              <div className="w-8 h-8 rounded-full border border-[#C5A059]/30 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-[#C5A059]/60 animate-ping" />
              </div>
            </div>
          )}

          {imageUrl ? (
            <Image
              src={optimizeImageUrl(imageUrl, 450, 65)}
              alt={product.name}
              fill
              loading="eager"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                'object-cover transition-all duration-500 z-10',
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                isHovered && 'scale-105',
              )}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#A8A29E]/40">
              <ShoppingCart className="w-16 h-16" />
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
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

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center',
              'bg-white/90 backdrop-blur-sm border border-[#E7E5E4] shadow-sm',
              'transition-all duration-200 z-20',
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

          {/* Add to cart overlay */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 p-3 transition-all duration-300 z-20',
              'bg-gradient-to-t from-black/60 to-transparent',
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
            )}
          >
            <Button
              variant="primary"
              size="sm"
              className="w-full bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111] shadow-lg font-semibold"
              onClick={handleAddToCart}
              isLoading={isAddingToCart}
              disabled={stockCount === 0}
            >
              <ShoppingCart className="w-4 h-4" />
              {stockCount === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Category */}
          <p className="text-xs text-[#C5A059] uppercase tracking-wider font-semibold">
            {categoryLabel}
          </p>

          {/* Name */}
          <h3 className="font-serif text-base font-semibold text-[#111111] leading-snug line-clamp-2 group-hover:text-[#C5A059] transition-colors duration-200">
            {product.name}
          </h3>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-3 h-3',
                      i < Math.round(product.averageRating)
                        ? 'text-[#C5A059] fill-[#C5A059]'
                        : 'text-[#E7E5E4] fill-[#E7E5E4]',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-[#78716C]">({product.reviewCount})</span>
            </div>
          )}

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

          {/* Mobile add to cart button */}
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:hidden bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111]"
            onClick={handleAddToCart}
            isLoading={isAddingToCart}
            disabled={stockCount === 0}
          >
            <ShoppingCart className="w-4 h-4" />
            {stockCount === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </Link>
  )
}
