// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  role: 'customer' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  phoneNumber?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
  parentId?: string
  children?: Category[]
  productCount?: number
  createdAt: string
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string
  url: string
  altText?: string
  isPrimary: boolean
  sortOrder: number
}

export interface ProductVariant {
  id: string
  productId?: string
  name: string
  value?: string
  sku?: string
  price?: number
  priceModifier?: number
  compareAtPrice?: number
  stockQuantity?: number
  stock?: number
  attributes?: Record<string, string>
  imageUrl?: string
  isActive?: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription?: string
  sku?: string
  price: number
  compareAtPrice?: number
  stockQuantity?: number
  stock?: number
  categoryId?: string
  category?: Category
  categoryName?: string
  images: ProductImage[]
  variants: ProductVariant[]
  tags?: string[] | string
  averageRating: number
  reviewCount: number
  isActive?: boolean
  isFeatured?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductListItem {
  id: string
  name: string
  slug: string
  shortDescription?: string
  price: number
  compareAtPrice?: number
  primaryImage?: string
  primaryImageUrl?: string
  category?: Pick<Category, 'id' | 'name' | 'slug'>
  categoryName?: string
  averageRating: number
  reviewCount: number
  stockQuantity?: number
  stock?: number
  isFeatured: boolean
  isActive?: boolean
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string
  cartId?: string
  productId: string
  product?: ProductListItem
  productName?: string
  productSlug?: string
  productImageUrl?: string
  variantId?: string
  variant?: ProductVariant
  variantName?: string
  variantValue?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  availableStock?: number
}

export interface Cart {
  id: string
  userId?: string
  sessionId?: string
  items: CartItem[]
  subtotal: number
  subTotal?: number
  discountAmount?: number
  couponCode?: string
  total: number
  itemCount: number
  totalItems?: number
  createdAt: string
  updatedAt: string
}

// ─── Address ──────────────────────────────────────────────────────────────────

export interface Address {
  id: string
  userId?: string
  fullName: string
  phone?: string
  phoneNumber?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pinCode?: string
  postalCode?: string
  country?: string
  isDefault?: boolean
  landmark?: string
  addressType?: string
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrderItem {
  id: string
  orderId?: string
  productId: string
  product?: Pick<ProductListItem, 'id' | 'name' | 'slug' | 'primaryImage'>
  productName?: string
  productImageUrl?: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Order {
  id: string
  orderNumber: string
  userId?: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod?: string
  items: OrderItem[]
  shippingAddress?: Address
  shippingName?: string
  shippingPhone?: string
  shippingAddressLine1?: string
  shippingAddressLine2?: string
  shippingCity?: string
  shippingState?: string
  shippingPinCode?: string
  subtotal?: number
  subTotal?: number
  shippingCost?: number
  discountAmount?: number
  discount?: number
  couponCode?: string
  total?: number
  totalAmount?: number
  notes?: string
  trackingNumber?: string
  createdAt: string
  paidAt?: string
  shippedAt?: string
  deliveredAt?: string
  updatedAt?: string
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  productId: string
  userId: string
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>
  rating: number
  title?: string
  body: string
  isVerifiedPurchase: boolean
  createdAt: string
}

export interface CreateReviewRequest {
  productId: string
  rating: number
  title?: string
  body: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  data?: T[]
  items?: T[]
  total?: number
  totalCount?: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface ProductFilters {
  search?: string
  categorySlug?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  minRating?: number
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating'
  page?: number
  pageSize?: number
  featured?: boolean
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id: string
  userId: string
  productId: string
  product: ProductListItem
  createdAt: string
}

export interface Wishlist {
  items: WishlistItem[]
  total: number
}

export interface CouponValidation {
  isValid: boolean
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountAmount: number
  message?: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface RecentOrderDto {
  orderNumber: string
  customerName: string
  total: number
  status: string
  createdAt: string
}

export interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  totalProducts: number
  lowStockProducts: number
  totalCustomers: number
  totalRevenue: number
  revenueToday: number
  revenueThisMonth: number
  recentOrders: RecentOrderDto[]
}
