'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Heart,
  Search,
  User,
  Menu,
  X,
  LogOut,
  Package,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Headphones,
  ShieldCheck,
  TrendingUp,
  MapPin,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import api from '@/lib/api'

// Mega-Menu Category Definitions (SHEIN / AJIO / Flipkart style)
export const MEGA_MENU_CATEGORIES = [
  {
    name: 'Men',
    slug: 'men',
    highlight: 'New Season',
    spotlight: {
      tag: 'The Sartorial Edit',
      title: "Men's Luxury Sartorial",
      subtitle: 'Californian Supima & French Linen',
      imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&auto=format&fit=crop&q=85',
      href: '/products?category=men',
    },
    columns: [
      {
        title: 'Topwear',
        items: [
          { label: "T-Shirts & Polos", href: '/products?category=men&subCategory=men-t-shirts' },
          { label: 'Casual Shirts', href: '/products?category=men&subCategory=men-shirts' },
          { label: 'Formal Shirts', href: '/products?category=men&search=formal+shirt' },
          { label: 'Hoodies & Sweatshirts', href: '/products?category=men&search=hoodie' },
          { label: 'Jackets & Blazers', href: '/products?category=men&search=jacket' },
        ],
      },
      {
        title: 'Bottomwear',
        items: [
          { label: 'Jeans & Denim', href: '/products?category=men&subCategory=men-denim' },
          { label: 'Casual Trousers & Chinos', href: '/products?category=men&search=chino' },
          { label: 'Joggers & Cargo Pants', href: '/products?category=men&search=cargo' },
          { label: 'Shorts & Bermuda', href: '/products?category=men&subCategory=men-shorts' },
        ],
      },
      {
        title: 'Footwear',
        items: [
          { label: 'Luxury Sneakers', href: '/products?category=men&subCategory=men-footwear' },
          { label: 'Formal Shoes', href: '/products?category=men&search=formal+shoes' },
          { label: 'Loafers & Moccasins', href: '/products?category=men&search=loafers' },
          { label: 'Slides & Sandals', href: '/products?category=men&search=slides' },
        ],
      },
      {
        title: 'Active & Innerwear',
        items: [
          { label: 'Performance Activewear', href: '/products?category=men&subCategory=men-activewear' },
          { label: 'Boxer Briefs & Trunks', href: '/products?category=men&subCategory=men-innerwear' },
          { label: 'Loungewear & Pyjamas', href: '/products?category=men&search=loungewear' },
        ],
      },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    highlight: 'Trending',
    spotlight: {
      tag: 'Spring Couture',
      title: "Women's Haute Edit",
      subtitle: 'Mulberry Silk & Lucknowi Chikankari',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=85',
      href: '/products?category=women',
    },
    columns: [
      {
        title: 'Western Wear',
        items: [
          { label: 'Dresses & Gowns', href: '/products?category=women&subCategory=women-dresses' },
          { label: 'Tops, Tees & Blouses', href: '/products?category=women&subCategory=women-tops' },
          { label: 'Jeans & Jeggings', href: '/products?category=women&subCategory=women-denim' },
          { label: 'Trousers & Skirts', href: '/products?category=women&search=skirt' },
        ],
      },
      {
        title: 'Ethnic & Fusion',
        items: [
          { label: 'Chanderi Kurta Sets', href: '/products?category=women&subCategory=women-ethnic' },
          { label: 'Chikankari Tunics', href: '/products?category=women&search=chikankari' },
          { label: 'Designer Sarees', href: '/products?category=women&search=saree' },
          { label: 'Dupattas & Stoles', href: '/products?category=women&search=dupatta' },
        ],
      },
      {
        title: 'Footwear & Bags',
        items: [
          { label: 'Stiletto & Block Heels', href: '/products?category=women&subCategory=women-footwear' },
          { label: 'Ballet Flats', href: '/products?category=women&search=flats' },
          { label: 'Leather Handbags', href: '/products?category=women&subCategory=women-handbags' },
          { label: 'Evening Clutches', href: '/products?category=women&search=clutch' },
        ],
      },
    ],
  },
  {
    name: 'Kids',
    slug: 'kids',
    spotlight: {
      tag: 'Designer Junior',
      title: 'Kids Luxury Wardrobe',
      subtitle: '100% Organic Pima Cotton & Tulle',
      imageUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=85',
      href: '/products?category=kids',
    },
    columns: [
      {
        title: 'Boys (2–14Y)',
        items: [
          { label: 'T-Shirts & Polos', href: '/products?category=kids&subCategory=kids-boys' },
          { label: 'Shirts & Denim', href: '/products?category=kids&search=boys+denim' },
          { label: 'Shorts & Sets', href: '/products?category=kids&search=boys+shorts' },
        ],
      },
      {
        title: 'Girls (2–14Y)',
        items: [
          { label: 'Dresses & Frocks', href: '/products?category=kids&subCategory=kids-girls' },
          { label: 'Tops & Skirts', href: '/products?category=kids&search=girls+tops' },
          { label: 'Ethnic Sets', href: '/products?category=kids&search=girls+ethnic' },
        ],
      },
      {
        title: 'Footwear & Baby',
        items: [
          { label: 'Kids Sneakers', href: '/products?category=kids&subCategory=kids-footwear' },
          { label: 'Infant Rompers', href: '/products?category=kids&search=romper' },
        ],
      },
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    spotlight: {
      tag: 'Artisan Craft',
      title: 'Handcrafted Footwear',
      subtitle: 'Italian Calfskin & Stiletto Pumps',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=85',
      href: '/products?category=footwear',
    },
    columns: [
      {
        title: 'Men’s Footwear',
        items: [
          { label: 'Italian Leather Sneakers', href: '/products?category=men&subCategory=men-footwear' },
          { label: 'Penny Loafers', href: '/products?category=men&subCategory=men-footwear&search=loafers' },
          { label: 'All Men’s Shoes', href: '/products?category=men&subCategory=men-footwear' },
        ],
      },
      {
        title: 'Women’s Footwear',
        items: [
          { label: 'Designer Stiletto Heels', href: '/products?category=women&subCategory=women-footwear' },
          { label: 'Comfort Ballet Flats', href: '/products?category=women&subCategory=women-footwear&search=flats' },
          { label: 'All Women’s Shoes', href: '/products?category=women&subCategory=women-footwear' },
        ],
      },
      {
        title: 'Full Footwear Catalog',
        items: [
          { label: 'Court Retro Sneakers', href: '/products?category=footwear' },
          { label: 'Kids Sneakers', href: '/products?category=kids&subCategory=kids-footwear' },
          { label: 'All Footwear', href: '/products?category=footwear' },
        ],
      },
    ],
  },
  {
    name: 'Watches',
    slug: 'watches',
    spotlight: {
      tag: 'Master Horology',
      title: 'Precision Timepieces',
      subtitle: 'Swiss Tourbillon & Chronographs',
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=85',
      href: '/products?category=watches',
    },
    columns: [
      {
        title: 'Horology Collections',
        items: [
          { label: 'Automatic Chronographs', href: '/products?category=watches' },
          { label: 'Grand Tourbillon Editions', href: '/products?category=watches&search=tourbillon' },
          { label: 'Minimalist Dress Timepieces', href: '/products?category=watches&search=minimalist' },
        ],
      },
      {
        title: 'Styles & Movements',
        items: [
          { label: 'Swiss Automatic Movements', href: '/products?category=watches' },
          { label: 'Classic Dress Watches', href: '/products?category=watches&search=classic' },
          { label: 'Rose Gold & Steel Editions', href: '/products?category=watches' },
        ],
      },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    spotlight: {
      tag: 'Signature Accents',
      title: 'Fine Living Accents',
      subtitle: 'Florentine Leather & 18k Solid Gold',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=85',
      href: '/products?category=accessories',
    },
    columns: [
      {
        title: 'Leather & Travel',
        items: [
          { label: 'Italian Leather Briefcases', href: '/products?category=accessories&search=briefcase' },
          { label: 'Designer Wallets & Belts', href: '/products?category=accessories&search=wallet' },
        ],
      },
      {
        title: 'Fragrances & Jewels',
        items: [
          { label: 'Haute Fragrances & Oud', href: '/products?category=fragrances' },
          { label: 'Fine 18k Solid Gold Jewelry', href: '/products?category=jewelry' },
        ],
      },
    ],
  },
  {
    name: 'Offers & Sale',
    slug: 'sale',
    highlight: 'Save up to 40%',
    spotlight: {
      tag: 'Exclusive Privilege',
      title: 'The Private Vault',
      subtitle: 'Curated Deals with Code NEXUS10',
      imageUrl: 'https://images.unsplash.com/photo-1513094735237-8f2714d57c13?w=800&auto=format&fit=crop&q=85',
      href: '/products',
    },
    columns: [
      {
        title: 'Curated Deals',
        items: [
          { label: 'Flash Deals Under ₹2,999', href: '/products?maxPrice=2999' },
          { label: 'Bestselling Vault', href: '/products?sort=popular' },
          { label: 'Luxury Specials with Code NEXUS10', href: '/products' },
        ],
      },
      {
        title: 'Discount Tiers',
        items: [
          { label: '50% Off & Above', href: '/products?minDiscount=50' },
          { label: '30% Off & Above', href: '/products?minDiscount=30' },
          { label: '20% Off & Above', href: '/products?minDiscount=20' },
        ],
      },
    ],
  },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [activeMegaMenu, setActiveMegaMenu] = React.useState<string | null>(null)
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (catName: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setActiveMegaMenu(catName)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null)
    }, 280)
  }

  // Live Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchFocused, setSearchFocused] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<{ products: any[]; categories: any[] }>({
    products: [],
    categories: [],
  })
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false)
  const searchContainerRef = React.useRef<HTMLDivElement>(null)

  // Mobile Accordion state
  const [mobileExpandedCat, setMobileExpandedCat] = React.useState<string | null>(null)

  const { isAuthenticated, user, logout } = useAuthStore()
  const { cart, setOpen: setCartOpen } = useCartStore()
  const { items: wishlistItems } = useWishlistStore()
  const { open: openAuthModal } = useAuthModalStore()

  // Clean up hover timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Track scroll and close mega menu on scroll
  React.useEffect(() => {
    const handler = () => {
      setIsScrolled(window.scrollY > 15)
      if (activeMegaMenu) {
        setActiveMegaMenu(null)
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [activeMegaMenu])

  // Close mega menu on route change
  React.useEffect(() => {
    setActiveMegaMenu(null)
  }, [pathname])

  // Close mega menu on outside click
  React.useEffect(() => {
    if (!activeMegaMenu) return
    const handleDocClick = (e: MouseEvent) => {
      const headerEl = document.querySelector('header')
      if (headerEl && !headerEl.contains(e.target as Node)) {
        setActiveMegaMenu(null)
      }
    }
    document.addEventListener('click', handleDocClick)
    return () => document.removeEventListener('click', handleDocClick)
  }, [activeMegaMenu])

  // Close search suggestions on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search suggestions
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions({ products: [], categories: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const { data } = await api.get('/api/products/search-suggestions', {
          params: { q: searchQuery.trim() },
        })
        setSuggestions(data || { products: [], categories: [] })
      } catch {
        setSuggestions({ products: [], categories: [] })
      } finally {
        setLoadingSuggestions(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`)
    } else {
      router.push('/products')
    }
    setSearchFocused(false)
  }

  const handleLogout = () => {
    logout()
    useCartStore.getState().clearCart()
    useWishlistStore.getState().clearWishlist()
    router.push('/')
  }

  const cartCount =
    cart?.itemCount ??
    (cart as any)?.totalItems ??
    cart?.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) ??
    0
  const wishlistCount = wishlistItems.length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* ── Top Privileges Banner ── */}
      <div className="bg-[#111111] border-b border-[#2A2820] py-1.5 px-4 text-[11px] text-[#FAF8F5] hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#FAF8F5] font-medium">
              <Sparkles className="w-3 h-3 text-[#C5A059]" />
              Complimentary White-Glove Doorstep Delivery on orders ₹5,000+
            </span>
            <span className="text-[#57534E]">|</span>
            <span>Use code <strong className="text-[#C5A059] font-mono font-bold tracking-wider">NEXUS10</strong> for 10% instant off</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/account" className="text-[#FAF8F5] hover:text-[#C5A059] transition-colors flex items-center gap-1.5">
              <Headphones className="w-3 h-3 text-[#C5A059]" />
              24/7 VIP Concierge: 1800-890-6398
            </Link>
            <span className="text-[#57534E]">|</span>
            <span className="flex items-center gap-1 text-xs text-[#FAF8F5]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              100% Certified Authentic
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <div
        className={cn(
          'transition-all duration-300',
          isScrolled
            ? 'bg-[#FFFFFF]/98 backdrop-blur-md border-b border-[#E7E5E4] shadow-md shadow-black/5'
            : 'bg-[#FFFFFF] border-b border-[#E7E5E4]',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4 sm:gap-8">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center text-[#57534E] hover:text-[#111111]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#C5A059] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-wider text-[#111111] group-hover:text-[#C5A059] transition-colors">
                NEXUS
              </span>
            </Link>

            {/* ── Center Prominent Search Bar (Flipkart / AJIO style) ── */}
            <div ref={searchContainerRef} className="flex-1 max-w-xl relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search for T-shirts, Denim, Sneakers, Watches, Perfumes..."
                    className="w-full bg-[#FAF8F5] hover:bg-[#FFFFFF] border border-[#E7E5E4] focus:border-[#C5A059] rounded-full pl-11 pr-28 py-2.5 text-xs text-[#111111] placeholder:text-[#78716C] focus:outline-none transition-all shadow-inner"
                  />
                  <Search className="w-4 h-4 text-[#78716C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-24 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#111111] p-1 transition-colors"
                      aria-label="Clear search query"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#111111] hover:bg-[#C5A059] active:scale-95 text-[#FFFFFF] hover:text-[#111111] px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Search className="w-3 h-3 text-current" />
                  <span>Search</span>
                </button>
              </form>

              {/* Autocomplete Dropdown */}
              {searchFocused && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#FFFFFF] border border-[#E7E5E4] rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in">
                  {/* Category matches */}
                  {suggestions.categories.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-beige-muted block mb-1.5">
                        Suggested Categories
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.categories.map((c) => (
                          <Link
                            key={c.id}
                            href={`/products?category=${c.slug}`}
                            onClick={() => setSearchFocused(false)}
                            className="text-xs bg-surface-2 hover:bg-gold/15 text-beige hover:text-gold px-3 py-1 rounded-full border border-border transition-colors flex items-center gap-1.5"
                          >
                            <span>{c.name}</span>
                            <ChevronRight className="w-3 h-3 text-gold/60" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching products */}
                  {suggestions.products.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-beige-muted block mb-1.5">
                        Matching Items
                      </span>
                      <div className="space-y-1">
                        {suggestions.products.map((p) => (
                          <Link
                            key={p.id}
                            href={`/products/${p.slug}`}
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group"
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-2 border border-border flex-shrink-0">
                              {p.primaryImageUrl ? (
                                <Image
                                  src={p.primaryImageUrl}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-beige-muted">
                                  No Img
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-beige font-medium truncate group-hover:text-gold transition-colors">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-beige-muted">{p.categoryName}</p>
                            </div>
                            <span className="text-xs font-semibold text-gold font-mono">
                              {formatCurrency(p.price)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state / Popular Trending Tags */}
                  {suggestions.products.length === 0 && !loadingSuggestions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-[11px] text-gold font-medium">
                        <TrendingUp className="w-3.5 h-3.5 text-gold" />
                        <span>Trending Searches:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Men Clothes', 'Women Dresses', 'Kids Apparel', 'Supima T-Shirts', 'Selvedge Denim', 'Italian Sneakers', 'Stiletto Heels', 'Chanderi Kurta'].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSearchQuery(tag)
                              router.push(`/products?search=${encodeURIComponent(tag)}`)
                              setSearchFocused(false)
                            }}
                            className="text-[11px] bg-surface-2 hover:bg-gold/15 text-beige-muted hover:text-gold px-2.5 py-1 rounded-lg border border-border transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Action Buttons (Wishlist, Cart, Account) ── */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[#57534E] hover:text-[#111111] hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#E7E5E4]"
                aria-label="Wishlist"
              >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#FEF2F2] text-[#991B1B] text-[10px] font-bold flex items-center justify-center px-1 shadow-sm border border-[#FECACA]">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Drawer Trigger */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[#57534E] hover:text-[#111111] hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#E7E5E4]"
                aria-label="Bag"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#111111] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              {isAuthenticated && user ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-[#E7E5E4] hover:border-[#C5A059]/40 transition-colors text-xs text-[#57534E] hover:text-[#111111] bg-[#FAF8F5]">
                      <div className="w-6 h-6 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center">
                        <span className="text-[#C5A059] text-[11px] font-bold">
                          {user.firstName[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:block max-w-[80px] truncate">{user.firstName}</span>
                      <ChevronDown className="w-3 h-3 text-[#78716C]" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[200px] bg-[#FFFFFF] border border-[#E7E5E4] rounded-xl shadow-2xl p-1.5 z-50 text-[#111111]"
                      sideOffset={8}
                      align="end"
                    >
                      <div className="px-3 py-2 border-b border-[#E7E5E4] mb-1">
                        <p className="text-[11px] text-[#78716C]">Signed in as</p>
                        <p className="text-xs font-semibold text-[#111111] truncate">{user.email}</p>
                      </div>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#57534E] hover:text-[#111111] hover:bg-[#FAF8F5] rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-[#C5A059]" />
                          Account & Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#57534E] hover:text-[#111111] hover:bg-[#FAF8F5] rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <Package className="w-3.5 h-3.5 text-[#C5A059]" />
                          My Orders
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#57534E] hover:text-[#111111] hover:bg-[#FAF8F5] rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <Headphones className="w-3.5 h-3.5 text-[#C5A059]" />
                          24/7 VIP Concierge
                        </Link>
                      </DropdownMenu.Item>
                      {user.role === 'admin' && (
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/admin"
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#C5A059] hover:bg-[#C5A059]/10 rounded-lg cursor-pointer outline-none transition-colors font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Admin Control Center
                          </Link>
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Separator className="my-1 h-px bg-[#E7E5E4]" />
                      <DropdownMenu.Item
                        onSelect={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#991B1B] hover:bg-[#FEF2F2] rounded-lg cursor-pointer outline-none transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#111111] hover:bg-[#C5A059] text-xs font-semibold text-[#FFFFFF] hover:text-[#111111] transition-all shadow-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Category Mega-Menu Row (Desktop) ── */}
        <div
          className="hidden lg:block border-t border-[#E7E5E4] border-b border-[#E7E5E4] bg-[#FAF8F5] relative z-40"
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current)
              hoverTimeoutRef.current = null
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {MEGA_MENU_CATEGORIES.map((cat) => {
                  const isActive = activeMegaMenu === cat.name
                  return (
                    <div
                      key={cat.name}
                      onMouseEnter={() => handleMouseEnter(cat.name)}
                      className="relative"
                    >
                      <Link
                        href={`/products?category=${cat.slug}`}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-3 text-xs uppercase tracking-wider font-semibold transition-all duration-200 border-b-2',
                          isActive
                            ? 'text-[#C5A059] border-[#C5A059] bg-[#C5A059]/10'
                            : 'text-[#111111] hover:text-[#C5A059] border-transparent hover:bg-[#FFFFFF]',
                        )}
                      >
                        <span>{cat.name}</span>
                        {cat.highlight && (
                          <span
                            className={cn(
                              'text-[9px] font-mono px-2 py-0.5 rounded-full font-medium',
                              cat.slug === 'sale'
                                ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-bold'
                                : 'bg-[#111111] text-[#FAF8F5]'
                            )}
                          >
                            {cat.highlight}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform duration-200 text-[#78716C]',
                            isActive && 'rotate-180 text-[#C5A059]',
                          )}
                        />
                      </Link>
                    </div>
                  )
                })}
              </div>

              {/* Quick Catalog Access */}
              <Link
                href="/products"
                className="text-xs font-semibold text-[#111111] hover:text-[#C5A059] transition-colors flex items-center gap-1 uppercase tracking-wider py-3"
              >
                <span>Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
              </Link>
            </nav>
          </div>

          {/* ── UNIFIED FULL-WIDTH SOLID MEGA-MENU DRAWER ── */}
          {(() => {
            const activeCategory = MEGA_MENU_CATEGORIES.find((c) => c.name === activeMegaMenu)
            if (!activeCategory) return null

            return (
              <div
                className="absolute top-full left-0 right-0 z-50 animate-fade-in"
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current)
                    hoverTimeoutRef.current = null
                  }
                }}
                onMouseLeave={handleMouseLeave}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="bg-[#FFFFFF] border border-[#E7E5E4] border-t-2 border-t-[#C5A059] rounded-b-2xl shadow-[0_25px_60px_rgba(0,0,0,0.12)] p-7 grid grid-cols-12 gap-8">
                    {/* Category Link Columns */}
                    <div
                      className={cn(
                        'grid gap-6',
                        activeCategory.columns.length === 4
                          ? 'col-span-12 lg:col-span-8 sm:grid-cols-4'
                          : activeCategory.columns.length === 3
                          ? 'col-span-12 lg:col-span-8 sm:grid-cols-3'
                          : 'col-span-12 lg:col-span-8 sm:grid-cols-2',
                      )}
                    >
                      {activeCategory.columns.map((col, cIdx) => (
                        <div key={cIdx} className="space-y-3">
                          <h4 className="text-xs font-bold text-[#C5A059] uppercase tracking-wider font-mono border-b border-[#E7E5E4] pb-1.5 flex items-center justify-between">
                            <span>{col.title}</span>
                          </h4>
                          <ul className="space-y-2">
                            {col.items.map((item, iIdx) => (
                              <li key={iIdx}>
                                <Link
                                  href={item.href}
                                  onClick={() => setActiveMegaMenu(null)}
                                  className="text-xs text-[#57534E] hover:text-[#111111] hover:translate-x-1.5 transition-all block py-0.5 font-medium"
                                >
                                  {item.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Editorial Spotlight Card (Col 9-12) */}
                    {activeCategory.spotlight && (
                      <div className="col-span-12 lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border/80 pt-4 lg:pt-0 lg:pl-8 flex flex-col justify-between">
                        <Link
                          href={activeCategory.spotlight.href}
                          onClick={() => setActiveMegaMenu(null)}
                          className="group block relative rounded-xl overflow-hidden border border-border hover:border-gold/60 transition-all shadow-xl h-full flex flex-col justify-end p-5 min-h-[220px]"
                        >
                          <Image
                            src={activeCategory.spotlight.imageUrl}
                            alt={activeCategory.spotlight.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 1280px) 300px, 400px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                          <div className="relative z-10 space-y-1.5">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#C5A059] font-mono text-[10px] font-bold uppercase tracking-wider">
                              {activeCategory.spotlight.tag}
                            </span>
                            <h5 className="font-serif text-lg font-bold text-[#FAF8F5] group-hover:text-[#D4AF37] transition-colors leading-snug">
                              {activeCategory.spotlight.title}
                            </h5>
                            <p className="text-xs text-[#A8A29E] line-clamp-1">
                              {activeCategory.spotlight.subtitle}
                            </p>
                            <div className="pt-2 text-xs font-semibold text-[#C5A059] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>Explore Collection</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Mobile Search Bar Strip (Visible on mobile screens) ── */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, sneakers..."
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-8 py-2 text-xs text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
              />
              <Search className="w-3.5 h-3.5 text-beige-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-beige-muted hover:text-beige p-0.5"
                  aria-label="Clear query"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="ml-2 bg-gold active:scale-95 text-background px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-transform flex-shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-background" />
              <span>Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── Mobile Side Navigation Drawer (AJIO / SHEIN style) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-surface border-r border-border p-6 overflow-y-auto space-y-6 shadow-2xl">
            {/* Header in Drawer */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold" />
                <span className="font-serif text-xl font-bold gold-text-gradient">NEXUS</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Quick Status */}
            <div className="bg-surface-2 rounded-xl p-3 border border-border">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-beige">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-beige-muted">{user.email}</p>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="text-xs text-gold font-semibold underline"
                  >
                    View
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-beige-muted">Welcome to NEXUS</span>
                  <button
                    onClick={() => {
                      setMobileOpen(false)
                      openAuthModal('login')
                    }}
                    className="text-xs bg-gold text-background px-3 py-1 rounded-lg font-semibold"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>

            {/* Hierarchical Categories Accordion */}
            <div className="space-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-beige-muted px-2 mb-2">
                Shop Collections
              </h3>
              {MEGA_MENU_CATEGORIES.map((cat) => {
                const isExpanded = mobileExpandedCat === cat.name
                return (
                  <div key={cat.name} className="border border-border/60 rounded-xl overflow-hidden mb-1.5">
                    <button
                      type="button"
                      onClick={() => setMobileExpandedCat(isExpanded ? null : cat.name)}
                      className="w-full flex items-center justify-between p-3 text-xs font-semibold text-beige hover:bg-surface-2 transition-colors"
                    >
                      <span>{cat.name}</span>
                      <ChevronDown
                        className={cn('w-3.5 h-3.5 text-gold transition-transform', isExpanded && 'rotate-180')}
                      />
                    </button>
                    {isExpanded && (
                      <div className="bg-surface-2/60 p-3 border-t border-border/60 space-y-3">
                        <Link
                          href={`/products?category=${cat.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="text-xs font-bold text-gold flex items-center justify-between py-2 px-2.5 bg-gold/10 hover:bg-gold/20 rounded-lg transition-colors border border-gold/30"
                        >
                          <span>Explore Full {cat.name} Collection</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {cat.columns.map((col, idx) => (
                          <div key={idx} className="space-y-1">
                            <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">
                              {col.title}
                            </span>
                            <div className="space-y-1 pl-1">
                              {col.items.map((item, itemIdx) => (
                                <Link
                                  key={itemIdx}
                                  href={item.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="text-xs text-beige-muted hover:text-beige block py-1"
                                >
                                  {item.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Quick Navigation Links */}
            <div className="border-t border-border pt-4 space-y-2">
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 text-xs text-beige-muted hover:text-beige py-1.5"
              >
                <Package className="w-4 h-4 text-gold" />
                <span>My Orders & Live Tracking</span>
              </Link>
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 text-xs text-beige-muted hover:text-beige py-1.5"
              >
                <Headphones className="w-4 h-4 text-gold" />
                <span>24/7 VIP Concierge Helpline</span>
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 text-xs text-beige-muted hover:text-beige py-1.5"
              >
                <Heart className="w-4 h-4 text-gold" />
                <span>Saved Wishlist ({wishlistCount})</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* ── Background Scrim Overlay (dims page underneath when mega-menu is active) ── */}
      {activeMegaMenu && (
        <div
          className="fixed inset-0 top-full bg-black/75 backdrop-blur-sm z-30 transition-opacity duration-300 pointer-events-none"
        />
      )}
    </header>
  )
}
