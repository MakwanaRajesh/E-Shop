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
    <footer className="bg-[#111111] border-t border-[#262422] text-[#FAF8F5]">
      {/* Gold accent line */}
      <div className="h-[2px] bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B08D46]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-lg bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
              </span>
              <span className="font-serif text-2xl font-bold tracking-widest text-[#FAF8F5]">
                NEXUS
              </span>
            </Link>
            <p className="text-xs text-[#A8A29E] leading-relaxed">
              Curating the finest sartorial garments and fine living essentials. Uncompromising quality, certified craftsmanship, and white-glove doorstep delivery.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-[#262422] bg-[#1C1917] flex items-center justify-center text-[#A8A29E] hover:text-[#C5A059] hover:border-[#C5A059]/50 transition-colors duration-200"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-serif text-xs font-bold text-[#FAF8F5] tracking-widest uppercase">
              Curated Catalog
            </h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-[#A8A29E] hover:text-[#C5A059] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-serif text-xs font-bold text-[#FAF8F5] tracking-widest uppercase">
              Client Concierge
            </h4>
            <ul className="space-y-2.5">
              {CUSTOMER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-[#A8A29E] hover:text-[#C5A059] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-serif text-xs font-bold text-[#FAF8F5] tracking-widest uppercase">
              Atelier Boutique
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-xs text-[#A8A29E]">
                <MapPin className="w-4 h-4 text-[#C5A059] mt-0.5 flex-shrink-0" />
                <span>2 Maruti Chock, Rajkot, Gujarat, 360005</span>
              </li>
              <li className="flex items-center gap-3 text-xs text-[#A8A29E]">
                <Phone className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                <a href="tel:+911234567890" className="hover:text-[#C5A059] transition-colors">
                  +91 12345 67890
                </a>
              </li>
              <li className="flex items-center gap-3 text-xs text-[#A8A29E]">
                <Mail className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                <a href="mailto:nexustech1003@gmail.com" className="hover:text-[#C5A059] transition-colors">
                  nexustech1003@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1C1917] bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#78716C]">
            © {new Date().getFullYear()} NEXUS Luxury Store. Atelier Obsidian & Champagne Gold Edition.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-xs text-[#78716C] hover:text-[#C5A059] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-[#78716C] hover:text-[#C5A059] transition-colors">
              Terms of Service
            </Link>
            <Link href="/shipping" className="text-xs text-[#78716C] hover:text-[#C5A059] transition-colors">
              White-Glove Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
