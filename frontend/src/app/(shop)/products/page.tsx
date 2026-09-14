'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react'
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
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
  { label: '₹5,000 – ₹20,000', min: 5000, max: 20000 },
  { label: '₹20,000 – ₹50,000', min: 20000, max: 50000 },
  { label: 'Above ₹50,000', min: 50000, max: undefined },
]

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [result, setResult] = React.useState<PagedResult<ProductListItem> | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  // Filters from URL
  const search = searchParams.get('search') ?? ''
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

  React.useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      try {
        const { data } = await api.get<PagedResult<ProductListItem>>('/api/products', {
          params: { search, sortBy, page, pageSize: 12, minPrice, maxPrice, inStock: inStock || undefined, minRating },
        })
        setResult(data)
      } catch {
        setResult(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [search, sortBy, page, minPrice, maxPrice, inStock, minRating])

  const hasFilters = !!(minPrice || maxPrice || inStock || minRating)

  const Sidebar = () => (
    <aside className="space-y-6">
      {/* In Stock */}
      <div>
        <h3 className="font-medium text-beige text-sm mb-3 uppercase tracking-wider">Availability</h3>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            className="w-4 h-4 accent-gold"
            checked={inStock}
            onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : undefined)}
          />
          <span className="text-sm text-beige-muted group-hover:text-beige transition-colors">
            In Stock Only
          </span>
        </label>
      </div>

      <div className="h-px bg-border" />

      {/* Price Range */}
      <div>
        <h3 className="font-medium text-beige text-sm mb-3 uppercase tracking-wider">Price Range</h3>
        <div className="space-y-2">
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
                  'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                  active
                    ? 'bg-gold/10 text-gold border border-gold/30'
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
        <h3 className="font-medium text-beige text-sm mb-3 uppercase tracking-wider">Min Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2].map((rating) => (
            <button
              key={rating}
              onClick={() =>
                minRating === rating
                  ? updateParam('minRating', undefined)
                  : updateParam('minRating', String(rating))
              }
              className={cn(
                'w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2',
                minRating === rating
                  ? 'bg-gold/10 text-gold border border-gold/30'
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
          className="w-full text-error hover:text-error hover:bg-error/10"
          onClick={() => router.push('/products')}
        >
          <X className="w-3.5 h-3.5" />
          Clear All Filters
        </Button>
      )}
    </aside>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-beige mb-2">
          {search ? `Results for "${search}"` : 'All Products'}
        </h1>
        <p className="text-beige-muted text-sm">
          {result ? `${(result.totalCount ?? result.total ?? (result.items?.length || result.data?.length || 0)).toLocaleString()} products found` : 'Discover our full collection'}
        </p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24 bg-surface border border-border rounded-xl p-5">
            <h2 className="font-medium text-beige mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gold" />
              Filters
              {hasFilters && (
                <Badge variant="gold" className="ml-auto text-xs">Active</Badge>
              )}
            </h2>
            <Sidebar />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded text-sm text-beige-muted hover:text-beige hover:border-gold/40 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasFilters && <span className="w-2 h-2 rounded-full bg-gold" />}
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-beige-muted hidden sm:block">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="appearance-none bg-surface border border-border rounded px-3 pr-8 py-2 text-sm text-beige focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-surface">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-beige-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Mobile sidebar */}
          {sidebarOpen && (
            <div className="lg:hidden bg-surface border border-border rounded-xl p-5 mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-beige">Filters</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-4 h-4 text-beige-muted" />
                </button>
              </div>
              <Sidebar />
            </div>
          )}

          {/* Product Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : result && (result.items?.length || result.data?.length) ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {(result.items ?? result.data ?? []).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!(result.hasPreviousPage ?? page > 1)}
                    onClick={() => updateParam('page', String(page - 1))}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: result.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === result.totalPages || Math.abs(p - page) <= 2)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="text-beige-muted px-1">…</span>
                        )}
                        <button
                          onClick={() => updateParam('page', String(p))}
                          className={cn(
                            'w-9 h-9 rounded text-sm font-medium transition-colors',
                            p === page
                              ? 'gold-gradient text-background'
                              : 'text-beige-muted hover:text-beige hover:bg-surface-2',
                          )}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!(result.hasNextPage ?? page < result.totalPages)}
                    onClick={() => updateParam('page', String(page + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-beige-muted/40" />
              </div>
              <h3 className="font-serif text-2xl text-beige mb-2">No products found</h3>
              <p className="text-beige-muted mb-6">
                Try adjusting your filters or search terms
              </p>
              <Button variant="outline" onClick={() => router.push('/products')}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  )
}
