'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import {
  Star,
  Heart,
  ShoppingCart,
  Truck,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Sparkles,
  Ruler,
  X,
  Check,
  Info,
} from 'lucide-react'
import * as Accordion from '@radix-ui/react-accordion'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductDetailSkeleton } from '@/components/ui/Skeleton'
import { ProductCard } from '@/components/product/ProductCard'
import api from '@/lib/api'
import type { Product, ProductListItem, Review } from '@/types'
import { cn, formatCurrency, getStockStatus, calculateDiscount, formatRelativeDate, optimizeImageUrl } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import toast from 'react-hot-toast'

const TOPS_SIZE_DATA = [
  { size: 'XS', chestIn: '34 - 36', chestCm: '86 - 91', lengthIn: '27.0', lengthCm: '68.5', shoulderIn: '16.5', shoulderCm: '42.0' },
  { size: 'S',  chestIn: '36 - 38', chestCm: '91 - 96', lengthIn: '27.5', lengthCm: '70.0', shoulderIn: '17.0', shoulderCm: '43.2' },
  { size: 'M',  chestIn: '38 - 40', chestCm: '96 - 101', lengthIn: '28.0', lengthCm: '71.0', shoulderIn: '17.5', shoulderCm: '44.5' },
  { size: 'L',  chestIn: '40 - 42', chestCm: '101 - 106', lengthIn: '29.0', lengthCm: '73.5', shoulderIn: '18.2', shoulderCm: '46.2' },
  { size: 'XL', chestIn: '42 - 44', chestCm: '106 - 112', lengthIn: '30.0', lengthCm: '76.0', shoulderIn: '19.0', shoulderCm: '48.3' },
  { size: 'XXL', chestIn: '44 - 46', chestCm: '112 - 118', lengthIn: '30.5', lengthCm: '77.5', shoulderIn: '19.8', shoulderCm: '50.3' },
]

const BOTTOMS_SIZE_DATA = [
  { size: '28', waistIn: '28 - 29', waistCm: '71 - 74', hipIn: '35 - 36', hipCm: '89 - 91', inseamIn: '31.0', inseamCm: '78.7' },
  { size: '30', waistIn: '30 - 31', waistCm: '76 - 79', hipIn: '37 - 38', hipCm: '94 - 96', inseamIn: '31.5', inseamCm: '80.0' },
  { size: '32', waistIn: '32 - 33', waistCm: '81 - 84', hipIn: '39 - 40', hipCm: '99 - 101', inseamIn: '32.0', inseamCm: '81.3' },
  { size: '34', waistIn: '34 - 35', waistCm: '86 - 89', hipIn: '41 - 42', hipCm: '104 - 106', inseamIn: '32.5', inseamCm: '82.5' },
  { size: '36', waistIn: '36 - 37', waistCm: '91 - 94', hipIn: '43 - 44', hipCm: '109 - 112', inseamIn: '33.0', inseamCm: '83.8' },
  { size: '38', waistIn: '38 - 39', waistCm: '96 - 99', hipIn: '45 - 46', hipCm: '114 - 117', inseamIn: '33.0', inseamCm: '83.8' },
]

const FOOTWEAR_SIZE_DATA = [
  { uk: 'UK 6',  us: 'US 7',  eu: 'EU 40', lengthIn: '9.8',  lengthCm: '25.0' },
  { uk: 'UK 7',  us: 'US 8',  eu: 'EU 41', lengthIn: '10.2', lengthCm: '26.0' },
  { uk: 'UK 8',  us: 'US 9',  eu: 'EU 42', lengthIn: '10.6', lengthCm: '27.0' },
  { uk: 'UK 9',  us: 'US 10', eu: 'EU 43', lengthIn: '11.0', lengthCm: '28.0' },
  { uk: 'UK 10', us: 'US 11', eu: 'EU 44', lengthIn: '11.4', lengthCm: '29.0' },
  { uk: 'UK 11', us: 'US 12', eu: 'EU 45', lengthIn: '11.8', lengthCm: '30.0' },
]

interface Props {
  params: Promise<{ slug: string }>
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [related, setRelated] = React.useState<ProductListItem[]>([])
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedImageIdx, setSelectedImageIdx] = React.useState(0)
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | undefined>()
  const [quantity, setQuantity] = React.useState(1)
  const [isAddingToCart, setIsAddingToCart] = React.useState(false)
  const [pincode, setPincode] = React.useState('')
  const [pincodeStatus, setPincodeStatus] = React.useState<string | null>(null)

  // Size Guide modal and unit state
  const [sizeGuideOpen, setSizeGuideOpen] = React.useState(false)
  const [sizeUnit, setSizeUnit] = React.useState<'in' | 'cm'>('in')
  const [sizeTab, setSizeTab] = React.useState<'tops' | 'bottoms' | 'footwear'>('tops')

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault()
    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus(`✓ Delivery available to ${pincode.trim()} in 2-3 business days. Cash on Delivery supported.`)
    } else {
      setPincodeStatus('Invalid PIN code. Please enter 6 digits.')
    }
  }

  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const { isInWishlist, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore()
  const { open: openAuthModal } = useAuthModalStore()

  React.useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true)
      try {
        const productRes = await api.get<Product>(`/api/products/${slug}`)
        setProduct(productRes.data)

        if (productRes.data.variants?.length > 0) {
          setSelectedVariantId(productRes.data.variants[0].id)
        }

        // Auto-detect default size tab based on category and title
        const catLower = (productRes.data.categoryName || '').toLowerCase()
        const nameLower = (productRes.data.name || '').toLowerCase()
        if (
          catLower.includes('footwear') ||
          catLower.includes('shoe') ||
          nameLower.includes('sneaker') ||
          nameLower.includes('shoe') ||
          nameLower.includes('heel') ||
          nameLower.includes('loafer') ||
          nameLower.includes('flat')
        ) {
          setSizeTab('footwear')
        } else if (
          catLower.includes('denim') ||
          catLower.includes('jean') ||
          catLower.includes('trouser') ||
          catLower.includes('pant') ||
          catLower.includes('short') ||
          nameLower.includes('denim') ||
          nameLower.includes('jean') ||
          nameLower.includes('trouser') ||
          nameLower.includes('pant') ||
          nameLower.includes('cargo') ||
          nameLower.includes('shorts')
        ) {
          setSizeTab('bottoms')
        } else {
          setSizeTab('tops')
        }

        // Fetch reviews by product ID
        try {
          const reviewsRes = await api.get<Review[]>(`/api/reviews/product/${productRes.data.id}`)
          setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : [])
        } catch {
          setReviews([])
        }

        // Fetch related products
        try {
          const relatedRes = await api.get<{ data?: ProductListItem[]; items?: ProductListItem[] }>('/api/products', {
            params: { pageSize: 4, categoryId: productRes.data.categoryId },
          })
          const list = relatedRes.data.items ?? relatedRes.data.data ?? []
          setRelated(list.filter((p) => p.id !== productRes.data.id).slice(0, 4))
        } catch {
          setRelated([])
        }
      } catch {
        notFound()
      } finally {
        setIsLoading(false)
      }
    }
    fetchProduct()
  }, [slug])

  const handleAddToCart = async (goToCheckout = false) => {
    if (!product) return
    setIsAddingToCart(true)
    try {
      await addItem(product.id, quantity, selectedVariantId, {
        name: product.name,
        slug: product.slug,
        price: effectivePrice,
        imageUrl: currentImage?.url ?? product.images?.[0]?.url,
        stock: effectiveStock,
        variantName: selectedVariant?.name,
        variantValue: selectedVariant?.value,
      })
      toast.success(`${product.name} added to cart!`, { icon: '🛍️' })
      if (goToCheckout) {
        if (!isAuthenticated) {
          openAuthModal('login', '/checkout')
        } else {
          router.push('/checkout')
        }
      }
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast('Please sign in to save items to your wishlist', { icon: '🤍' })
      openAuthModal('login')
      return
    }
    if (!product) return
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id)
      toast.success('Removed from wishlist')
    } else {
      await addToWishlist(product.id, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        primaryImageUrl: currentImage?.url ?? product.images?.[0]?.url,
        categoryName: product.categoryName,
      })
      toast.success('Saved to wishlist!', { icon: '💛' })
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ProductDetailSkeleton />
      </div>
    )
  }

  if (!product) return null

  const currentImage = product.images?.[selectedImageIdx]
  const stockCount = product.stock ?? product.stockQuantity ?? 0
  const stockStatus = getStockStatus(stockCount)
  const discount = calculateDiscount(product.price, product.compareAtPrice)
  const inWishlist = isInWishlist(product.id)
  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId)
  const effectivePrice = selectedVariant?.price ?? (selectedVariant?.priceModifier ? product.price + selectedVariant.priceModifier : product.price)
  const effectiveCompareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice
  const effectiveStock = selectedVariant?.stock ?? selectedVariant?.stockQuantity ?? stockCount
  const categoryName = product.categoryName ?? product.category?.name ?? 'Collection'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-beige-muted mb-8">
        <Link href="/" className="hover:text-gold transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/products" className="hover:text-gold transition-colors">Products</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gold font-medium">{categoryName}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-beige truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* ── Image Gallery ── */}
        <div className="space-y-4">
          {/* Primary image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-2 border border-border group">
            {currentImage ? (
              <Image
                src={optimizeImageUrl(currentImage.url, 900, 75)}
                alt={currentImage.altText ?? product.name}
                fill
                className="object-cover transition-opacity duration-300"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-beige-muted/20">
                <ShoppingCart className="w-24 h-24" />
              </div>
            )}
            {discount > 0 && (
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-mono font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm tracking-wider">
                  -{discount}% OFF
                </span>
              </div>
            )}
            {/* Nav arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSelectedImageIdx((prev) =>
                      prev === 0 ? product.images.length - 1 : prev - 1,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/70 backdrop-blur-sm border border-border flex items-center justify-center text-beige-muted hover:text-beige opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setSelectedImageIdx((prev) =>
                      prev === product.images.length - 1 ? 0 : prev + 1,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/70 backdrop-blur-sm border border-border flex items-center justify-center text-beige-muted hover:text-beige opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIdx(i)}
                  className={cn(
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200',
                    i === selectedImageIdx
                      ? 'border-gold shadow-md shadow-gold/20'
                      : 'border-border hover:border-beige-muted/40',
                  )}
                >
                  <Image
                    src={optimizeImageUrl(img.url, 160, 60)}
                    alt={img.altText ?? `Image ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info ── */}
        <div className="flex flex-col gap-5">
          {/* Category + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="gold">{categoryName}</Badge>
            <StatusBadge
              status={stockStatus.badgeType}
              label={stockStatus.label}
              size="md"
            />
            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gold/15 text-gold border border-gold/40 shadow-sm shadow-gold/10 font-medium">
                ★ Exclusive Signature
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige leading-tight">
            {product.name}
          </h1>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < Math.round(product.averageRating)
                        ? 'text-gold fill-gold'
                        : 'text-beige-muted/30',
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-beige-muted">
                {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl font-bold text-beige">
              {formatCurrency(effectivePrice)}
            </span>
            {effectiveCompareAt && effectiveCompareAt > effectivePrice && (
              <span className="text-xl text-beige-muted line-through">
                {formatCurrency(effectiveCompareAt)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-xs font-bold text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-0.5 rounded-full">
                Save {discount}%
              </span>
            )}
          </div>

          {/* Promotional Offers Strip (SHEIN / AJIO Style) */}
          <div className="bg-gradient-to-r from-gold/15 via-surface-2 to-gold/5 border border-gold/30 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-gold font-semibold">
              <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
              <span>Special Privileges & Offers</span>
            </div>
            <p className="text-beige-muted">
              • Apply code <span className="font-mono text-gold font-bold">NEXUS10</span> for 10% instant discount at checkout.
            </p>
            <p className="text-beige-muted">
              • Complimentary white-glove doorstep delivery on all orders over ₹5,000.
            </p>
          </div>

          {/* Short description */}
          {product.shortDescription && (
            <p className="text-beige-muted leading-relaxed text-sm">
              {product.shortDescription}
            </p>
          )}

          {/* Delivery & Pincode Checker (AJIO Style) */}
          <div className="bg-surface-2/40 border border-border rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-beige block">
              Estimated Delivery & Services
            </span>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit PIN code..."
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold w-44 font-mono"
              />
              <button
                type="submit"
                className="text-xs font-semibold px-3 py-1.5 bg-gold text-background rounded-lg hover:bg-gold-light transition-colors"
              >
                Check
              </button>
            </form>
            {pincodeStatus && (
              <p className={`text-xs ${pincodeStatus.startsWith('✓') ? 'text-success' : 'text-error'}`}>
                {pincodeStatus}
              </p>
            )}
          </div>

          {/* Variants & Size Guide */}
          {product.variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-beige">
                  Select Option / Size
                </label>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-xs text-gold hover:text-gold-light flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Size Guide & Chart</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={(variant.stock ?? variant.stockQuantity) === 0}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm transition-all duration-200',
                      (variant.stock ?? variant.stockQuantity) === 0 && 'opacity-40 cursor-not-allowed line-through',
                      selectedVariantId === variant.id
                        ? 'border-gold bg-gold/15 text-gold font-semibold shadow-sm'
                        : 'border-border text-beige-muted hover:border-beige-muted/50 hover:text-beige bg-surface-2/40',
                    )}
                  >
                    {variant.value ? `${variant.name}: ${variant.value}` : variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity (Enforced max 10 per product) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-beige">Quantity</label>
              <span className="text-[11px] text-beige-muted">Max 10 units per order</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface transition-colors disabled:opacity-30"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold text-beige">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(Math.min(10, effectiveStock), q + 1))
                  }
                  disabled={quantity >= Math.min(10, effectiveStock)}
                  title={quantity >= 10 ? 'Maximum 10 units allowed per product' : 'Increase quantity'}
                  className="w-10 h-10 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {quantity >= 10 && (
                <span className="text-xs text-gold font-medium">Max limit reached (10)</span>
              )}
              {effectiveStock <= 5 && effectiveStock > 0 && quantity < 10 && (
                <span className="text-xs text-gold">
                  Only {effectiveStock} left in stock!
                </span>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 border-gold/50 text-gold hover:bg-gold hover:text-background"
              onClick={() => handleAddToCart(false)}
              isLoading={isAddingToCart}
              disabled={effectiveStock === 0}
            >
              <ShoppingCart className="w-5 h-5" />
              {effectiveStock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1 font-semibold"
              onClick={() => handleAddToCart(true)}
              isLoading={isAddingToCart}
              disabled={effectiveStock === 0}
            >
              Buy Now
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleWishlist}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className="px-4"
            >
              <Heart
                className={cn('w-5 h-5 transition-colors', inWishlist ? 'fill-error text-error' : 'text-beige-muted hover:text-error')}
              />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Truck, text: 'Free Shipping ₹5k+' },
              { icon: ShieldCheck, text: '100% Authentic' },
              { icon: RefreshCw, text: '30-Day Returns' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-surface-2 border border-border text-center"
              >
                <Icon className="w-4 h-4 text-gold" />
                <span className="text-xs text-beige-muted">{text}</span>
              </div>
            ))}
          </div>

          {/* SKU & Category details */}
          <div className="flex items-center justify-between text-xs text-beige-muted pt-1">
            <p>SKU: <span className="text-beige font-mono">{product.sku}</span></p>
            <button
              onClick={() => setSizeGuideOpen(true)}
              className="text-gold hover:underline flex items-center gap-1"
            >
              <Ruler className="w-3 h-3" />
              View Size Chart
            </button>
          </div>
        </div>
      </div>

      {/* ── Comprehensive Product Accordion Details (AJIO / SHEIN Style) ── */}
      <div className="mb-16">
        <Accordion.Root type="single" defaultValue="description" collapsible>
          {/* Section 1: Detailed Product Description & Story */}
          <Accordion.Item value="description" className="border-b border-border">
            <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-serif text-base font-medium text-beige hover:text-gold transition-colors [&[data-state=open]>svg]:rotate-180">
              <span>About the Product & Mastercraft Story</span>
              <ChevronRight className="w-4 h-4 text-beige-muted transition-transform duration-200 rotate-90" />
            </Accordion.Trigger>
            <Accordion.Content className="pb-5 text-beige-muted text-sm leading-relaxed space-y-4">
              <div
                className="prose prose-invert prose-sm max-w-none text-beige-muted"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              <div className="bg-surface-2/40 border border-border/80 rounded-xl p-4 space-y-2 mt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gold block">
                  Design Highlights
                </span>
                <ul className="text-xs text-beige-muted space-y-1.5 list-disc list-inside">
                  <li>Masterfully engineered with bespoke silhouettes and ergonomic contouring.</li>
                  <li>Premium hand-finished seams designed for lasting durability and shape retention.</li>
                  <li>Luxurious tactile texture providing peerless comfort all day long.</li>
                  <li>Curated signature hardware and subtle prestige accents.</li>
                </ul>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          {/* Section 2: Material & Technical Specifications */}
          <Accordion.Item value="specifications" className="border-b border-border">
            <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-serif text-base font-medium text-beige hover:text-gold transition-colors [&[data-state=open]>svg]:rotate-180">
              <span>Specifications & Material Details</span>
              <ChevronRight className="w-4 h-4 text-beige-muted transition-transform duration-200 rotate-90" />
            </Accordion.Trigger>
            <Accordion.Content className="pb-5 text-beige-muted text-sm leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-surface-2/60 border border-border p-3 rounded-xl space-y-1">
                  <span className="text-beige-muted/70 uppercase text-[10px] tracking-wider block font-semibold">Department</span>
                  <span className="text-beige font-medium">{categoryName}</span>
                </div>
                <div className="bg-surface-2/60 border border-border p-3 rounded-xl space-y-1">
                  <span className="text-beige-muted/70 uppercase text-[10px] tracking-wider block font-semibold">Material / Weave</span>
                  <span className="text-beige font-medium">100% Certified Luxury Grade Cotton / Genuine Leather</span>
                </div>
                <div className="bg-surface-2/60 border border-border p-3 rounded-xl space-y-1">
                  <span className="text-beige-muted/70 uppercase text-[10px] tracking-wider block font-semibold">Fit & Silhouette</span>
                  <span className="text-beige font-medium">Bespoke Modern Fit (True to standard sizing)</span>
                </div>
                <div className="bg-surface-2/60 border border-border p-3 rounded-xl space-y-1">
                  <span className="text-beige-muted/70 uppercase text-[10px] tracking-wider block font-semibold">Occasion</span>
                  <span className="text-beige font-medium">Luxury Casual / Smart Formal / Signature Evening</span>
                </div>
                <div className="bg-surface-2/60 border border-border p-3 rounded-xl space-y-1">
                  <span className="text-beige-muted/70 uppercase text-[10px] tracking-wider block font-semibold">Origin & Certification</span>
                  <span className="text-beige font-medium">Imported Artisanal Production • Certified 100% Authentic</span>
                </div>
                <div className="bg-surface-2/60 border border-border p-3 rounded-xl space-y-1">
                  <span className="text-beige-muted/70 uppercase text-[10px] tracking-wider block font-semibold">Authenticity Guarantee</span>
                  <span className="text-success font-medium">Includes NEXUS Certificate of Authenticity</span>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          {/* Section 3: Interactive Size Chart & Measurements */}
          <Accordion.Item value="size_chart" className="border-b border-border">
            <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-serif text-base font-medium text-beige hover:text-gold transition-colors [&[data-state=open]>svg]:rotate-180">
              <span className="flex items-center gap-2">
                <span>Interactive Size Chart & Fit Guide</span>
                <span className="text-[10px] font-sans font-normal bg-gold/15 text-gold px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-beige-muted transition-transform duration-200 rotate-90" />
            </Accordion.Trigger>
            <Accordion.Content className="pb-5 text-beige-muted text-sm leading-relaxed space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-beige-muted">
                  Compare body measurements below to find your perfect fit.
                </p>
                <div className="flex items-center gap-1 bg-surface-2 border border-border p-1 rounded-lg">
                  <button
                    onClick={() => setSizeUnit('in')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                      sizeUnit === 'in' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige',
                    )}
                  >
                    Inches (in)
                  </button>
                  <button
                    onClick={() => setSizeUnit('cm')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                      sizeUnit === 'cm' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige',
                    )}
                  >
                    Centimeters (cm)
                  </button>
                </div>
              </div>

              {/* Tops Table */}
              {sizeTab === 'tops' && (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-2 text-gold uppercase tracking-wider text-[11px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Chest ({sizeUnit})</th>
                        <th className="py-2.5 px-3">Shoulder ({sizeUnit})</th>
                        <th className="py-2.5 px-3">Length ({sizeUnit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {TOPS_SIZE_DATA.map((row) => (
                        <tr key={row.size} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-2 px-3 font-semibold text-beige">{row.size}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.chestIn : row.chestCm}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.shoulderIn : row.shoulderCm}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.lengthIn : row.lengthCm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottoms Table */}
              {sizeTab === 'bottoms' && (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-2 text-gold uppercase tracking-wider text-[11px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">Waist Size</th>
                        <th className="py-2.5 px-3">Waist ({sizeUnit})</th>
                        <th className="py-2.5 px-3">Hip ({sizeUnit})</th>
                        <th className="py-2.5 px-3">Inseam ({sizeUnit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {BOTTOMS_SIZE_DATA.map((row) => (
                        <tr key={row.size} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-2 px-3 font-semibold text-beige">{row.size}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.waistIn : row.waistCm}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.hipIn : row.hipCm}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.inseamIn : row.inseamCm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footwear Table */}
              {sizeTab === 'footwear' && (
                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-2 text-gold uppercase tracking-wider text-[11px] border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">UK / India</th>
                        <th className="py-2.5 px-3">US Size</th>
                        <th className="py-2.5 px-3">EU Size</th>
                        <th className="py-2.5 px-3">Foot Length ({sizeUnit})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {FOOTWEAR_SIZE_DATA.map((row) => (
                        <tr key={row.uk} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-2 px-3 font-semibold text-beige">{row.uk}</td>
                          <td className="py-2 px-3">{row.us}</td>
                          <td className="py-2 px-3">{row.eu}</td>
                          <td className="py-2 px-3">{sizeUnit === 'in' ? row.lengthIn : row.lengthCm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-beige-muted">Need other measurements?</span>
                <button
                  onClick={() => setSizeGuideOpen(true)}
                  className="text-xs text-gold underline hover:text-gold-light"
                >
                  Open Full Sizing Guide & Measuring Instructions →
                </button>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          {/* Section 4: Care Instructions */}
          <Accordion.Item value="care" className="border-b border-border">
            <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-serif text-base font-medium text-beige hover:text-gold transition-colors [&[data-state=open]>svg]:rotate-180">
              <span>Wash Care & Fabric Longevity Guide</span>
              <ChevronRight className="w-4 h-4 text-beige-muted transition-transform duration-200 rotate-90" />
            </Accordion.Trigger>
            <Accordion.Content className="pb-5 text-beige-muted text-sm leading-relaxed space-y-2">
              <ul className="text-xs text-beige-muted space-y-2 list-disc list-inside">
                <li><strong className="text-beige">Washing:</strong> Machine wash cold (30°C / 85°F) on gentle cycle with similar luxury fabrics.</li>
                <li><strong className="text-beige">Detergent:</strong> Use mild, organic detergent. Never use chlorine bleach or optical brighteners.</li>
                <li><strong className="text-beige">Drying:</strong> Lay flat in shade to dry or tumble dry on lowest delicate heat.</li>
                <li><strong className="text-beige">Ironing:</strong> Warm steam iron on reverse side if needed. Do not iron directly on signature hardware.</li>
                <li><strong className="text-beige">Storage:</strong> Store on padded or cedar wooden hangers away from direct sunlight.</li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>

          {/* Section 5: Shipping, Returns & Concierge */}
          <Accordion.Item value="shipping" className="border-b border-border">
            <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-serif text-base font-medium text-beige hover:text-gold transition-colors [&[data-state=open]>svg]:rotate-180">
              <span>Complimentary White-Glove Shipping & 30-Day Returns</span>
              <ChevronRight className="w-4 h-4 text-beige-muted transition-transform duration-200 rotate-90" />
            </Accordion.Trigger>
            <Accordion.Content className="pb-5 text-beige-muted text-sm leading-relaxed space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-surface-2/40 border border-border p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-gold font-semibold">
                    <Truck className="w-4 h-4" />
                    <span>Complimentary Express Delivery</span>
                  </div>
                  <p className="text-beige-muted">
                    Enjoy free doorstep delivery on all orders over ₹5,000. Orders ship in discreet, tamper-proof signature luxury packaging with tracking.
                  </p>
                </div>
                <div className="bg-surface-2/40 border border-border p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-gold font-semibold">
                    <RefreshCw className="w-4 h-4" />
                    <span>30-Day Doorstep Exchange & Returns</span>
                  </div>
                  <p className="text-beige-muted">
                    If the size or fit isn&rsquo;t perfect, our courier will collect it directly from your doorstep with zero friction and instant credit.
                  </p>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>

      {/* ── Reviews ── */}
      {reviews.length > 0 && (
        <section className="mb-16">
          <h2 className="font-serif text-2xl font-bold text-beige mb-6">
            Customer Reviews
          </h2>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                      <span className="text-gold text-sm font-bold">
                        {review.user.firstName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-beige">
                        {review.user.firstName} {review.user.lastName}
                      </p>
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-3 h-3',
                              i < review.rating
                                ? 'text-gold fill-gold'
                                : 'text-beige-muted/30',
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {review.isVerifiedPurchase && (
                      <Badge variant="success" className="text-xs">Verified</Badge>
                    )}
                    <span className="text-xs text-beige-muted">{formatRelativeDate(review.createdAt)}</span>
                  </div>
                </div>
                {review.title && (
                  <h4 className="font-medium text-beige mb-1">{review.title}</h4>
                )}
                <p className="text-sm text-beige-muted">{review.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Related Products ── */}
      {related.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-bold text-beige mb-6">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Size Guide & Measuring Instructions Modal ── */}
      {sizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setSizeGuideOpen(false)}
          />
          <div className="relative bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6 z-10 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-gold" />
                <h3 className="font-serif text-xl font-bold text-beige">
                  Official Sizing Guide & Fit Finder
                </h3>
              </div>
              <button
                onClick={() => setSizeGuideOpen(false)}
                className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-beige-muted hover:text-beige transition-colors"
                aria-label="Close size guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Department Tabs & Unit Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-border">
                <button
                  onClick={() => setSizeTab('tops')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    sizeTab === 'tops' ? 'bg-gold text-background shadow-sm' : 'text-beige-muted hover:text-beige',
                  )}
                >
                  Tops & Shirts
                </button>
                <button
                  onClick={() => setSizeTab('bottoms')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    sizeTab === 'bottoms' ? 'bg-gold text-background shadow-sm' : 'text-beige-muted hover:text-beige',
                  )}
                >
                  Bottoms & Trousers
                </button>
                <button
                  onClick={() => setSizeTab('footwear')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    sizeTab === 'footwear' ? 'bg-gold text-background shadow-sm' : 'text-beige-muted hover:text-beige',
                  )}
                >
                  Footwear & Shoes
                </button>
              </div>

              {/* Units */}
              <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
                <button
                  onClick={() => setSizeUnit('in')}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                    sizeUnit === 'in' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige',
                  )}
                >
                  Inches
                </button>
                <button
                  onClick={() => setSizeUnit('cm')}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded font-medium transition-colors',
                    sizeUnit === 'cm' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige',
                  )}
                >
                  Centimeters
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="border border-border rounded-xl overflow-hidden">
              {sizeTab === 'tops' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 text-gold uppercase tracking-wider text-[11px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Chest ({sizeUnit})</th>
                      <th className="py-2.5 px-3">Shoulder ({sizeUnit})</th>
                      <th className="py-2.5 px-3">Length ({sizeUnit})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {TOPS_SIZE_DATA.map((row) => (
                      <tr key={row.size} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-beige">{row.size}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.chestIn : row.chestCm}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.shoulderIn : row.shoulderCm}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.lengthIn : row.lengthCm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {sizeTab === 'bottoms' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 text-gold uppercase tracking-wider text-[11px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Waist Size</th>
                      <th className="py-2.5 px-3">Waist ({sizeUnit})</th>
                      <th className="py-2.5 px-3">Hip ({sizeUnit})</th>
                      <th className="py-2.5 px-3">Inseam ({sizeUnit})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {BOTTOMS_SIZE_DATA.map((row) => (
                      <tr key={row.size} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-beige">{row.size}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.waistIn : row.waistCm}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.hipIn : row.hipCm}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.inseamIn : row.inseamCm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {sizeTab === 'footwear' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface-2 text-gold uppercase tracking-wider text-[11px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">UK / India</th>
                      <th className="py-2.5 px-3">US Size</th>
                      <th className="py-2.5 px-3">EU Size</th>
                      <th className="py-2.5 px-3">Foot Length ({sizeUnit})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {FOOTWEAR_SIZE_DATA.map((row) => (
                      <tr key={row.uk} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-beige">{row.uk}</td>
                        <td className="py-2.5 px-3">{row.us}</td>
                        <td className="py-2.5 px-3">{row.eu}</td>
                        <td className="py-2.5 px-3">{sizeUnit === 'in' ? row.lengthIn : row.lengthCm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* How to Measure Yourself Guide */}
            <div className="bg-surface-2/50 border border-border rounded-xl p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gold block">
                How to Measure Your Body
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-beige-muted">
                <div className="space-y-1">
                  <p className="font-semibold text-beige">1. Chest / Bust</p>
                  <p>Measure around the fullest part of your chest, keeping tape horizontal under your armpits.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-beige">2. Waist</p>
                  <p>Measure around your natural waistline, keeping the tape comfortably loose.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-beige">3. Inseam</p>
                  <p>Measure from the highest point of your inner leg down to the bottom ankle hem.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-beige">4. Foot Length</p>
                  <p>Place heel against a wall on a piece of paper, mark the tip of longest toe, and measure length.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
              <span className="text-beige-muted">Between sizes? We recommend choosing the larger size for a relaxed drape.</span>
              <Button variant="primary" size="sm" onClick={() => setSizeGuideOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
