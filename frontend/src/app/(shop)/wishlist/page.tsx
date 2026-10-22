'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingBag, ArrowRight, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useWishlistStore } from '@/store/wishlist'
import { useCartStore } from '@/store/cart'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function WishlistPage() {
  const { items, isLoading, fetchWishlist, removeItem } = useWishlistStore()
  const { addItem: addToCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()
  const [movingId, setMovingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist()
    }
  }, [isAuthenticated, fetchWishlist])

  const handleMoveToCart = async (productId: string, product: any) => {
    setMovingId(productId)
    try {
      await addToCart(productId, 1, undefined, {
        name: product?.name ?? 'Luxury Item',
        slug: product?.slug ?? '',
        price: product?.price ?? 0,
        imageUrl: product?.primaryImageUrl ?? product?.primaryImage,
        stock: product?.stock ?? 10,
      })
      await removeItem(productId)
      toast.success('Moved to shopping cart! 🛍️', { icon: '✨' })
    } catch {
      toast.error('Failed to move to cart')
    } finally {
      setMovingId(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <Heart className="w-10 h-10 text-gold" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-beige mb-3">Your Wishlist</h1>
        <p className="text-beige-muted mb-8">Sign in to view your saved items and sync across devices.</p>
        <Button variant="primary" size="lg" onClick={() => openAuthModal('login', '/wishlist')}>
          Sign In to NEXUS
        </Button>
      </div>
    )
  }

  const validItems = items.filter((i) => i && (i.product || i.productId))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between border-b border-border pb-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige">Saved Luxury Items</h1>
          <p className="text-sm text-beige-muted mt-1">
            {validItems.length} {validItems.length === 1 ? 'item' : 'items'} in your curated personal wishlist
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/products" className="flex items-center gap-2">
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {validItems.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-beige-muted/40" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-beige mb-2">Your wishlist is empty</h2>
          <p className="text-beige-muted text-sm mb-6 max-w-md mx-auto">
            Save exquisite timepieces, jewelry, and fragrances to your wishlist to keep track of your favorites.
          </p>
          <Button variant="primary" size="md" asChild>
            <Link href="/products">Explore Collections</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {validItems.map((item) => {
            const prod = item.product ?? {}
            const imageUrl = prod.primaryImageUrl ?? prod.primaryImage
            const prodId = item.productId || prod.id

            return (
              <div
                key={item.id || prodId}
                className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-gold/40 transition-all duration-300 shadow-md shadow-black/20"
              >
                <div>
                  {/* Image */}
                  <Link href={`/products/${prod.slug ?? ''}`} className="relative aspect-square block bg-surface-2 overflow-hidden">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={prod.name ?? 'Product'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-beige-muted/20">
                        <ShoppingBag className="w-16 h-16" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        removeItem(prodId)
                        toast.success('Removed from wishlist')
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center text-error hover:scale-110 transition-all"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Link>

                  {/* Content */}
                  <div className="p-4 space-y-1.5">
                    <p className="text-[11px] text-gold uppercase tracking-wider font-semibold">
                      {prod.categoryName ?? prod.category?.name ?? 'Collection'}
                    </p>
                    <Link
                      href={`/products/${prod.slug ?? ''}`}
                      className="font-serif text-base font-semibold text-beige line-clamp-1 hover:text-gold transition-colors block"
                    >
                      {prod.name ?? 'Exquisite Piece'}
                    </Link>
                    <p className="font-serif text-lg font-bold text-beige pt-1">
                      {formatCurrency(prod.price ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-0">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full font-semibold"
                    onClick={() => handleMoveToCart(prodId, prod)}
                    isLoading={movingId === prodId}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Move to Cart
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
