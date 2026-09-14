'use client'

import React from 'react'
import Link from 'next/link'
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/Button'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'

export default function WishlistPage() {
  const { items, isLoading } = useWishlistStore()
  const { isAuthenticated } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between border-b border-border pb-6 mb-8">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige">Saved Items</h1>
          <p className="text-sm text-beige-muted mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your personal wishlist
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/products" className="flex items-center gap-2">
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
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
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  )
}
