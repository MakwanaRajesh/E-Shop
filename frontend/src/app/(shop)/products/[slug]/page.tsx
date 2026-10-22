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
                <span className="bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 text-white font-mono font-bold text-xs uppercase px-3 py-1 rounded-full shadow-lg shadow-rose-950/60 border border-rose-400/40 tracking-wider">
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
              <span className="text-sm font-semibold text-success">
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

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-beige mb-2">
                Select Option
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    disabled={(variant.stock ?? variant.stockQuantity) === 0}
                    className={cn(
                      'px-4 py-2 rounded border text-sm transition-all duration-200',
                      (variant.stock ?? variant.stockQuantity) === 0 && 'opacity-40 cursor-not-allowed line-through',
                      selectedVariantId === variant.id
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border text-beige-muted hover:border-beige-muted/50 hover:text-beige',
                    )}
                  >
                    {variant.value ? `${variant.name}: ${variant.value}` : variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-beige mb-2">Quantity</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-medium text-beige">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(effectiveStock, q + 1))
                  }
                  disabled={quantity >= effectiveStock}
                  className="w-10 h-10 flex items-center justify-center text-beige-muted hover:text-beige hover:bg-surface-2 transition-colors disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {effectiveStock <= 5 && effectiveStock > 0 && (
                <span className="text-xs text-gold">
                  Only {effectiveStock} left!
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
              { icon: Truck, text: 'Free Shipping' },
              { icon: ShieldCheck, text: 'Secure Payment' },
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

          {/* SKU */}
          <p className="text-xs text-beige-muted">
            SKU: <span className="text-beige">{product.sku}</span>
          </p>
        </div>
      </div>

      {/* ── Accordion Details ── */}
      <div className="mb-16">
        <Accordion.Root type="single" defaultValue="description" collapsible>
          {[
            {
              value: 'description',
              title: 'Product Description',
              content: (
                <div
                  className="prose prose-invert prose-sm max-w-none text-beige-muted"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ),
            },
            product.variants.length > 0 && {
              value: 'variants',
              title: 'Available Options',
              content: (
                <div className="grid gap-2">
                  {product.variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <span className="text-beige">{v.value ? `${v.name}: ${v.value}` : v.name}</span>
                      <span className="text-beige-muted">
                        {formatCurrency(v.price ?? (v.priceModifier ? product.price + v.priceModifier : product.price))}
                      </span>
                    </div>
                  ))}
                </div>
              ),
            },
          ]
            .filter(Boolean)
            .map((item) => {
              if (!item) return null
              return (
                <Accordion.Item
                  key={item.value}
                  value={item.value}
                  className="border-b border-border"
                >
                  <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-medium text-beige hover:text-gold transition-colors [&[data-state=open]>svg]:rotate-180">
                    {item.title}
                    <ChevronRight className="w-4 h-4 text-beige-muted transition-transform duration-200 rotate-90" />
                  </Accordion.Trigger>
                  <Accordion.Content className="pb-4 text-beige-muted text-sm leading-relaxed">
                    {item.content}
                  </Accordion.Content>
                </Accordion.Item>
              )
            })}
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
    </div>
  )
}
