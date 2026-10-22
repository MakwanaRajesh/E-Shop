'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Star, Mail, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import type { ProductListItem } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

// Quick Category Circles (SHEIN / AJIO style)
const CATEGORY_CIRCLES = [
  {
    name: 'Men',
    href: '/products?category=men',
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=400&q=80',
    tag: 'Trending',
  },
  {
    name: 'Women',
    href: '/products?category=women',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
    tag: 'New',
  },
  {
    name: 'Kids',
    href: '/products?category=kids',
    imageUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=400&q=80',
    tag: 'Cute',
  },
  {
    name: 'T-Shirts',
    href: '/products?category=men&subCategory=men-t-shirts',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80',
  },
  {
    name: 'Denim',
    href: '/products?category=men&subCategory=men-denim',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=400&q=80',
  },
  {
    name: 'Footwear',
    href: '/products?category=footwear',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80',
  },
  {
    name: 'Watches',
    href: '/products?category=watches',
    imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80',
  },
  {
    name: 'Fragrances',
    href: '/products?category=fragrances',
    imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80',
  },
]

const FEATURED_COLLECTIONS = [
  {
    name: "Men's Collection",
    slug: 'men',
    description: 'Supima T-Shirts, French Linen Shirts, Selvedge Denim & Italian Sneakers',
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80',
    subChips: ['T-Shirts', 'Linen Shirts', 'Selvedge Jeans', 'Italian Sneakers', 'Activewear'],
  },
  {
    name: "Women's Couturier",
    slug: 'women',
    description: 'Mulberry Silk Slip Dresses, Chanderi Kurta Sets & Stiletto Heels',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    subChips: ['Silk Dresses', 'Chanderi Kurtas', 'Wide-Leg Denim', 'Designer Heels'],
  },
  {
    name: 'Horology & Leather',
    slug: 'watches',
    description: 'Precision Automatic Chronographs, Tuscan Briefcases & 18k Accents',
    imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80',
    subChips: ['Chronographs', 'Tourbillons', 'Italian Briefcase', 'Rare Oud'],
  },
]

const WHY_CHOOSE_US = [
  {
    icon: Truck,
    title: 'Complimentary White-Glove Delivery',
    description: 'Insured premium doorstep shipping on all orders over ₹5,000 with real-time tracking.',
  },
  {
    icon: ShieldCheck,
    title: '100% Certified Authenticity',
    description: 'Every luxury item is certified and serialized with guaranteed craftsmanship.',
  },
  {
    icon: RefreshCw,
    title: 'Hassle-Free 30-Day Returns',
    description: 'Complimentary doorstep return pickups and instant exchanges.',
  },
]

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = React.useState<ProductListItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [email, setEmail] = React.useState('')
  const [subscribeLoading, setSubscribeLoading] = React.useState(false)

  React.useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get<any>('/api/products/featured')
        const items = Array.isArray(res.data) ? res.data : (res.data.items ?? res.data.data ?? [])
        setFeaturedProducts(items)
      } catch {
        setFeaturedProducts([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribeLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    toast.success("You're subscribed! Welcome to the NEXUS Privileges Club.")
    setEmail('')
    setSubscribeLoading(false)
  }

  return (
    <div className="overflow-x-hidden">
      {/* ── Category Quick Circles Strip (AJIO / SHEIN style) ── */}
      <section className="bg-surface/50 border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
            {CATEGORY_CIRCLES.map((c) => (
              <Link
                key={c.name}
                href={c.href}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 border-2 border-border group-hover:border-gold transition-all duration-300 shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden relative bg-surface-2">
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="80px"
                    />
                  </div>
                  {c.tag && (
                    <span className="absolute -top-1 -right-1 bg-gold text-background text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                      {c.tag}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-beige-muted group-hover:text-gold transition-colors">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-gold/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs text-gold font-medium tracking-wider uppercase">
              Curated Spring / Summer 2026
            </span>
            <Sparkles className="w-3.5 h-3.5 text-gold" />
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-beige leading-[1.05] mb-6 animate-slide-up">
            Haute Couture &{' '}
            <span className="gold-text-gradient">Everyday Luxury</span>
          </h1>

          <p className="text-beige-muted text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
            From California Supima tees and Italian linen to precision chronographs and Mulberry silk.
            Shop authentic luxury designed for modern living.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Button variant="primary" size="lg" asChild>
              <Link href="/products" className="flex items-center gap-2">
                Explore Full Catalog
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/products?category=men">Shop Men</Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/products?category=women">Shop Women</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 border-t border-border pt-10">
            {[
              { value: '100%', label: 'Authentic Luxury' },
              { value: '₹5,000+', label: 'Free Delivery' },
              { value: '30-Day', label: 'Doorstep Returns' },
              { value: '24/7', label: 'VIP Concierge' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-2xl font-bold gold-text-gradient">{stat.value}</div>
                <div className="text-xs text-beige-muted mt-1 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Curated Collections ──────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">
            The Atelier
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-beige">
            Curated Collections
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURED_COLLECTIONS.map((cat) => (
            <div
              key={cat.slug}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface h-96 card-hover flex flex-col justify-end"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${cat.imageUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
              <div className="absolute inset-0 border border-transparent group-hover:border-gold/30 rounded-2xl transition-colors duration-300" />

              <div className="relative p-6 space-y-3 z-10">
                <h3 className="font-serif text-2xl font-bold text-beige group-hover:text-gold transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-beige-muted leading-relaxed">{cat.description}</p>

                {/* Subcategory quick tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cat.subChips.map((chip) => (
                    <span
                      key={chip}
                      className="text-[10px] bg-background/80 text-gold px-2 py-0.5 rounded-full border border-gold/20"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="inline-flex items-center gap-1 text-gold text-xs font-bold uppercase tracking-wider hover:text-gold-light"
                  >
                    <span>Explore Department</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      <section className="bg-surface py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-2">
                Hand-Selected
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-beige">
                Featured Highlights
              </h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/products" className="flex items-center gap-2">
                View All Items
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-beige-muted text-sm">
              Explore our catalogue to discover our new seasonal drops.
            </div>
          )}
        </div>
      </section>

      {/* ── Why Choose Us ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {WHY_CHOOSE_US.map((item) => (
            <div
              key={item.title}
              className="bg-surface border border-border rounded-2xl p-8 space-y-4 hover:border-gold/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-beige">{item.title}</h3>
              <p className="text-xs text-beige-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter Privileges Club ────────────────────────── */}
      <section className="border-t border-border bg-gradient-to-b from-surface to-background py-16">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center mx-auto text-gold">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-beige">
            Join the NEXUS Privileges Club
          </h2>
          <p className="text-xs sm:text-sm text-beige-muted max-w-xl mx-auto">
            Subscribe to receive private previews of seasonal drops, complimentary shipping upgrades, and exclusive member discounts.
          </p>
          <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              required
              className="flex-1 bg-surface-2 border border-border focus:border-gold rounded-xl px-4 py-3 text-xs text-beige focus:outline-none placeholder:text-beige-muted/50"
            />
            <Button variant="primary" size="md" type="submit" disabled={subscribeLoading}>
              {subscribeLoading ? 'Subscribing...' : 'Join Club'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
