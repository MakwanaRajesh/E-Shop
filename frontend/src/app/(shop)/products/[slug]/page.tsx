'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  PackageX,
} from 'lucide-react'
import * as Accordion from '@radix-ui/react-accordion'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ProductDetailSkeleton } from '@/components/ui/Skeleton'
import { ProductCard } from '@/components/product/ProductCard'
import api from '@/lib/api'
import {
  buildCatalogKey,
  fetchWithCatalogCache,
  invalidateFrontendCatalogCache,
  peekCatalogCache,
  removeCatalogCacheKey,
} from '@/lib/catalogCache'
import type { Product, ProductListItem, Review, ReviewEligibility } from '@/types'
import { cn, formatCurrency, getStockStatus, calculateDiscount, formatRelativeDate, optimizeImageUrl } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import { useRecentlyViewedStore } from '@/store/recentlyViewed'
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

function getSimilarProductQuery(product: Product): {
  params: Record<string, string | number>
  label: string
  viewAllHref: string
} {
  const tagsStr = Array.isArray(product.tags) ? product.tags.join(' ') : (product.tags ?? '')
  const catLower = (product.categoryName ?? '').toLowerCase()
  const text = `${product.name} ${product.categoryName ?? ''} ${tagsStr}`.toLowerCase()
  const isWomen =
    /\b(women(?:'s|s)?|dress|kurta|kurti|blouse|palazzo|handbag|tote|sling|ethnic|heels|mules)\b/.test(text)
  const isMen = !isWomen && /\b(men(?:'s|s)?|boys)\b/.test(text)

  if (/\b(co-ord|coord)\b/.test(text)) {
    if (isWomen && !/\bmen(?:'s|s)?\b/.test(catLower)) {
      return {
        params: { category: 'women-dresses', pageSize: 12 },
        label: "More Women's Co-Ords & Dresses",
        viewAllHref: '/products?category=women&subCategory=women-dresses',
      }
    }
    return {
      params: { category: 'mens-co-ord-sets', pageSize: 12 },
      label: "More Men's Co-ord Sets",
      viewAllHref: '/products?category=men&subCategory=mens-co-ord-sets',
    }
  }
  if (/\b(t-shirt|tshirt|tee|tees|polo)\b/.test(text)) {
    return isWomen
      ? {
          params: { category: 'women-tops', pageSize: 12 },
          label: "More Women's Tops & Tees",
          viewAllHref: '/products?category=women&subCategory=women-tops',
        }
      : {
          params: { category: 'men-t-shirts', pageSize: 12 },
          label: "More Men's T-Shirts & Tees",
          viewAllHref: '/products?category=men&subCategory=men-t-shirts',
        }
  }
  if (/\b(denim|jeans|trouser|palazzo|pants)\b/.test(text)) {
    return isWomen
      ? {
          params: { category: 'women-denim', pageSize: 12 },
          label: "More Women's Denim & Trousers",
          viewAllHref: '/products?category=women&subCategory=women-denim',
        }
      : {
          params: { category: 'men-denim', pageSize: 12 },
          label: "More Men's Denim & Jeans",
          viewAllHref: '/products?category=men&subCategory=men-denim',
        }
  }
  if (/\b(footwear|shoe|shoes|sneaker|sneakers|heel|heels|loafer|loafers|flat|flats|mule|mules|sandal|sandals)\b/.test(text)) {
    return isWomen
      ? {
          params: { category: 'women-footwear', pageSize: 12 },
          label: "More Women's Footwear",
          viewAllHref: '/products?category=women&subCategory=women-footwear',
        }
      : isMen
      ? {
          params: { category: 'men-footwear', pageSize: 12 },
          label: "More Men's Footwear",
          viewAllHref: '/products?category=men&subCategory=men-footwear',
        }
      : {
          params: { category: 'footwear', pageSize: 12 },
          label: 'More Footwear',
          viewAllHref: '/products?category=footwear',
        }
  }
  if (/\b(kurta|kurti|ethnic|sharara|chikankari|kurta set)\b/.test(text)) {
    return {
      params: { category: 'women-ethnic', pageSize: 12 },
      label: 'More Ethnic & Kurtas',
      viewAllHref: '/products?category=women&subCategory=women-ethnic',
    }
  }
  if (/\b(dress|dresses|gown|jumpsuit|romper)\b/.test(text)) {
    return {
      params: { category: 'women-dresses', pageSize: 12 },
      label: 'More Dresses & Western',
      viewAllHref: '/products?category=women&subCategory=women-dresses',
    }
  }
  if (/\b(blouse|top|tunic)\b/.test(text) || (isWomen && /\bshirt\b/.test(text))) {
    return {
      params: { category: 'women-tops', pageSize: 12 },
      label: "More Women's Tops & Shirts",
      viewAllHref: '/products?category=women&subCategory=women-tops',
    }
  }
  if (/\bshirt\b/.test(text)) {
    return {
      params: { category: 'men-shirts', pageSize: 12 },
      label: "More Men's Shirts",
      viewAllHref: '/products?category=men&subCategory=men-shirts',
    }
  }
  if (/\b(hoodie|jacket|cardigan|sweater|trunks|track)\b/.test(text)) {
    return {
      params: { category: 'men-activewear', pageSize: 12 },
      label: 'More Menswear & Outerwear',
      viewAllHref: '/products?category=men&subCategory=men-activewear',
    }
  }
  if (/\b(parfum|perfume|fragrance|toilette|studiowest|omen)\b/.test(text)) {
    return {
      params: { category: 'fragrances', pageSize: 12 },
      label: 'More Signature Fragrances',
      viewAllHref: '/products?category=fragrances',
    }
  }
  if (/\b(ring|pendant|necklace|jewelry|jewellery|bracelet)\b/.test(text)) {
    return {
      params: { category: 'jewelry', pageSize: 12 },
      label: 'More Jewelry & Pendants',
      viewAllHref: '/products?category=jewelry',
    }
  }
  if (/\b(bag|tote|handbag|clutch|sling|hobo)\b/.test(text)) {
    return {
      params: { category: 'women-handbags', pageSize: 12 },
      label: 'More Handbags & Slings',
      viewAllHref: '/products?category=women&subCategory=women-handbags',
    }
  }
  if (/\b(sunglass|cap|eyewear)\b/.test(text)) {
    return {
      params: { category: 'accessories', pageSize: 12 },
      label: 'More Sunglasses & Accessories',
      viewAllHref: '/products?category=accessories',
    }
  }
  return {
    params: { pageSize: 12, ...(product.categoryId ? { categoryId: product.categoryId } : {}) },
    label: `More in ${product.categoryName ?? 'This Collection'}`,
    viewAllHref: product.category?.slug ? `/products?category=${product.category.slug}` : '/products',
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = React.use(params)
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [related, setRelated] = React.useState<ProductListItem[]>([])
  const [relatedMeta, setRelatedMeta] = React.useState<{ label: string; viewAllHref: string }>({
    label: 'You May Also Like',
    viewAllHref: '/products',
  })
  const [moreProducts, setMoreProducts] = React.useState<ProductListItem[]>([])
  const [morePage, setMorePage] = React.useState(1)
  const [hasMoreProducts, setHasMoreProducts] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<'not_found' | 'network' | null>(null)
  const [fallbackProducts, setFallbackProducts] = React.useState<ProductListItem[]>([])
  const [reloadNonce, setReloadNonce] = React.useState(0)
  const [selectedImageIdx, setSelectedImageIdx] = React.useState(0)
  const galleryRef = React.useRef<HTMLDivElement | null>(null)
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | undefined>()

  React.useEffect(() => {
    setSelectedImageIdx(0)
    if (galleryRef.current) {
      galleryRef.current.scrollLeft = 0
    }
  }, [slug])

  const scrollToImage = React.useCallback(
    (targetIdx: number) => {
      if (!product || product.images.length === 0) return
      const wrapped = ((targetIdx % product.images.length) + product.images.length) % product.images.length
      const container = galleryRef.current
      if (container && container.clientWidth > 0) {
        container.scrollTo({ left: wrapped * container.clientWidth, behavior: 'smooth' })
      }
      setSelectedImageIdx(wrapped)
    },
    [product],
  )

  const handleGalleryScroll = React.useCallback(() => {
    const container = galleryRef.current
    if (!container || container.clientWidth === 0 || !product || product.images.length <= 1) return
    const idx = Math.round(container.scrollLeft / container.clientWidth)
    if (idx >= 0 && idx < product.images.length) {
      setSelectedImageIdx(idx)
    }
  }, [product])
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
  const {
    items: recentlyViewed,
    addProduct: addRecentlyViewed,
    removeBySlug: removeRecentlyViewedBySlug,
  } = useRecentlyViewedStore()

  // Write Review state (Verified buyers who ordered this product only)
  const [reviewEligibility, setReviewEligibility] = React.useState<ReviewEligibility | null>(null)
  const [showReviewForm, setShowReviewForm] = React.useState(false)
  const [reviewRating, setReviewRating] = React.useState(5)
  const [reviewTitle, setReviewTitle] = React.useState('')
  const [reviewComment, setReviewComment] = React.useState('')
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)

  React.useEffect(() => {
    if (!isAuthenticated || !product?.id) {
      setReviewEligibility(null)
      return
    }
    let active = true
    api
      .get<ReviewEligibility>(`/api/reviews/eligibility/${product.id}`)
      .then(({ data }) => {
        if (active) setReviewEligibility(data)
      })
      .catch(() => {
        if (active) setReviewEligibility(null)
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, product?.id])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!isAuthenticated) {
      toast('Please sign in to write a review', { icon: '✍️' })
      openAuthModal('login')
      return
    }
    if (reviewEligibility && !reviewEligibility.hasOrdered) {
      toast.error('You can submit a rating and review once your order for this item is delivered.')
      return
    }
    if (!reviewComment.trim()) {
      toast.error('Please share your review comment.')
      return
    }
    setIsSubmittingReview(true)
    try {
      const { data } = await api.post<Review>('/api/reviews', {
        productId: product.id,
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        comment: reviewComment.trim(),
      })
      const nextReviews = [data, ...reviews]
      setReviews(nextReviews)
      const nextCount = nextReviews.length
      const nextAvg = nextCount > 0 ? nextReviews.reduce((s, r) => s + r.rating, 0) / nextCount : reviewRating
      setProduct((prev) => (prev ? { ...prev, averageRating: nextAvg, reviewCount: nextCount } : prev))
      setReviewEligibility({ canReview: false, hasOrdered: true, hasAlreadyReviewed: true })
      invalidateFrontendCatalogCache()
      setReviewTitle('')
      setReviewComment('')
      setReviewRating(5)
      setShowReviewForm(false)
      toast.success('Thank you! Your verified review has been published.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Unable to submit review')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  React.useEffect(() => {
    let active = true

    const applyProductState = (p: Product) => {
      setProduct(p)
      setSelectedImageIdx(0)
      setQuantity(1)
      addRecentlyViewed({
        id: p.id,
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        primaryImageUrl: p.images?.[0]?.url,
        categoryName: p.categoryName,
        averageRating: p.averageRating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        stock: p.stock ?? p.stockQuantity ?? 0,
        isFeatured: !!p.isFeatured,
      })

      setSelectedVariantId(p.variants?.length > 0 ? p.variants[0].id : undefined)

      const catLower = (p.categoryName || '').toLowerCase()
      const nameLower = (p.name || '').toLowerCase()
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
    }

    const loadSecondarySections = async (p: Product) => {
      const similarQuery = getSimilarProductQuery(p)
      if (active) {
        setRelatedMeta({ label: similarQuery.label, viewAllHref: similarQuery.viewAllHref })
      }

      const reviewsKey = `/api/reviews/product/${p.id}`
      const similarKey = buildCatalogKey('/api/products', similarQuery.params)
      const catParams = p.categoryId ? { pageSize: 8, categoryId: p.categoryId } : null
      const catKey = catParams ? buildCatalogKey('/api/products', catParams) : null
      const moreParams = { page: 1, pageSize: 8, sortBy: 'featured' }
      const moreKey = buildCatalogKey('/api/products', moreParams)

      const [reviewsSettled, similarSettled, catSettled, moreSettled] = await Promise.allSettled([
        fetchWithCatalogCache<Review[]>(reviewsKey, async () => {
          const r = await api.get<Review[]>(reviewsKey)
          return Array.isArray(r.data) ? r.data : []
        }),
        fetchWithCatalogCache<{ data?: ProductListItem[]; items?: ProductListItem[] }>(similarKey, async () => {
          const r = await api.get<{ data?: ProductListItem[]; items?: ProductListItem[] }>('/api/products', {
            params: similarQuery.params,
          })
          return r.data
        }),
        catParams && catKey
          ? fetchWithCatalogCache<{ data?: ProductListItem[]; items?: ProductListItem[] }>(catKey, async () => {
              const r = await api.get<{ data?: ProductListItem[]; items?: ProductListItem[] }>('/api/products', {
                params: catParams,
              })
              return r.data
            })
          : Promise.resolve(null),
        fetchWithCatalogCache<{ data?: ProductListItem[]; items?: ProductListItem[]; totalPages?: number }>(
          moreKey,
          async () => {
            const r = await api.get<{ data?: ProductListItem[]; items?: ProductListItem[]; totalPages?: number }>(
              '/api/products',
              { params: moreParams },
            )
            return r.data
          },
        ),
      ])

      if (!active) return

      setReviews(reviewsSettled.status === 'fulfilled' ? reviewsSettled.value : [])

      const relatedIds = new Set<string>([p.id])
      const similarList =
        similarSettled.status === 'fulfilled'
          ? (similarSettled.value.items ?? similarSettled.value.data ?? [])
          : []
      const catList =
        catSettled.status === 'fulfilled' && catSettled.value
          ? (catSettled.value.items ?? catSettled.value.data ?? [])
          : []

      const merged: ProductListItem[] = []
      for (const item of [...similarList, ...catList]) {
        if (!relatedIds.has(item.id)) {
          relatedIds.add(item.id)
          merged.push(item)
        }
      }
      setRelated(merged.slice(0, 8))

      if (moreSettled.status === 'fulfilled') {
        const moreList = (moreSettled.value.items ?? moreSettled.value.data ?? []).filter(
          (item) => !relatedIds.has(item.id),
        )
        setMoreProducts(moreList)
        setMorePage(1)
        setHasMoreProducts((moreSettled.value.totalPages ?? 1) > 1)
      } else {
        setMoreProducts([])
        setHasMoreProducts(false)
      }
    }

    const fetchProduct = async () => {
      const detailKey = `/api/products/${slug}`
      const forceRefresh = reloadNonce > 0
      const cached = forceRefresh ? null : peekCatalogCache<Product>(detailKey)

      setLoadError(null)
      setFallbackProducts([])

      if (cached?.data && active) {
        applyProductState(cached.data)
        setIsLoading(false)
        void loadSecondarySections(cached.data)
        if (cached.isFresh) return
      } else {
        setProduct(null)
        setIsLoading(true)
      }

      try {
        const productData = await fetchWithCatalogCache<Product>(
          detailKey,
          async () => {
            const res = await api.get<Product>(detailKey)
            return res.data
          },
          { force: forceRefresh },
        )
        if (!active) return
        applyProductState(productData)
        setLoadError(null)
        setIsLoading(false)
        void loadSecondarySections(productData)
      } catch (err: unknown) {
        if (!active) return
        const apiErr = err as { statusCode?: number; response?: { status?: number } }
        const status = apiErr?.statusCode ?? apiErr?.response?.status ?? 0

        if (status === 404 || status === 400) {
          removeCatalogCacheKey(detailKey)
          removeRecentlyViewedBySlug(slug)
          setProduct(null)
          setLoadError('not_found')

          try {
            const recKey = buildCatalogKey('/api/products', { page: 1, pageSize: 4, sortBy: 'popular' })
            const recRes = await fetchWithCatalogCache<{ data?: ProductListItem[]; items?: ProductListItem[] }>(
              recKey,
              async () => {
                const r = await api.get<{ data?: ProductListItem[]; items?: ProductListItem[] }>('/api/products', {
                  params: { page: 1, pageSize: 4, sortBy: 'popular' },
                })
                return r.data
              },
            )
            if (active) {
              setFallbackProducts((recRes.items ?? recRes.data ?? []).slice(0, 4))
            }
          } catch {
            /* ignore recommendation fallback failure */
          }
        } else if (!cached?.data) {
          setProduct(null)
          setLoadError('network')
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchProduct()
    return () => {
      active = false
    }
  }, [slug, reloadNonce, removeRecentlyViewedBySlug])

  const loadNextMoreProducts = React.useCallback(async () => {
    if (loadingMore || !hasMoreProducts || !product) return
    setLoadingMore(true)
    try {
      const nextPage = morePage + 1
      const res = await api.get<{ data?: ProductListItem[]; items?: ProductListItem[]; totalPages?: number }>('/api/products', {
        params: { page: nextPage, pageSize: 8, sortBy: 'featured' },
      })
      const incoming = res.data.items ?? res.data.data ?? []
      const excludeIds = new Set([product.id, ...related.map((r) => r.id), ...moreProducts.map((m) => m.id)])
      const uniqueIncoming = incoming.filter((p) => !excludeIds.has(p.id))
      setMoreProducts((prev) => [...prev, ...uniqueIncoming])
      setMorePage(nextPage)
      setHasMoreProducts(nextPage < (res.data.totalPages ?? 1))
    } catch {
      setHasMoreProducts(false)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMoreProducts, product, morePage, related, moreProducts])

  React.useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMoreProducts) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextMoreProducts()
        }
      },
      { rootMargin: '250px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreProducts, loadNextMoreProducts])

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

  if (!product) {
    const isNetworkIssue = loadError === 'network'
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
        <div className="max-w-xl mx-auto bg-surface border border-border rounded-2xl p-8 sm:p-10 text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto text-gold">
            {isNetworkIssue ? <RefreshCw className="w-8 h-8" /> : <PackageX className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-3 py-1 rounded-full">
              {isNetworkIssue ? 'Connection Issue' : 'Item Unavailable'}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-beige">
              {isNetworkIssue
                ? 'Unable to Load This Product'
                : 'This Product Has Been Removed or Discontinued'}
            </h1>
            <p className="text-sm text-beige-muted leading-relaxed">
              {isNetworkIssue
                ? 'We could not reach the catalog server to load this item. Please retry in a moment.'
                : 'The link you opened points to an older or removed product that is no longer available in our active catalog.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            {isNetworkIssue ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setReloadNonce((n) => n + 1)}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Retry Loading Product
              </Button>
            ) : (
              <Button variant="primary" size="md" asChild>
                <Link href="/products">Explore Active Collection</Link>
              </Button>
            )}
            <Button variant="outline" size="md" asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>

        {fallbackProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6 gap-4">
              <div>
                <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-1">
                  Recommended For You
                </p>
                <h2 className="font-serif text-2xl font-bold text-beige">
                  Available in Our Active Collection
                </h2>
              </div>
              <Link
                href="/products"
                className="text-xs font-semibold text-gold hover:underline flex items-center gap-1 whitespace-nowrap"
              >
                <span>View Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {fallbackProducts.map((item, idx) => (
                <ProductCard key={item.id} product={item} priority={idx < 4} />
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

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
          {/* Smooth horizontal scrollable gallery */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-2 border border-border group">
            {product.images.length > 0 ? (
              <div
                ref={galleryRef}
                onScroll={handleGalleryScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {product.images.map((img, idx) => (
                  <div key={img.id ?? idx} className="relative w-full h-full flex-shrink-0 snap-center">
                    <Image
                      src={optimizeImageUrl(img.url, 900, 80)}
                      alt={img.altText ?? `${product.name} - view ${idx + 1}`}
                      fill
                      className="object-cover"
                      priority={idx === 0}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-beige-muted/20">
                <ShoppingCart className="w-24 h-24" />
              </div>
            )}
            {discount > 0 && (
              <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <span className="bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-mono font-bold text-xs uppercase px-3 py-1 rounded-full shadow-sm tracking-wider">
                  -{discount}% OFF
                </span>
              </div>
            )}
            {product.images.length > 1 && (
              <>
                <div className="absolute top-4 right-4 z-10 pointer-events-none bg-black/60 text-white text-xs font-mono font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {selectedImageIdx + 1} / {product.images.length}
                </div>
                <button
                  type="button"
                  onClick={() => scrollToImage(selectedImageIdx - 1)}
                  aria-label="Previous product image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-[#E7E5E4] hover:border-[#C5A059] shadow-md flex items-center justify-center text-[#111111] transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToImage(selectedImageIdx + 1)}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-[#E7E5E4] hover:border-[#C5A059] shadow-md flex items-center justify-center text-[#111111] transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/45 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                  {product.images.map((_, i) => (
                    <button
                      key={`gallery-dot-${i}`}
                      type="button"
                      onClick={() => scrollToImage(i)}
                      aria-label={`View image ${i + 1}`}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        i === selectedImageIdx ? 'w-5 bg-[#C5A059]' : 'w-2 bg-white/75 hover:bg-white',
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Scrollable Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {product.images.map((img, i) => (
                <button
                  type="button"
                  key={img.id ?? i}
                  onClick={() => scrollToImage(i)}
                  className={cn(
                    'relative w-20 h-20 flex-shrink-0 snap-start rounded-xl overflow-hidden border-2 transition-all duration-200',
                    i === selectedImageIdx
                      ? 'border-[#C5A059] shadow-md ring-2 ring-[#C5A059]/25'
                      : 'border-[#E7E5E4] hover:border-[#C5A059]/60 opacity-80 hover:opacity-100',
                  )}
                >
                  <Image
                    src={optimizeImageUrl(img.url, 160, 65)}
                    alt={img.altText ?? `Image ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
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

          {/* Rating out of 5 */}
          {(() => {
            const count = reviews.length > 0 ? reviews.length : (product.reviewCount ?? 0)
            const ratingVal =
              reviews.length > 0
                ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
                : (product.averageRating ?? 0)
            return (
              <div className="flex items-center flex-wrap gap-3">
                <div className="inline-flex items-center gap-1.5 bg-surface-2 border border-gold/30 px-2.5 py-1 rounded-full">
                  <span className="text-xs font-bold text-beige tabular-nums">
                    {ratingVal.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-beige-muted">/ 5</span>
                  <Star className="w-3.5 h-3.5 text-gold fill-gold" />
                </div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        ratingVal > 0 && i < Math.round(ratingVal)
                          ? 'text-gold fill-gold'
                          : 'text-beige-muted/30',
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-beige-muted">
                  {count > 0
                    ? `${count} verified buyer ${count === 1 ? 'review' : 'reviews'}`
                    : 'No reviews yet'}
                </span>
              </div>
            )
          })()}

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
              • Free doorstep delivery on all orders ₹999+ and on your first order (₹99 below ₹999 • ₹9 platform fee).
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
              type="button"
              variant="primary"
              size="lg"
              className="w-full sm:flex-1 h-12 min-h-[48px] shrink-0 rounded-xl bg-[#111111] hover:bg-[#1C1917] text-white font-semibold shadow-sm"
              onClick={() => handleAddToCart(false)}
              isLoading={isAddingToCart}
              disabled={effectiveStock === 0}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{effectiveStock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full sm:flex-1 h-12 min-h-[48px] shrink-0 rounded-xl bg-[#C5A059] hover:bg-[#B08D46] text-[#111111] font-bold shadow-sm"
              onClick={() => handleAddToCart(true)}
              isLoading={isAddingToCart}
              disabled={effectiveStock === 0}
            >
              <span>Buy Now</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleWishlist}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              className="w-full sm:w-auto h-12 min-h-[48px] shrink-0 px-4 rounded-xl border border-[#E7E5E4] bg-white hover:border-[#C5A059]"
            >
              <Heart
                className={cn('w-5 h-5 transition-colors', inWishlist ? 'fill-error text-error' : 'text-beige-muted hover:text-error')}
              />
            </Button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Truck, text: 'Free Delivery ₹999+ & 1st Order' },
              { icon: ShieldCheck, text: '100% Quality Checked' },
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
                    Enjoy free doorstep delivery on orders ₹999+ and on a new customer&apos;s first order (₹99 below ₹999, plus ₹9 platform fee). Orders ship in tamper-proof signature packaging with live tracking.
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

      {/* ── Reviews & Verified Buyer Ratings ── */}
      <section className="mb-16">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-beige">
              Ratings &amp; Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h2>
            <p className="text-xs text-beige-muted mt-0.5">
              Verified customer ratings and feedback from NEXUS shoppers.
            </p>
          </div>
          {isAuthenticated && reviewEligibility?.canReview ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewForm((prev) => !prev)}
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </Button>
          ) : isAuthenticated && reviewEligibility?.hasAlreadyReviewed ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <Check className="w-3.5 h-3.5" />
              Reviewed by You
            </span>
          ) : null}
        </div>

        {/* Out of 5 Rating Summary & Breakdown */}
        {(() => {
          const totalRev = reviews.length > 0 ? reviews.length : (product.reviewCount ?? 0)
          const avgScore =
            reviews.length > 0
              ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
              : (product.averageRating ?? 0)
          if (totalRev <= 0 && avgScore <= 0) return null
          return (
            <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center bg-surface-2 border border-gold/30 rounded-2xl px-5 py-4 min-w-[116px]">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold text-beige tabular-nums">
                      {avgScore.toFixed(1)}
                    </span>
                    <span className="text-sm text-beige-muted font-medium">/ 5</span>
                  </div>
                  <div className="flex gap-0.5 mt-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-3.5 h-3.5',
                          i < Math.round(avgScore) ? 'text-gold fill-gold' : 'text-beige-muted/30',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-beige-muted mt-1">
                    {totalRev} {totalRev === 1 ? 'Rating' : 'Ratings'}
                  </span>
                </div>
                <div className="text-xs text-beige-muted space-y-1">
                  <p className="font-semibold text-beige text-sm">Overall Customer Rating</p>
                  <p>Based on verified customer ratings &amp; feedback.</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const starCount = reviews.filter((r) => r.rating === star).length
                  const pct = reviews.length > 0 ? Math.round((starCount / reviews.length) * 100) : 0
                  return (
                    <div key={star} className="flex items-center gap-2.5 text-xs">
                      <span className="w-8 font-medium text-beige flex items-center gap-0.5 tabular-nums">
                        {star}
                        <Star className="w-3 h-3 text-gold fill-gold" />
                      </span>
                      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full bg-gold rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-beige-muted tabular-nums">{starCount}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {showReviewForm && reviewEligibility?.canReview && (
          <form
            onSubmit={handleSubmitReview}
            className="bg-surface border border-gold/40 rounded-2xl p-5 sm:p-6 mb-6 space-y-4 shadow-sm animate-fade-in"
          >
            <div>
              <label className="block text-xs font-semibold text-beige uppercase tracking-wider mb-2">
                Your Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={cn(
                        'w-6 h-6',
                        star <= reviewRating ? 'text-gold fill-gold' : 'text-beige-muted/30',
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs text-beige-muted ml-2">{reviewRating} / 5</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-beige uppercase tracking-wider mb-1.5">
                Review Headline (Optional)
              </label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="e.g. Exceptional fabric & tailored fit"
                className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-beige focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-beige uppercase tracking-wider mb-1.5">
                Your Review
              </label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share details on quality, sizing, and comfort..."
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-beige focus:outline-none focus:border-gold"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingReview}>
                Publish Review
              </Button>
            </div>
          </form>
        )}

        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => {
              const displayName =
                (review as any).userName ||
                (review.user ? `${review.user.firstName} ${review.user.lastName}`.trim() : 'Verified Client')
              const initial = displayName.charAt(0).toUpperCase() || 'N'
              const reviewText = (review as any).comment ?? review.body ?? ''
              return (
                <div key={review.id} className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                        <span className="text-gold text-sm font-bold">{initial}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-beige">{displayName}</p>
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
                  {reviewText && <p className="text-sm text-beige-muted">{reviewText}</p>}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-6 text-center text-xs text-beige-muted">
            No written reviews yet.
          </div>
        )}
      </section>

      {/* ── Smart Similar-Type Suggestions ── */}
      {related.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-1">
                Similar Style
              </p>
              <h2 className="font-serif text-2xl font-bold text-beige">{relatedMeta.label}</h2>
            </div>
            <Link
              href={relatedMeta.viewAllHref}
              className="text-xs font-semibold text-gold hover:underline flex items-center gap-1 whitespace-nowrap"
            >
              <span>View All Similar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((relProd, idx) => (
              <ProductCard key={relProd.id} product={relProd} priority={idx < 4} />
            ))}
          </div>
        </section>
      )}

      {/* ── Discover More Products on Scroll ── */}
      {moreProducts.length > 0 && (
        <section className="pt-10 border-t border-border">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <p className="text-xs text-gold uppercase tracking-widest font-semibold mb-1">
                Keep Exploring
              </p>
              <h2 className="font-serif text-2xl font-bold text-beige">
                More Pieces From NEXUS
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 border border-border hover:border-gold/60 text-beige hover:text-gold px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <span>View All Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {moreProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>

          <div ref={loadMoreRef} className="mt-10 flex justify-center">
            {hasMoreProducts && (
              <Button
                variant="outline"
                size="md"
                onClick={loadNextMoreProducts}
                isLoading={loadingMore}
              >
                {loadingMore ? 'Loading More Pieces...' : 'Explore More Products'}
              </Button>
            )}
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
