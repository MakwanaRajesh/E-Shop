import Link from 'next/link'
import { Sparkles, Mail, Phone, MapPin, Instagram, Twitter, Facebook, Youtube } from 'lucide-react'

const QUICK_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'All Products', href: '/products' },
  { label: 'New Arrivals', href: '/products?sort=newest' },
  { label: 'Best Sellers', href: '/products?sort=popular' },
  { label: 'Sale', href: '/products?sale=true' },
]

const CUSTOMER_LINKS = [
  { label: 'My Account', href: '/account' },
  { label: 'Order History', href: '/account/orders' },
  { label: 'Wishlist', href: '/wishlist' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'Returns & Refunds', href: '/returns' },
]

const SOCIAL_LINKS = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Youtube, href: '#', label: 'YouTube' },
]

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-20">
      {/* Gold accent line */}
      <div className="h-0.5 gold-gradient" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1 space-y-5">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              <span className="font-serif text-xl font-bold gold-text-gradient tracking-wider">
                NEXUS
              </span>
            </Link>
            <p className="text-sm text-beige-muted leading-relaxed">
              Curating the finest products for discerning tastes. Quality, elegance, and excellence delivered to your door.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-beige-muted hover:text-gold hover:border-gold/40 transition-colors duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold text-beige">Quick Links</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-beige-muted hover:text-gold transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold text-beige">Customer Service</h4>
            <ul className="space-y-2.5">
              {CUSTOMER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-beige-muted hover:text-gold transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-serif text-base font-semibold text-beige">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-beige-muted">
                <MapPin className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                <span>123 Luxury Lane, Mumbai, Maharashtra 400001, India</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-beige-muted">
                <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                <a href="tel:+911234567890" className="hover:text-gold transition-colors">
                  +91 12345 67890
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-beige-muted">
                <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                <a href="mailto:hello@luxestore.com" className="hover:text-gold transition-colors">
                  hello@luxestore.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-beige-muted">
            © {new Date().getFullYear()} Luxe Store. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-beige-muted hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-beige-muted hover:text-gold transition-colors">
              Terms of Service
            </Link>
            <Link href="/shipping" className="text-xs text-beige-muted hover:text-gold transition-colors">
              Shipping Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
