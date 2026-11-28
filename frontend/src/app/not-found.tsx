'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Compass, Search, ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AuthModal } from '@/components/auth/AuthModal'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/product/ProductCard'
import api from '@/lib/api'
import type { ProductListItem } from '@/types'

const QUICK_DESTINATIONS = [
  { label: 'Men', href: '/products?gender=men' },
  { label: 'Women', href: '/products?gender=women' },
  { label: 'Kids', href: '/products?gender=kids' },
  { label: 'Footwear', href: '/products?category=footwear' },
  { label: 'Accessories', href: '/products?category=accessories' },
  { label: 'My Orders', href: '/account' },
]

export default function NotFound() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [featured, setFeatured] = React.useState<ProductListItem[]>([])

  React.useEffect(() => {
    let active = true
    api
      .get<{ items?: ProductListItem[]; data?: ProductListItem[] }>('/api/products', {
        params: { page: 1, pageSize: 4, sortBy: 'popular' },
      })
      .then(({ data }) => {
        if (active) {
          setFeatured((data?.items ?? data?.data ?? []).slice(0, 4))
        }
      })
      .catch(() => {
        /* silently omit recommendations if backend unreachable */
      })
    return () => {
      active = false
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchTerm.trim()
    if (!q) {
      router.push('/products')
      return
    }
    router.push(`/products?search=${encodeURIComponent(q)}`)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-36 lg:pt-44 pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Editorial 404 Hero Card */}
          <section className="max-w-3xl mx-auto bg-surface border border-border rounded-3xl p-7 sm:p-10 text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-gold/10 border border-gold/30 text-gold shadow-sm">
                <Compass className="w-6 h-6" />
                <span className="font-serif text-2xl font-bold tracking-widest">404</span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-gold">
                  Error 404 • Page Not Found
                </p>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige tracking-tight">
                  We Couldn&apos;t Find That Page
                </h1>
                <p className="text-sm text-beige-muted max-w-lg mx-auto leading-relaxed">
                  The destination you requested may have moved, changed links, or is no longer part of this season&apos;s catalog.
                </p>
              </div>

              {/* Quick Catalog Search */}
              <form onSubmit={handleSearch} className="max-w-md mx-auto pt-1">
                <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl p-1.5 focus-within:border-gold transition-colors">
                  <Search className="w-4 h-4 text-beige-muted ml-2.5 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search shirts, dresses, denim, fragrances..."
                    aria-label="Search NEXUS catalog"
                    className="flex-1 bg-transparent text-xs sm:text-sm text-beige placeholder:text-beige-muted/60 focus:outline-none py-1.5"
                  />
                  <Button type="submit" variant="primary" size="sm" className="px-4 text-xs">
                    Search
                  </Button>
                </div>
              </form>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button variant="primary" size="md" asChild>
                  <Link href="/products" className="inline-flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Explore Collection
                  </Link>
                </Button>
                <Button variant="outline" size="md" asChild>
                  <Link href="/" className="inline-flex items-center gap-1.5">
                    Return Home
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Go Back
                </button>
              </div>

              {/* Popular Categories & Shortcuts */}
              <div className="pt-6 border-t border-border/80">
                <p className="text-[11px] uppercase tracking-widest text-beige-muted font-semibold mb-3">
                  Popular Destinations
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {QUICK_DESTINATIONS.map((dest) => (
                    <Link
                      key={dest.label}
                      href={dest.href}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-surface-2 border border-border text-beige hover:border-gold hover:text-gold transition-colors"
                    >
                      {dest.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Live Trending Pieces */}
          {featured.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6 gap-4">
                <div>
                  <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-1">
                    Curated Picks
                  </p>
                  <h2 className="font-serif text-2xl font-bold text-beige">
                    Trending in Our Collection
                  </h2>
                </div>
                <Link
                  href="/products"
                  className="text-xs font-semibold text-gold hover:underline flex items-center gap-1 whitespace-nowrap"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featured.map((item, idx) => (
                  <ProductCard key={item.id} product={item} priority={idx < 4} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <CartDrawer />
      <AuthModal />
    </>
  )
}
