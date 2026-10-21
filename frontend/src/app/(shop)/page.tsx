'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Star, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import type { ProductListItem } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const FEATURED_CATEGORIES = [
  {
    name: 'Watches',
    slug: 'watches',
    description: 'Precision timepieces for the discerning collector',
    gradient: 'from-gold/20 to-gold-dark/10',
    imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Elevate every outfit with curated accents',
    gradient: 'from-beige/10 to-surface-2',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
  },
  {
    name: 'Fragrances',
    slug: 'fragrances',
    description: 'Signature scents that tell your story',
    gradient: 'from-gold-dark/10 to-surface',
    imageUrl: 'https://images.unsplash.com/photo-1587837073080-448bc6a2329b?w=600&q=80',
  },
]

const WHY_CHOOSE_US = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Complimentary delivery on all orders above ₹2,000. Express options available.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payment',
    description: '100% secure transactions with industry-grade encryption. Multiple payment options.',
  },
  {
    icon: RefreshCw,
    title: 'Easy Returns',
    description: '30-day hassle-free returns. No questions asked for most items.',
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
        const res = await api.get<ProductListItem[] | { data?: ProductListItem[]; items?: ProductListItem[] }>('/api/products/featured')
        if (Array.isArray(res.data)) {
          setFeaturedProducts(res.data)
        } else {
          setFeaturedProducts(res.data.items ?? res.data.data ?? [])
        }
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
    toast.success("You're subscribed! Welcome to NEXUS.")
    setEmail('')
    setSubscribeLoading(false)
  }

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background" />

        {/* Decorative gold orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-gold/8 blur-3xl pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Pre-headline */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 mb-8 animate-fade-in">
            <Star className="w-3.5 h-3.5 text-gold fill-gold" />
            <span className="text-xs text-gold font-medium tracking-wider uppercase">
              Premium Collection 2025
            </span>
            <Star className="w-3.5 h-3.5 text-gold fill-gold" />
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-beige leading-[1.05] mb-6 animate-slide-up">
            Redefine Your{' '}
            <span className="gold-text-gradient">Luxury</span>
            <br />
            Experience
          </h1>

          {/* Subheadline */}
          <p className="text-beige-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
            Curated collections of the world&apos;s finest products. From timepieces to fragrances,
            discover what true luxury feels like.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Button variant="primary" size="lg" asChild>
              <Link href="/products" className="flex items-center gap-2">
                Explore Collections
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/products?featured=true">View Featured</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16 border-t border-border pt-10">
            {[
              { value: '10K+', label: 'Products' },
              { value: '50K+', label: 'Happy Customers' },
              { value: '4.9★', label: 'Average Rating' },
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

      {/* ── Featured Collections ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-12">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-3">
            Curated for You
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-beige">
            Featured Collections
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-border h-72 card-hover"
            >
              {/* Background image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${cat.imageUrl})` }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              {/* Gold border on hover */}
              <div className="absolute inset-0 border border-transparent group-hover:border-gold/30 rounded-2xl transition-colors duration-300" />

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-serif text-2xl font-bold text-beige mb-1 group-hover:text-gold transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-beige-muted mb-3">{cat.description}</p>
                <div className="flex items-center gap-1 text-gold text-sm font-medium">
                  <span>Shop Now</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ───────────────────────────────────── */}
      <section className="bg-surface py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-gold text-sm font-medium uppercase tracking-widest mb-3">
                Hand-Picked
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-beige">
                Featured Products
              </h2>
            </div>
            <Button variant="outline" size="md" asChild>
              <Link href="/products" className="hidden sm:flex items-center gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* Placeholder cards when no API data */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface-2 border border-border rounded-xl p-6 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-gold/40" />
                  </div>
                  <p className="text-beige-muted text-sm">Product #{i + 1}</p>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Button variant="outline" size="md" asChild>
              <Link href="/products">View All Products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <p className="text-gold text-sm font-medium uppercase tracking-widest mb-3">
            Our Promise
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-beige">
            Why Choose Luxe Store
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {WHY_CHOOSE_US.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group bg-surface border border-border rounded-2xl p-8 text-center card-hover"
            >
              <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-gold/20 transition-colors duration-300">
                <Icon className="w-7 h-7 text-gold" />
              </div>
              <h3 className="font-serif text-xl font-bold text-beige mb-3">{title}</h3>
              <p className="text-beige-muted text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface border-y border-border py-20">
        {/* Gold orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-5 h-5 text-gold" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-beige mb-3">
            Stay in the Loop
          </h2>
          <p className="text-beige-muted mb-8 leading-relaxed">
            Be the first to know about new arrivals, exclusive offers, and luxury insights.
          </p>
          <form onSubmit={handleNewsletter} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 bg-background border border-border rounded px-4 py-3 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={subscribeLoading}
            >
              Subscribe
            </Button>
          </form>
          <p className="text-xs text-beige-muted mt-3">
            No spam. Unsubscribe at any time.
          </p>
        </div>
      </section>
    </div>
  )
}
