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
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=85',
    tag: 'Trending',
  },
  {
    name: 'Women',
    href: '/products?category=women',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=85',
    tag: 'Couture',
  },
  {
    name: 'Kids',
    href: '/products?category=kids',
    imageUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=600&q=85',
    tag: 'Junior',
  },
  {
    name: 'Footwear',
    href: '/products?category=footwear',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=85',
    tag: 'Italian',
  },
  {
    name: 'Dresses',
    href: '/products?category=women&subCategory=women-dresses',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'T-Shirts',
    href: '/products?category=men&subCategory=men-t-shirts',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Denim',
    href: '/products?category=men&subCategory=men-denim',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Watches',
    href: '/products?category=watches',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Fragrances',
    href: '/products?category=fragrances',
    imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683702?auto=format&fit=crop&w=600&q=85',
  },
  {
    name: 'Jewelry',
    href: '/products?category=jewelry',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=85',
  },
]

const FEATURED_COLLECTIONS = [
  {
    name: "Men's Collection",
    slug: 'men',
    description: 'Californian Supima T-Shirts, French Linen Shirts, Japanese Selvedge Denim & Italian Sneakers',
    imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1200&q=85',
    subChips: ['Supima Tees', 'Linen Shirts', 'Selvedge Jeans', 'Italian Sneakers', 'Activewear'],
  },
  {
    name: "Women's Couturier",
    slug: 'women',
    description: 'Mulberry Silk Cowl Dresses, Handcrafted Chanderi Kurta Sets, Wide-Leg Denim & Stiletto Pumps',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
    subChips: ['Silk Slip Dresses', 'Chanderi Kurtas', 'Wide-Leg Denim', 'Designer Stilettos'],
  },
  {
    name: 'Horology & Fine Living',
    slug: 'watches',
    description: 'Precision Swiss Automatic Chronographs, Tuscan Box-Calf Briefcases, 18k Accents & Rare Oud',
    imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=85',
    subChips: ['Swiss Chronographs', 'Tourbillons', 'Italian Briefcase', 'Imperial Santal'],
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
      <section className="bg-[#FAF8F5] border-b border-[#E7E5E4] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
            {CATEGORY_CIRCLES.map((c) => (
              <Link
                key={c.name}
                href={c.href}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 border-2 border-[#E7E5E4] group-hover:border-[#C5A059] transition-all duration-300 shadow-sm group-hover:shadow-md">
                  <div className="w-full h-full rounded-full overflow-hidden relative bg-[#F5F2EB]">
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="80px"
                    />
                  </div>
                  {c.tag && (
                    <span className="absolute -top-1 -right-1 bg-[#111111] text-[#FAF8F5] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow border border-[#333333]">
                      {c.tag}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#57534E] group-hover:text-[#111111] transition-colors">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hero (Atelier Obsidian & Champagne Gold) ───────────── */}
      <section className="relative min-h-[82vh] flex items-center justify-center overflow-hidden py-20 bg-gradient-to-br from-[#0A0A0A] via-[#141210] to-[#1C1917]">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-[#C5A059]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C5A059]/40 bg-[#C5A059]/10 mb-8 animate-fade-in shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="text-xs text-[#D4AF37] font-medium tracking-widest uppercase">
              Curated Spring / Summer 2026
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#FAF8F5] leading-[1.05] mb-6 animate-slide-up">
            Haute Couture &{' '}
            <span className="text-[#D4AF37] italic font-serif">Everyday Luxury</span>
          </h1>

          <p className="text-[#A8A29E] text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in font-light">
            From Californian Supima tees and Italian linen to precision chronographs and Mulberry silk.
            Shop authentic luxury designed for modern living.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-[#FFFFFF] text-[#111111] hover:bg-[#FAF8F5] hover:text-[#C5A059] font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all duration-300"
            >
              <span>Explore Full Catalog</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/products?category=men"
              className="inline-flex items-center justify-center border border-[#C5A059] text-[#FAF8F5] hover:bg-[#C5A059]/15 hover:text-[#D4AF37] font-medium text-sm px-7 py-3.5 rounded-xl transition-all duration-300"
            >
              Shop Men
            </Link>
            <Link
              href="/products?category=women"
              className="inline-flex items-center justify-center border border-[#C5A059] text-[#FAF8F5] hover:bg-[#C5A059]/15 hover:text-[#D4AF37] font-medium text-sm px-7 py-3.5 rounded-xl transition-all duration-300"
            >
              Shop Women
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 border-t border-[#262422] pt-10">
            {[
              { value: '100%', label: 'Authentic Luxury' },
              { value: '₹5,000+', label: 'Free Delivery' },
              { value: '30-Day', label: 'Doorstep Returns' },
              { value: '24/7', label: 'VIP Concierge' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-2xl sm:text-3xl font-bold text-[#D4AF37]">{stat.value}</div>
                <div className="text-xs text-[#A8A29E] mt-1 uppercase tracking-wider font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Curated Collections ──────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-[#FAF8F5]">
        <div className="text-center mb-12">
          <p className="text-[#C5A059] text-xs font-semibold uppercase tracking-widest mb-2">
            The Atelier
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-[#111111]">
            Curated Collections
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURED_COLLECTIONS.map((cat) => (
            <div
              key={cat.slug}
              className="group relative overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white h-96 shadow-sm hover:shadow-xl hover:border-[#C5A059] transition-all duration-300 flex flex-col justify-end"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url(${cat.imageUrl})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/95 via-[#0A0A0A]/50 to-transparent" />

              <div className="relative p-6 space-y-3 z-10">
                <h3 className="font-serif text-2xl font-bold text-[#FAF8F5] group-hover:text-[#D4AF37] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-[#A8A29E] leading-relaxed">{cat.description}</p>

                {/* Subcategory quick tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cat.subChips.map((chip) => (
                    <span
                      key={chip}
                      className="text-[10px] bg-[#111111]/80 text-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#C5A059]/40"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    href={`/products?category=${cat.slug}`}
                    className="inline-flex items-center gap-1 text-[#C5A059] text-xs font-bold uppercase tracking-wider hover:text-[#D4AF37]"
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

      {/* ── Featured Highlights ───────────────────────────────── */}
      <section className="bg-white py-20 border-y border-[#E7E5E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-[#C5A059] text-xs font-semibold uppercase tracking-widest mb-2">
                Hand-Selected
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-[#111111]">
                Featured Highlights
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#FAF8F5] px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <span>View All Items</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
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
            <div className="text-center py-12 text-[#57534E] text-sm">
              Explore our catalogue to discover our new seasonal drops.
            </div>
          )}
        </div>
      </section>

      {/* ── Why Choose Us ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-[#FAF8F5]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {WHY_CHOOSE_US.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-[#E7E5E4] rounded-2xl p-8 space-y-4 hover:border-[#C5A059] transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#E7E5E4] flex items-center justify-center text-[#C5A059]">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#111111]">{item.title}</h3>
              <p className="text-xs text-[#57534E] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter Privileges Club (Obsidian & Gold Anchor) ── */}
      <section className="border-t border-[#262422] bg-[#111111] py-20 text-[#FAF8F5]">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-[#1C1917] border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#C5A059]">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FAF8F5]">
            Join the NEXUS Privileges Club
          </h2>
          <p className="text-xs sm:text-sm text-[#A8A29E] max-w-xl mx-auto leading-relaxed">
            Subscribe to receive private previews of seasonal drops, complimentary shipping upgrades, and exclusive member discounts.
          </p>
          <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              required
              className="flex-1 bg-[#1C1917] border border-[#333333] focus:border-[#C5A059] rounded-xl px-4 py-3 text-xs text-[#FAF8F5] focus:outline-none placeholder:text-[#78716C]"
            />
            <button
              type="submit"
              disabled={subscribeLoading}
              className="bg-[#C5A059] hover:bg-[#B08D46] text-[#111111] font-bold text-xs px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {subscribeLoading ? 'Subscribing...' : 'Join Club'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
