'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Truck, ShieldCheck, RefreshCw, Star, Mail, Sparkles, ChevronRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'
import type { ProductListItem } from '@/types'
import api from '@/lib/api'
import { fetchWithCatalogCache, peekCatalogCache, prefetchCatalogEndpoint } from '@/lib/catalogCache'
import { useRecentlyViewedStore } from '@/store/recentlyViewed'
import toast from 'react-hot-toast'

// Quick Category Circles (Unbranded Curated Atelier Edit)
const CATEGORY_CIRCLES = [
  {
    name: 'Men',
    href: '/products?category=men',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1150f4e060977b4cb76b4a94ec53cf04.webp?v=1724415898&width=400',
    tag: 'New',
  },
  {
    name: 'Women',
    href: '/products?category=women',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_2673174c-f193-4299-8b1f-35f25eefe3cd.jpg?v=1795417011&width=400',
    tag: 'Trending',
  },
  {
    name: 'Kids',
    href: '/products?category=kids',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301071502MAROON_1.jpg?v=1795606894&width=400',
  },
  {
    name: 'Footwear',
    href: '/products?category=footwear',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301084439CHAMPAGNE_1.jpg?v=1793785136&width=400',
  },
  {
    name: 'Dresses',
    href: '/products?category=women&subCategory=women-dresses',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1695/7273/files/FF-8065_Ai_Catalog_1.jpg?v=1789718396&width=400',
  },
  {
    name: 'T-Shirts',
    href: '/products?category=men&subCategory=men-t-shirts',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0420/7073/7058/files/2c80f44c87a00e45bc01c4ac4139a13e.jpg?v=1736325660&width=400',
  },
  {
    name: 'Denim',
    href: '/products?category=men&subCategory=men-denim',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0420/7073/7058/files/4MCRD0011-01_2_35286081-88dd-49fd-91ce-59127d5a018c.jpg?v=1750149271&width=400',
  },
  {
    name: 'Co-ord Sets',
    href: '/products?category=men&subCategory=mens-co-ord-sets',
    imageUrl: 'https://assets.sheinindia.in/medias/shein_sys_master/root1/20260908/r8mR/6a9f841ba2cabf7bc64c979d/shein_cream_shein_men_vacay_mandarin_collar_textured_shirt_%26_short_sets.jpg',
    tag: 'Popular',
  },
  {
    name: 'Ethnic',
    href: '/products?category=women&subCategory=women-ethnic',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301092471INDIGO_1.jpg?v=1795588927&width=400',
  },
  {
    name: 'Handbags',
    href: '/products?category=women&subCategory=women-handbags',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0266/6276/4597/files/301088969001_1_1.jpg?v=1795611834&width=400',
  },
  {
    name: 'Fragrances',
    href: '/products?category=fragrances',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0266/6276/4597/files/300968674001_b064f5c4-63b5-4724-a07f-f9b9f514c7c1.jpg?v=1789020636&width=400',
  },
  {
    name: 'Jewelry',
    href: '/products?category=jewelry',
    imageUrl: 'https://assets.sheinindia.in/medias/shein_sys_master/root1/20261117/xhpE/6afc9189018d001d47a33d35/shein_gold_shein_women_toggle_clasp_butterfly_charm_beaded_pendant.jpg',
  },
]

const FEATURED_COLLECTIONS = [
  {
    name: "Men's Modern Edit",
    slug: 'men',
    description: 'Linen Slim-Fit Shirts, Knitted Polos, Relaxed Denim, Co-ord Sets & Leather Chelsea Boots',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0420/7073/7058/files/1_320dfa4f-6263-4d25-9a58-8e427f6d11fa.jpg?v=1795612551&width=1000',
    subChips: ['Linen Shirts', 'Knitted Polos', 'Baggy Denim', 'Co-ord Sets', 'Chelsea Boots'],
  },
  {
    name: "Women's Couturier",
    slug: 'women',
    description: 'Modal Satin Maxi Dresses, Poplin Shirts, Embroidered Kurtas, Wide-Leg Trousers & Heels',
    imageUrl: 'https://cdn.shopify.com/s/files/1/1695/7273/files/MAIN_9aa8338b-0e62-4375-a003-1b50d4037387.jpg?v=1795417048&width=1000',
    subChips: ['Satin Maxis', 'Poplin Blouses', 'Ethnic Kurtas', 'Block Heels'],
  },
  {
    name: 'Bags, Jewels & Perfumes',
    slug: 'accessories',
    description: 'Signature Eau De Parfums, Suede Everyday Totes, Fine Crystal Jewelry & UV400 Eyewear',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0266/6276/4597/files/300943554001_4c8b67f8-f202-49f3-b55d-4915ef136a2d.jpg?v=1778150044&width=1000',
    subChips: ['Fine Perfumes', 'Suede Totes', 'Crystal Pendants', 'UV400 Sunglasses'],
  },
]

const WHY_CHOOSE_US = [
  {
    icon: Truck,
    title: 'Free Delivery ₹999+ & 1st Order',
    description: 'Enjoy complimentary doorstep delivery on your very first order and on every order ₹999+ (just ₹99 below ₹999).',
  },
  {
    icon: ShieldCheck,
    title: '100% Certified Authenticity',
    description: 'Every luxury item is certified and serialized with guaranteed craftsmanship.',
  },
  {
    icon: RefreshCw,
    title: 'Hassle-Free 7-Day Returns',
    description: 'Complimentary doorstep return pickups within 7 days of delivery and fast refund settlement.',
  },
]

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = React.useState<ProductListItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [email, setEmail] = React.useState('')
  const [subscribeLoading, setSubscribeLoading] = React.useState(false)
  const { items: recentlyViewed } = useRecentlyViewedStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    let active = true
    const cacheKey = '/api/products/featured'

    const fetchFeatured = async () => {
      const hit = peekCatalogCache<ProductListItem[]>(cacheKey)
      if (hit?.data && active) {
        setFeaturedProducts(hit.data)
        setIsLoading(false)
        if (hit.isFresh) {
          prefetchCatalogEndpoint('/api/products', { sortBy: 'relevant', page: 1, pageSize: 24 })
          return
        }
      }

      try {
        const items = await fetchWithCatalogCache<ProductListItem[]>(cacheKey, async () => {
          const res = await api.get<any>('/api/products/featured')
          return Array.isArray(res.data) ? res.data : (res.data.items ?? res.data.data ?? [])
        })
        if (active) setFeaturedProducts(items)
      } catch {
        if (active && !hit?.data) setFeaturedProducts([])
      } finally {
        if (active) setIsLoading(false)
        prefetchCatalogEndpoint('/api/products', { sortBy: 'relevant', page: 1, pageSize: 24 })
      }
    }
    fetchFeatured()
    return () => {
      active = false
    }
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
      {/* ── Category Quick Circles Strip (No Scrollbar) ── */}
      <section className="bg-[#FAF8F5] border-b border-[#E7E5E4] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 lg:gap-3 xl:gap-4">
            {CATEGORY_CIRCLES.map((c) => (
              <Link
                key={c.name}
                href={c.href}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] xl:w-[74px] xl:h-[74px] rounded-full p-0.5 border-2 border-[#E7E5E4] group-hover:border-[#C5A059] transition-all duration-300 shadow-sm group-hover:shadow-md">
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

            {/* View All Categories Circle */}
            <Link
              href="/products"
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] xl:w-[74px] xl:h-[74px] rounded-full p-0.5 border-2 border-[#C5A059]/60 group-hover:border-[#C5A059] transition-all duration-300 shadow-sm group-hover:shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-[#111111] flex items-center justify-center group-hover:bg-[#1C1917] transition-colors">
                  <LayoutGrid className="w-6 h-6 sm:w-7 sm:h-7 text-[#D4AF37] group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="absolute -top-1 -right-1 bg-[#C5A059] text-[#111111] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow">
                  All
                </span>
              </div>
              <span className="text-xs font-semibold text-[#111111] group-hover:text-[#C5A059] transition-colors">
                View All
              </span>
            </Link>
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
            From Supima cotton tees and relaxed linen shirts to tailored evening dresses and signature scents.
            Shop authentic fashion curated for modern living.
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
              { value: '100%', label: 'Quality Checked' },
              { value: '₹999+', label: 'Free Delivery' },
              { value: '7-Day', label: 'Doorstep Returns' },
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-[#C5A059] text-xs font-semibold uppercase tracking-widest mb-2">
              The Atelier
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-[#111111]">
              Curated Collections
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 border border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-[#FAF8F5] px-4 py-2 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span>View All Items</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURED_COLLECTIONS.map((cat) => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
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
                  <span className="inline-flex items-center gap-1 text-[#C5A059] text-xs font-bold uppercase tracking-wider group-hover:text-[#D4AF37]">
                    <span>Explore Department</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
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
            <ProductGridSkeleton
              count={4}
              label="Loading handpicked signature pieces..."
              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product, idx) => (
                <ProductCard key={product.id} product={product} priority={idx < 4} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#57534E] text-sm">
              Explore our catalogue to discover our new seasonal drops.
            </div>
          )}
        </div>
      </section>

      {/* ── Recently Viewed ───────────────────────────────────── */}
      {mounted &&
        recentlyViewed.filter((p) => !p.slug.startsWith('nexus-') && p.slug !== 'polo-t-shirt').length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-[#FAF8F5] border-t border-[#E7E5E4]">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[#C5A059] text-xs font-semibold uppercase tracking-widest mb-2">
                Continue Exploring
              </p>
              <h2 className="font-serif text-2xl md:text-4xl font-bold text-[#111111]">
                Recently Viewed
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-[#C5A059] hover:underline flex items-center gap-1"
            >
              <span>Browse Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentlyViewed
              .filter((p) => !p.slug.startsWith('nexus-') && p.slug !== 'polo-t-shirt')
              .slice(0, 4)
              .map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
          </div>
        </section>
      )}

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
