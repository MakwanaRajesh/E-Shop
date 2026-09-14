'use client'

import React from 'react'
import Link from 'next/link'
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
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Collections', href: '/products?sort=featured' },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const { isAuthenticated, user, logout } = useAuthStore()
  const { cart } = useCartStore()
  const { items: wishlistItems } = useWishlistStore()
  const { open: openAuthModal } = useAuthModalStore()
  const { setOpen: setCartOpen } = useCartStore()

  React.useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const cartCount = cart?.itemCount ?? 0
  const wishlistCount = wishlistItems.length

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-lg shadow-black/20'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="font-serif text-xl font-bold gold-text-gradient tracking-wider">
              NEXUS
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded transition-colors duration-200',
                  pathname === link.href
                    ? 'text-gold'
                    : 'text-beige-muted hover:text-beige',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-9 h-9 flex items-center justify-center rounded text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative w-9 h-9 flex items-center justify-center rounded text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gold text-background text-[10px] font-bold flex items-center justify-center px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative w-9 h-9 flex items-center justify-center rounded text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-gold text-background text-[10px] font-bold flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Account */}
            {isAuthenticated && user ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded border border-border hover:border-gold/40 transition-colors text-sm text-beige-muted hover:text-beige">
                    <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
                      <span className="text-gold text-xs font-bold">
                        {user.firstName[0].toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden lg:block max-w-[80px] truncate">{user.firstName}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[180px] bg-surface border border-border rounded-lg shadow-xl shadow-black/40 p-1.5 z-50"
                    sideOffset={8}
                    align="end"
                  >
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs text-beige-muted">Signed in as</p>
                      <p className="text-sm font-medium text-beige truncate">{user.email}</p>
                    </div>
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/account"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-beige-muted hover:text-beige hover:bg-surface-2 rounded cursor-pointer outline-none transition-colors"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/account/orders"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-beige-muted hover:text-beige hover:bg-surface-2 rounded cursor-pointer outline-none transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        My Orders
                      </Link>
                    </DropdownMenu.Item>
                    {user.role === 'admin' && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-gold hover:bg-gold/10 rounded cursor-pointer outline-none transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/10 rounded cursor-pointer outline-none transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-2 pl-3 pr-4 py-1.5 rounded border border-border hover:border-gold/40 transition-colors text-sm text-beige-muted hover:text-beige"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-beige-muted hover:text-beige"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="py-3 border-t border-border animate-fade-in">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-surface-2 border border-border rounded px-4 py-2.5 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
              />
              <button
                type="submit"
                className="gold-gradient px-5 py-2.5 rounded text-sm font-semibold text-background"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-md animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-gold bg-gold/10'
                    : 'text-beige-muted hover:text-beige hover:bg-surface-2',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Link
                href="/wishlist"
                onClick={() => setMobileOpen(false)}
                className="relative flex items-center gap-2 text-sm text-beige-muted hover:text-beige px-4 py-2"
              >
                <Heart className="w-4 h-4" />
                Wishlist
                {wishlistCount > 0 && (
                  <span className="bg-gold text-background text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => { setMobileOpen(false); setCartOpen(true) }}
                className="relative flex items-center gap-2 text-sm text-beige-muted hover:text-beige px-4 py-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart
                {cartCount > 0 && (
                  <span className="bg-gold text-background text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
            {isAuthenticated ? (
              <button
                onClick={() => { handleLogout(); setMobileOpen(false) }}
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 rounded transition-colors"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => { openAuthModal('login'); setMobileOpen(false) }}
                className="w-full px-4 py-3 text-sm gold-gradient text-background font-semibold rounded"
              >
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
