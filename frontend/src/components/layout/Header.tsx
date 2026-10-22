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
    columns: [
      {
        title: 'Men’s Footwear',
        items: [
          { label: 'Italian Leather Sneakers', href: '/products?category=men-footwear' },
          { label: 'Formal Oxford & Derby', href: '/products?category=footwear&search=formal' },
          { label: 'Penny Loafers', href: '/products?category=footwear&search=loafers' },
        ],
      },
      {
        title: 'Women’s Footwear',
        items: [
          { label: 'Designer Heels', href: '/products?category=women-footwear' },
          { label: 'Comfort Ballet Flats', href: '/products?category=women-footwear&search=flats' },
          { label: 'White Chic Sneakers', href: '/products?category=women-footwear&search=sneakers' },
        ],
      },
    ],
  },
  {
    name: 'Watches',
    slug: 'watches',
    columns: [
      {
        title: 'Horology Collections',
        items: [
          { label: 'Automatic Chronographs', href: '/products?category=watches' },
          { label: 'Grand Tourbillon Editions', href: '/products?category=watches&search=tourbillon' },
          { label: 'Minimalist Dress Timepieces', href: '/products?category=watches&search=minimalist' },
        ],
      },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    columns: [
      {
        title: 'Leather & Accents',
        items: [
          { label: 'Italian Leather Briefcases', href: '/products?category=accessories&search=briefcase' },
          { label: 'Designer Wallets & Belts', href: '/products?category=accessories&search=wallet' },
          { label: 'Haute Fragrances & Oud', href: '/products?category=fragrances' },
          { label: 'Fine 18k Solid Jewelry', href: '/products?category=jewelry' },
        ],
      },
    ],
  },
  {
    name: 'Offers & Sale',
    slug: 'sale',
    highlight: 'Save up to 40%',
    columns: [
      {
        title: 'Curated Deals',
        items: [
          { label: 'Flash Deals Under ₹2,999', href: '/products?maxPrice=2999' },
          { label: 'Bestselling Vault', href: '/products?sort=popular' },
          { label: 'Luxury Specials with Code NEXUS10', href: '/products' },
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

  // Track scroll
  React.useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 15)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchFocused(false)
    }
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
      <div className="bg-[#0f0e0c] border-b border-border/60 py-1.5 px-4 text-[11px] text-beige-muted hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gold font-medium">
              <Sparkles className="w-3 h-3 text-gold" />
              Complimentary White-Glove Doorstep Delivery on orders ₹5,000+
            </span>
            <span className="text-border">|</span>
            <span>Use code <strong className="text-gold font-mono">NEXUS10</strong> for 10% instant off</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/account" className="hover:text-gold transition-colors flex items-center gap-1">
              <Headphones className="w-3 h-3 text-gold" />
              24/7 VIP Concierge: 1800-890-6398
            </Link>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
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
            ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-lg shadow-black/30'
            : 'bg-background/90 backdrop-blur-sm border-b border-border/80',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4 sm:gap-8">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center text-beige-muted hover:text-beige"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold group-hover:rotate-12 transition-transform" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-wider gold-text-gradient">
                NEXUS
              </span>
            </Link>

            {/* ── Center Prominent Search Bar (Flipkart / AJIO style) ── */}
            <div ref={searchContainerRef} className="flex-1 max-w-xl relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search for T-shirts, Denim, Sneakers, Watches, Perfumes..."
                  className="w-full bg-surface-2/80 hover:bg-surface-2 border border-border focus:border-gold rounded-full pl-11 pr-24 py-2.5 text-xs text-beige placeholder:text-beige-muted/50 focus:outline-none transition-all shadow-inner"
                />
                <Search className="w-4 h-4 text-beige-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-gold hover:bg-gold-light text-background px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Autocomplete Dropdown */}
              {searchFocused && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border/90 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fade-in">
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
                        {['Supima T-Shirts', 'Selvedge Denim', 'Italian Sneakers', 'Mulberry Silk Dress', 'Chanderi Kurta', 'Royal Chronograph'].map((tag) => (
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
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors border border-transparent hover:border-border"
                aria-label="Wishlist"
              >
                <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-rose-600 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm shadow-rose-950/60 border border-rose-400/40">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart Drawer Trigger */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors border border-transparent hover:border-border"
                aria-label="Bag"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gold text-background text-[10px] font-bold flex items-center justify-center px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              {isAuthenticated && user ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-border hover:border-gold/40 transition-colors text-xs text-beige-muted hover:text-beige bg-surface/40">
                      <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center">
                        <span className="text-gold text-[11px] font-bold">
                          {user.firstName[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:block max-w-[80px] truncate">{user.firstName}</span>
                      <ChevronDown className="w-3 h-3 text-beige-muted" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="min-w-[200px] bg-surface border border-border rounded-xl shadow-2xl shadow-black/60 p-1.5 z-50"
                      sideOffset={8}
                      align="end"
                    >
                      <div className="px-3 py-2 border-b border-border/80 mb-1">
                        <p className="text-[11px] text-beige-muted">Signed in as</p>
                        <p className="text-xs font-semibold text-beige truncate">{user.email}</p>
                      </div>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-beige-muted hover:text-beige hover:bg-surface-2 rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-gold" />
                          Account & Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-beige-muted hover:text-beige hover:bg-surface-2 rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <Package className="w-3.5 h-3.5 text-gold" />
                          My Orders
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/account"
                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-beige-muted hover:text-beige hover:bg-surface-2 rounded-lg cursor-pointer outline-none transition-colors"
                        >
                          <Headphones className="w-3.5 h-3.5 text-gold" />
                          24/7 VIP Concierge
                        </Link>
                      </DropdownMenu.Item>
                      {user.role === 'admin' && (
                        <DropdownMenu.Item asChild>
                          <Link
                            href="/admin"
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-gold hover:bg-gold/10 rounded-lg cursor-pointer outline-none transition-colors font-medium"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Admin Control Center
                          </Link>
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <DropdownMenu.Item
                        onSelect={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-error hover:bg-error/10 rounded-lg cursor-pointer outline-none transition-colors"
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
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gold/40 hover:border-gold bg-gold/10 hover:bg-gold/20 text-xs font-semibold text-gold transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Category Mega-Menu Row (Desktop) ── */}
        <div className="hidden lg:block border-t border-border/70 bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {MEGA_MENU_CATEGORIES.map((cat) => {
                  const isActive = activeMegaMenu === cat.name
                  return (
                    <div
                      key={cat.name}
                      className="relative"
                      onMouseEnter={() => setActiveMegaMenu(cat.name)}
                      onMouseLeave={() => setActiveMegaMenu(null)}
                    >
                      <Link
                        href={`/products?category=${cat.slug}`}
                        className={cn(
                          'flex items-center gap-1 px-4 py-3 text-xs uppercase tracking-wider font-semibold transition-colors duration-200 border-b-2',
                          isActive
                            ? 'text-gold border-gold'
                            : 'text-beige-muted hover:text-beige border-transparent',
                        )}
                      >
                        <span>{cat.name}</span>
                        {cat.highlight && (
                          <span className="text-[9px] lowercase bg-gold/15 text-gold px-1.5 py-0.5 rounded-full font-mono font-normal">
                            {cat.highlight}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform duration-200',
                            isActive && 'rotate-180',
                          )}
                        />
                      </Link>

                      {/* Mega-Menu Dropdown Drawer */}
                      {isActive && (
                        <div className="absolute left-0 top-full w-[650px] bg-surface/98 backdrop-blur-xl border border-border rounded-b-2xl shadow-2xl p-6 z-50 animate-fade-in grid grid-cols-3 gap-6">
                          {cat.columns.map((col, idx) => (
                            <div key={idx} className="space-y-2.5">
                              <h4 className="text-xs font-bold text-gold uppercase tracking-wider border-b border-border/80 pb-1.5">
                                {col.title}
                              </h4>
                              <ul className="space-y-1.5">
                                {col.items.map((item, itemIdx) => (
                                  <li key={itemIdx}>
                                    <Link
                                      href={item.href}
                                      onClick={() => setActiveMegaMenu(null)}
                                      className="text-xs text-beige-muted hover:text-beige hover:translate-x-1 transition-all block py-0.5"
                                    >
                                      {item.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Quick Catalog Access */}
              <Link
                href="/products"
                className="text-xs font-semibold text-gold hover:text-gold-light transition-colors flex items-center gap-1 uppercase tracking-wider py-3"
              >
                <span>Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </nav>
          </div>
        </div>

        {/* ── Mobile Search Bar Strip (Visible on mobile screens) ── */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, sneakers..."
              className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-20 py-2 text-xs text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
            />
            <Search className="w-3.5 h-3.5 text-beige-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-gold text-background px-3 py-1 rounded-lg text-xs font-semibold"
            >
              Go
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
    </header>
  )
}
