'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { cn, formatCurrency, getStockStatus, calculateDiscount, optimizeImageUrl } from '@/lib/utils'
import type { ProductListItem } from '@/types'
import { Badge } from '@/components/ui/Badge'
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
          'bg-surface border border-border rounded-xl overflow-hidden',
          'transition-all duration-300',
          isHovered && 'border-gold/30 shadow-xl shadow-gold/5 -translate-y-1',
        )}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          {/* Shimmer skeleton until image loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-surface-2 animate-pulse flex items-center justify-center z-0">
              <div className="w-8 h-8 rounded-full border border-gold/20 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-gold/40 animate-ping" />
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
            <div className="absolute inset-0 flex items-center justify-center text-beige-muted/20">
              <ShoppingCart className="w-16 h-16" />
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <Badge variant="gold" className="text-xs font-bold">
                -{discount}%
              </Badge>
            )}
            <Badge
              variant={
                stockStatus.variant === 'success'
                  ? 'success'
                  : stockStatus.variant === 'error'
                  ? 'error'
                  : 'gold'
              }
              className="text-xs"
            >
              {stockStatus.label}
            </Badge>
          </div>

          {/* Wishlist button */}
          <button
            onClick={handleWishlist}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center',
              'bg-background/80 backdrop-blur-sm border border-border',
              'transition-all duration-200',
              inWishlist
                ? 'text-error border-error/40'
                : 'text-beige-muted hover:text-error hover:border-error/40',
            )}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className="w-4 h-4"
              fill={inWishlist ? 'currentColor' : 'none'}
            />
          </button>

          {/* Add to cart overlay on mobile */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 p-3 transition-all duration-300',
              'bg-gradient-to-t from-background/90 to-transparent',
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
            )}
          >
            <Button
              variant="primary"
              size="sm"
              className="w-full"
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
          <p className="text-xs text-gold uppercase tracking-wider font-medium">
            {categoryLabel}
          </p>

          {/* Name */}
          <h3 className="font-serif text-base font-medium text-beige leading-snug line-clamp-2 group-hover:text-gold transition-colors duration-200">
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
                        ? 'text-gold fill-gold'
                        : 'text-beige-muted/30',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-beige-muted">({product.reviewCount})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-lg font-semibold text-beige">
              {formatCurrency(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-beige-muted line-through">
                {formatCurrency(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Mobile add to cart button */}
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:hidden"
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
