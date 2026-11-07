import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(validAmount)
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatRelativeDate(dateString?: string | null): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

export function normalizeCategorySlug(slug: string | null | undefined): string {
  if (!slug) return ''
  const s = slug.toLowerCase().trim()
  if (s === 'man' || s === 'men' || s === 'male' || s === 'mens' || s === "men's" || s === 'gents') return 'men'
  if (s === 'female' || s === 'woman' || s === 'women' || s === 'womens' || s === "women's" || s === 'ladies') return 'women'
  if (s === 'kid' || s === 'kids' || s === 'child' || s === 'children') return 'kids'
  if (s === 'boy' || s === 'boys') return 'kids-boys'
  if (s === 'girl' || s === 'girls') return 'kids-girls'
  if (s === 'shoe' || s === 'shoes' || s === 'sneaker' || s === 'sneakers' || s === 'footwear') return 'footwear'
  if (s === 'watch' || s === 'watches' || s === 'timepiece') return 'watches'
  if (s === 'perfume' || s === 'perfumes' || s === 'fragrance' || s === 'fragrances') return 'fragrances'
  if (s === 'jewelry' || s === 'jewellery') return 'jewelry'
  if (s === 'accessory' || s === 'accessories') return 'accessories'
  return s
}

export function getStockStatus(quantity: number): {
  label: string
  variant: 'success' | 'error' | 'gold' | 'emerald' | 'ruby' | 'amber'
  badgeType: 'in_stock' | 'low_stock' | 'out_of_stock'
} {
  if (quantity === 0) return { label: 'Out of Stock', variant: 'ruby', badgeType: 'out_of_stock' }
  if (quantity <= 5) return { label: `Only ${quantity} Left`, variant: 'amber', badgeType: 'low_stock' }
  return { label: 'In Stock', variant: 'emerald', badgeType: 'in_stock' }
}

export function calculateDiscount(price: number, compareAtPrice?: number): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

/**
 * Optimizes remote images (Unsplash, Cloudinary, etc.) for instant loading and minimal payload.
 * Rewrites URLs to request modern WebP/AVIF formats at the exact target dimensions.
 */
export function optimizeImageUrl(url: string | null | undefined, width = 450, quality = 65): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=60'
  }

  try {
    // Unsplash: append or override auto=format, fit=crop, w, q
    if (url.includes('images.unsplash.com')) {
      const parsed = new URL(url)
      parsed.searchParams.set('auto', 'format')
      parsed.searchParams.set('fit', 'crop')
      parsed.searchParams.set('w', String(width))
      parsed.searchParams.set('q', String(quality))
      return parsed.toString()
    }

    // Cloudinary: inject format auto and quality auto
    if (url.includes('res.cloudinary.com')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto:eco,w_${width}/`)
    }
  } catch {
    // Return original if URL parsing fails
  }

  return url
}
