'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SlidersHorizontal, X, ChevronDown, ChevronRight, Search, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import api from '@/lib/api'
import type { ProductListItem, PagedResult, ProductFilters } from '@/types'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Highest Rated' },
]

const PRICE_RANGES = [
  { label: 'Under ₹2,000', min: 0, max: 2000 },
  { label: '₹2,000 – ₹5,000', min: 2000, max: 5000 },
  { label: '₹5,000 – ₹15,000', min: 5000, max: 15000 },
  { label: '₹15,000 – ₹50,000', min: 15000, max: 50000 },
  { label: 'Above ₹50,000', min: 50000, max: undefined },
]

// AJIO / SHEIN Multi-level Category Tree
const CATEGORY_TREE = [
  {
    name: 'Men',
    slug: 'men',
    subcategories: [
      { name: "T-Shirts & Polos", slug: 'men-t-shirts' },
      { name: "Shirts", slug: 'men-shirts' },
      { name: "Denim & Jeans", slug: 'men-denim' },
      { name: "Footwear & Sneakers", slug: 'men-footwear' },
      { name: "Activewear", slug: 'men-activewear' },
      { name: "Innerwear & Lounge", slug: 'men-innerwear' },
      { name: "Shorts & Cargo", slug: 'men-shorts' },
    ],
  },
  {
    name: 'Women',
    slug: 'women',
    subcategories: [
      { name: "Dresses & Western", slug: 'women-dresses' },
      { name: "Tops & Tees", slug: 'women-tops' },
      { name: "Denim & Trousers", slug: 'women-denim' },
      { name: "Ethnic Wear & Kurtas", slug: 'women-ethnic' },
      { name: "Footwear & Heels", slug: 'women-footwear' },
      { name: "Handbags & Clutches", slug: 'women-handbags' },
    ],
  },
  {
    name: 'Kids',
    slug: 'kids',
    subcategories: [
      { name: "Boys Apparel", slug: 'kids-boys' },
      { name: "Girls Apparel", slug: 'kids-girls' },
      { name: "Kids Footwear", slug: 'kids-footwear' },
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    subcategories: [
      { name: "Sneakers", slug: 'footwear' },
      { name: "Formal Shoes", slug: 'footwear' },
      { name: "Loafers", slug: 'footwear' },
    ],
  },
  {
    name: 'Luxury Watches',
    slug: 'watches',
    subcategories: [
      { name: "Automatic Chronographs", slug: 'watches' },
    ],
  },
  {
    name: 'Accessories & Fragrances',
    slug: 'accessories',
    subcategories: [
      { name: "Italian Briefcases", slug: 'accessories' },
      { name: "Haute Fragrances", slug: 'fragrances' },
      { name: "Fine Jewelry", slug: 'jewelry' },
    ],
  },
]

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [result, setResult] = React.useState<PagedResult<ProductListItem> | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  // Filters from URL
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const subCategory = searchParams.get('subCategory') ?? ''
  const sortBy = (searchParams.get('sort') ?? 'newest') as ProductFilters['sortBy']
  const page = Number(searchParams.get('page') ?? '1')
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  const inStock = searchParams.get('inStock') === 'true'
  const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined

  const updateParam = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  // Active Category info for quick subcategory bar
  const activeCategoryObj = CATEGORY_TREE.find((c) => c.slug === category)

  React.useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const { data } = await api.get<PagedResult<ProductListItem>>('/api/products', {
          params: {
            search: search || undefined,
            category: category || undefined,
            subCategory: subCategory || undefined,
            sortBy,
            page,
            pageSize: 16,
            minPrice,
            maxPrice,
            inStock: inStock || undefined,
            minRating,
          },
        })
        setResult(data)
      } catch {
        setResult(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [search, category, subCategory, sortBy, page, minPrice, maxPrice, inStock, minRating])

  const hasFilters = !!(search || category || subCategory || minPrice || maxPrice || inStock || minRating)

  const clearAllFilters = () => {
    router.push('/products')
  }

  const Sidebar = () => (
    <aside className="space-y-6">
      {/* Category Tree (AJIO / SHEIN style) */}
      <div>
        <h3 className="font-semibold text-gold text-xs uppercase tracking-wider mb-3">
          Departments & Categories
        </h3>
        <div className="space-y-1 text-xs">
          <button
            onClick={() => {
              updateParam('category', undefined)
              updateParam('subCategory', undefined)
            }}
            className={cn(
              'w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between font-medium',
              !category && !subCategory
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-beige-muted hover:text-beige hover:bg-surface-2',
            )}
          >
            <span>All Departments</span>
            <ChevronRight className="w-3 h-3 text-gold/60" />
          </button>

          {CATEGORY_TREE.map((cat) => {
            const isCatActive = category === cat.slug
            return (
              <div key={cat.name} className="space-y-1 pt-1">
                <button
                  onClick={() => {
                    updateParam('category', isCatActive ? undefined : cat.slug)
                    updateParam('subCategory', undefined)
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between font-medium',
                    isCatActive && !subCategory
                      ? 'bg-gold/15 text-gold border border-gold/30'
                      : 'text-beige-muted hover:text-beige hover:bg-surface-2',
                  )}
                >
                  <span className="font-semibold">{cat.name}</span>
                  <ChevronDown
                    className={cn('w-3 h-3 transition-transform text-gold', isCatActive && 'rotate-180')}
                  />
                </button>

                {/* Subcategories list */}
                {isCatActive && (
                  <div className="pl-3 space-y-1 border-l-2 border-gold/20 ml-2 py-1">
                    {cat.subcategories.map((sub) => {
                      const isSubActive = subCategory === sub.slug
                      return (
                        <button
                          key={sub.name}
                          onClick={() => updateParam('subCategory', isSubActive ? undefined : sub.slug)}
                          className={cn(
                            'w-full text-left px-2 py-1 rounded text-xs transition-colors block truncate',
                            isSubActive
                              ? 'text-gold font-bold bg-gold/10'
                              : 'text-beige-muted/80 hover:text-beige',
                          )}
                        >
                          • {sub.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* In Stock */}
      <div>
        <h3 className="font-semibold text-beige text-xs uppercase tracking-wider mb-3">Availability</h3>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 accent-gold"
            checked={inStock}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : undefined)}
          />
          <span className="text-xs text-beige-muted group-hover:text-beige transition-colors">
            In Stock Only
          </span>
        </label>
      </div>

      <div className="h-px bg-border" />

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-beige text-xs uppercase tracking-wider mb-3">Price Range</h3>
        <div className="space-y-1.5">
          {PRICE_RANGES.map((range) => {
            const active = minPrice === range.min && maxPrice === range.max
            return (
              <button
                key={range.label}
                onClick={() =>
                  active
                    ? (updateParam('minPrice', undefined), updateParam('maxPrice', undefined))
                    : (updateParam('minPrice', String(range.min)),
                       updateParam('maxPrice', range.max ? String(range.max) : undefined))
                }
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                  active
                    ? 'bg-gold/15 text-gold border border-gold/30 font-medium'
                    : 'text-beige-muted hover:text-beige hover:bg-surface-2',
                )}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Rating */}
      <div>
        <h3 className="font-semibold text-beige text-xs uppercase tracking-wider mb-3">Customer Rating</h3>
        <div className="space-y-1.5">
          {[4, 3].map((rating) => (
            <button
              key={rating}
              onClick={() =>
                minRating === rating
                  ? updateParam('minRating', undefined)
                  : updateParam('minRating', String(rating))
              }
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2',
                minRating === rating
                  ? 'bg-gold/15 text-gold border border-gold/30 font-medium'
                  : 'text-beige-muted hover:text-beige hover:bg-surface-2',
              )}
            >
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)} & up
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-error hover:text-error hover:bg-error/10 text-xs"
          onClick={clearAllFilters}
        >
          <X className="w-3.5 h-3.5" />
          Reset All Filters
        </Button>
      )}
    </aside>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Page Title & Search Term Banner ── */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-beige capitalize flex items-center gap-2">
          {category ? `${category.replace('-', ' ')} Collection` : 'All Luxury Collections'}
          {search && (
            <span className="text-base font-normal text-beige-muted font-sans">
              matching &ldquo;<span className="text-gold font-medium">{search}</span>&rdquo;
            </span>
          )}
        </h1>
        <p className="text-xs text-beige-muted mt-1">
          {result?.totalCount ?? 0} mastercrafted items ready for doorstep delivery
        </p>
      </div>

      {/* ── Subcategory Quick Navigation Bar (When Category is selected) ── */}
      {activeCategoryObj && activeCategoryObj.subcategories.length > 0 && (
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => updateParam('subCategory', undefined)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
              !subCategory
                ? 'bg-gold text-background border-gold shadow-md shadow-gold/20'
                : 'bg-surface-2 border-border text-beige-muted hover:text-beige hover:border-gold/30',
            )}
          >
            All {activeCategoryObj.name}
          </button>
          {activeCategoryObj.subcategories.map((sub) => {
            const isSubSelected = subCategory === sub.slug
            return (
              <button
                key={sub.name}
                onClick={() => updateParam('subCategory', isSubSelected ? undefined : sub.slug)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                  isSubSelected
                    ? 'bg-gold text-background border-gold shadow-md shadow-gold/20'
                    : 'bg-surface-2 border-border text-beige-muted hover:text-beige hover:border-gold/30',
                )}
              >
                {sub.name}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Active Filters Bar ── */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap mb-6 bg-surface-2/60 border border-border rounded-xl p-3">
          <span className="text-xs font-semibold text-beige-muted">Active Filters:</span>
          {category && (
            <Badge variant="gold" className="flex items-center gap-1 text-xs">
              Category: {category}
              <button onClick={() => updateParam('category', undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {subCategory && (
            <Badge variant="gold" className="flex items-center gap-1 text-xs">
              Subcategory: {subCategory}
              <button onClick={() => updateParam('subCategory', undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {search && (
            <Badge variant="gold" className="flex items-center gap-1 text-xs">
              Query: {search}
              <button onClick={() => updateParam('search', undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {inStock && (
            <Badge variant="gold" className="flex items-center gap-1 text-xs">
              In Stock Only
              <button onClick={() => updateParam('inStock', undefined)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {(minPrice !== undefined || maxPrice !== undefined) && (
            <Badge variant="gold" className="flex items-center gap-1 text-xs">
              ₹{minPrice ?? 0} – {maxPrice ? `₹${maxPrice}` : 'Above'}
              <button
                onClick={() => {
                  updateParam('minPrice', undefined)
                  updateParam('maxPrice', undefined)
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-error hover:underline ml-auto font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* ── Sort & Mobile Filter Toggle ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs text-beige hover:border-gold/40 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-gold" />
          <span>Filters</span>
          {hasFilters && <span className="w-2 h-2 rounded-full bg-gold" />}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-beige-muted hidden sm:block">Sort By:</span>
          <select
            value={sortBy ?? 'newest'}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface text-beige">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main Layout (Sidebar + Product Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-40 bg-surface border border-border rounded-2xl p-5">
            <Sidebar />
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : result && result.items && result.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => updateParam('page', String(page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-beige-muted px-3">
                    Page {result.page} of {result.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= result.totalPages}
                    onClick={() => updateParam('page', String(page + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-surface border border-border rounded-2xl p-8 space-y-4">
              <Search className="w-12 h-12 text-gold/40 mx-auto" />
              <h3 className="font-serif text-xl font-bold text-beige">No products found</h3>
              <p className="text-xs text-beige-muted max-w-md mx-auto">
                We couldn&rsquo;t find anything matching your selected filters. Try broadening your criteria or reset filters to see our full catalogue.
              </p>
              <Button variant="primary" size="sm" onClick={clearAllFilters}>
                Browse All Collections
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-surface border-r border-border p-6 overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2 text-beige font-semibold text-sm">
                <SlidersHorizontal className="w-4 h-4 text-gold" />
                <span>Filters</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-beige-muted">
          Loading catalog...
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  )
}
