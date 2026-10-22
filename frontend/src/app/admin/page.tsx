'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Edit2,
  Eye,
  Truck,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  X,
  Tag,
  FolderTree,
  Ticket,
  Sliders,
  Settings,
  BarChart3,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { DashboardStats, Order, ProductListItem, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CustomerDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  createdAt: string
  isActive: boolean
  totalOrders: number
  totalSpent: number
}

interface CouponDto {
  id: string
  code: string
  description?: string
  discountType: string | number
  discountValue: number
  minOrderValue?: number
  maxDiscountAmount?: number
  usageLimit?: number
  timesUsed: number
  isActive: boolean
  expiresAt?: string
}

function AdminContent() {
  const { user, isAuthenticated, logout } = useAuthStore()

  // Navigation state
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'products' | 'categories' | 'orders' | 'coupons' | 'customers' | 'settings'
  >('overview')

  // Main data states
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [products, setProducts] = React.useState<ProductListItem[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [coupons, setCoupons] = React.useState<CouponDto[]>([])
  const [customers, setCustomers] = React.useState<CustomerDto[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters & searches
  const [prodSearch, setProdSearch] = React.useState('')
  const [prodCatFilter, setProdCatFilter] = React.useState('all')
  const [orderStatusFilter, setOrderStatusFilter] = React.useState('all')
  const [orderSearch, setOrderSearch] = React.useState('')
  const [customerSearch, setCustomerSearch] = React.useState('')

  // Modals state
  const [showAddProductModal, setShowAddProductModal] = React.useState(false)
  const [showEditProductModal, setShowEditProductModal] = React.useState(false)
  const [selectedProductToEdit, setSelectedProductToEdit] = React.useState<ProductListItem | null>(null)
  const [inspectOrder, setInspectOrder] = React.useState<Order | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = React.useState(false)
  const [showAddCouponModal, setShowAddCouponModal] = React.useState(false)

  // Add Product Form state
  const [newProd, setNewProd] = React.useState({
    name: '',
    categoryId: '',
    price: '',
    compareAtPrice: '',
    stock: '',
    sku: '',
    tags: '',
    shortDescription: '',
    description: '',
    imageUrl: '',
    isFeatured: false,
  })
  const [isSubmittingProd, setIsSubmittingProd] = React.useState(false)

  // Quick edit form state
  const [editPrice, setEditPrice] = React.useState('')
  const [editStock, setEditStock] = React.useState('')
  const [isUpdatingProd, setIsUpdatingProd] = React.useState(false)

  // Order status update state
  const [orderStatusUpdate, setOrderStatusUpdate] = React.useState('')
  const [orderTrackingUpdate, setOrderTrackingUpdate] = React.useState('')
  const [isUpdatingOrder, setIsUpdatingOrder] = React.useState(false)

  // Add Category form state
  const [newCat, setNewCat] = React.useState({
    name: '',
    description: '',
    imageUrl: '',
  })
  const [isSubmittingCat, setIsSubmittingCat] = React.useState(false)

  // Add Coupon form state
  const [newCoupon, setNewCoupon] = React.useState({
    code: '',
    description: '',
    discountType: 'percentage', // percentage or fixed
    discountValue: '',
    minOrderValue: '1000',
    maxDiscountAmount: '5000',
    usageLimit: '100',
    expiresInDays: '30',
  })
  const [isSubmittingCoupon, setIsSubmittingCoupon] = React.useState(false)

  const isAdmin = user?.role === 'admin' || (user?.role as unknown as string) === 'Admin'

  // Fetch all admin data
  const fetchAllData = React.useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return
    setLoading(true)
    try {
      const [dashRes, ordRes, prodRes, catRes, coupRes, custRes] = await Promise.all([
        api.get<DashboardStats>('/api/admin/dashboard').catch(() => null),
        api.get<any>('/api/admin/orders?pageSize=100').catch(() => null),
        api.get<any>('/api/admin/products?pageSize=100').catch(() => null),
        api.get<Category[]>('/api/categories').catch(() => null),
        api.get<CouponDto[]>('/api/coupons').catch(() => null),
        api.get<any>('/api/admin/customers?pageSize=100').catch(() => null),
      ])

      if (dashRes?.data) setStats(dashRes.data)

      const ordList = ordRes?.data?.items ?? ordRes?.data?.Items ?? ordRes?.data?.data ?? []
      setOrders(Array.isArray(ordList) ? ordList : [])

      const prodList = prodRes?.data?.items ?? prodRes?.data?.Items ?? prodRes?.data?.data ?? []
      setProducts(Array.isArray(prodList) ? prodList : [])

      if (catRes?.data) {
        setCategories(catRes.data)
        if (catRes.data.length > 0 && !newProd.categoryId) {
          setNewProd((p) => ({ ...p, categoryId: catRes.data[0].id }))
        }
      }

      if (coupRes?.data) setCoupons(coupRes.data)

      const custList = custRes?.data?.items ?? custRes?.data?.Items ?? custRes?.data?.data ?? []
      setCustomers(Array.isArray(custList) ? custList : [])
    } catch {
      toast.error('Failed to load portal data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, isAdmin, newProd.categoryId])

  React.useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background text-beige flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <Shield className="w-12 h-12 text-gold mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-beige">NEXUS Control Center</h1>
          <p className="text-sm text-beige-muted">
            You must be signed in with an administrative account to access the control panel.
          </p>
          <div className="bg-surface-2 p-3.5 rounded-xl text-xs text-beige-muted text-left border border-border">
            <span className="text-gold font-mono font-semibold">Demo Administrator Account:</span>
            <br />
            Email: <span className="text-beige font-mono">admin@nexus.com</span>
            <br />
            Password: <span className="text-beige font-mono">Admin@123456</span>
          </div>
          <Button variant="primary" size="md" className="w-full" asChild>
            <Link href="/">Return to Storefront</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ─── CRUD HANDLERS ────────────────────────────────────────────────────────

  // Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProd.name || !newProd.price || !newProd.categoryId) {
      toast.error('Please specify title, category, and price')
      return
    }

    setIsSubmittingProd(true)
    try {
      const payload = {
        name: newProd.name.trim(),
        description: newProd.description.trim() || newProd.name.trim(),
        shortDescription: newProd.shortDescription.trim() || null,
        price: parseFloat(newProd.price),
        compareAtPrice: newProd.compareAtPrice ? parseFloat(newProd.compareAtPrice) : null,
        stock: parseInt(newProd.stock || '10', 10),
        sku: newProd.sku.trim() || null,
        tags: newProd.tags.trim() || null,
        categoryId: newProd.categoryId,
        isFeatured: newProd.isFeatured,
        trackInventory: true,
        imageUrl: newProd.imageUrl.trim() || null,
      }

      await api.post('/api/products', payload)
      toast.success('Product published to catalog! 🎉')
      setShowAddProductModal(false)
      setNewProd({
        name: '',
        categoryId: categories[0]?.id ?? '',
        price: '',
        compareAtPrice: '',
        stock: '',
        sku: '',
        tags: '',
        shortDescription: '',
        description: '',
        imageUrl: '',
        isFeatured: false,
      })
      fetchAllData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create product')
    } finally {
      setIsSubmittingProd(false)
    }
  }

  // Quick Edit Product
  const handleOpenEditProduct = (prod: ProductListItem) => {
    setSelectedProductToEdit(prod)
    setEditPrice(String(prod.price))
    setEditStock(String(prod.stock ?? prod.stockQuantity ?? 0))
    setShowEditProductModal(true)
  }

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductToEdit) return
    setIsUpdatingProd(true)
    try {
      await api.put(`/api/products/${selectedProductToEdit.id}`, {
        name: selectedProductToEdit.name,
        description: selectedProductToEdit.shortDescription || selectedProductToEdit.name,
        price: parseFloat(editPrice),
        stock: parseInt(editStock, 10),
        categoryId: selectedProductToEdit.category?.id ?? categories[0]?.id,
        isActive: selectedProductToEdit.isActive !== false,
        isFeatured: selectedProductToEdit.isFeatured,
        trackInventory: true,
      })
      toast.success('Inventory updated!')
      setShowEditProductModal(false)
      fetchAllData()
    } catch {
      toast.error('Failed to update product')
    } finally {
      setIsUpdatingProd(false)
    }
  }

  // Toggle Product Active
  const handleToggleProduct = async (prodId: string) => {
    try {
      const res = await api.patch<{ isActive: boolean }>(`/api/admin/products/${prodId}/toggle`)
      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, isActive: res.data.isActive } : p))
      )
      toast.success(`Product is now ${res.data.isActive ? 'Active' : 'Inactive'}`)
    } catch {
      toast.error('Failed to toggle status')
    }
  }

  // Delete Product
  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm('Are you sure you want to deactivate and remove this piece?')) return
    try {
      await api.delete(`/api/products/${prodId}`)
      setProducts((prev) => prev.filter((p) => p.id !== prodId))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    }
  }

  // Inspect & Update Order
  const handleOpenInspectOrder = (order: Order) => {
    setInspectOrder(order)
    setOrderStatusUpdate(order.status)
    setOrderTrackingUpdate(order.trackingNumber ?? '')
  }

  const handleSaveOrderStatus = async () => {
    if (!inspectOrder) return
    setIsUpdatingOrder(true)
    try {
      await api.patch(`/api/admin/orders/${inspectOrder.id}/status`, {
        status: orderStatusUpdate,
        trackingNumber: orderTrackingUpdate.trim() || null,
      })
      toast.success(`Order marked as ${orderStatusUpdate}!`)
      setOrders((prev) =>
        prev.map((o) =>
          o.id === inspectOrder.id
            ? { ...o, status: orderStatusUpdate as any, trackingNumber: orderTrackingUpdate.trim() || undefined }
            : o
        )
      )
      setInspectOrder((prev) =>
        prev
          ? { ...prev, status: orderStatusUpdate as any, trackingNumber: orderTrackingUpdate.trim() || undefined }
          : null
      )
    } catch {
      toast.error('Failed to update order')
    } finally {
      setIsUpdatingOrder(false)
    }
  }

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCat.name.trim()) return
    setIsSubmittingCat(true)
    try {
      await api.post('/api/categories', {
        name: newCat.name.trim(),
        description: newCat.description.trim() || null,
        imageUrl: newCat.imageUrl.trim() || null,
        sortOrder: categories.length + 1,
      })
      toast.success('Category created!')
      setShowAddCategoryModal(false)
      setNewCat({ name: '', description: '', imageUrl: '' })
      fetchAllData()
    } catch {
      toast.error('Failed to create category')
    } finally {
      setIsSubmittingCat(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this collection category?')) return
    try {
      await api.delete(`/api/categories/${id}`)
      setCategories(categories.filter((c) => c.id !== id))
      toast.success('Category deleted')
    } catch {
      toast.error('Failed to delete category')
    }
  }

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCoupon.code.trim() || !newCoupon.discountValue) return
    setIsSubmittingCoupon(true)
    try {
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + parseInt(newCoupon.expiresInDays || '30', 10))

      await api.post('/api/coupons', {
        code: newCoupon.code.trim().toUpperCase(),
        description: newCoupon.description.trim() || null,
        discountType: newCoupon.discountType === 'percentage' ? 0 : 1, // 0=Percentage, 1=Fixed
        discountValue: parseFloat(newCoupon.discountValue),
        minOrderValue: parseFloat(newCoupon.minOrderValue || '0'),
        maxDiscountAmount: parseFloat(newCoupon.maxDiscountAmount || '0'),
        usageLimit: parseInt(newCoupon.usageLimit || '100', 10),
        isActive: true,
        expiresAt: expDate.toISOString(),
      })
      toast.success('Promo code created!')
      setShowAddCouponModal(false)
      setNewCoupon({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '1000',
        maxDiscountAmount: '5000',
        usageLimit: '100',
        expiresInDays: '30',
      })
      fetchAllData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create coupon')
    } finally {
      setIsSubmittingCoupon(false)
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Remove this promotional coupon?')) return
    try {
      await api.delete(`/api/coupons/${id}`)
      setCoupons(coupons.filter((c) => c.id !== id))
      toast.success('Coupon removed')
    } catch {
      toast.error('Failed to delete coupon')
    }
  }

  // Filtered queries
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !prodSearch ||
      p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
      p.slug.toLowerCase().includes(prodSearch.toLowerCase())
    const matchesCat =
      prodCatFilter === 'all' ||
      (p.categoryName && p.categoryName.toLowerCase() === prodCatFilter.toLowerCase()) ||
      (p.category?.name && p.category.name.toLowerCase() === prodCatFilter.toLowerCase())
    return matchesSearch && matchesCat
  })

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      orderStatusFilter === 'all' || o.status.toLowerCase() === orderStatusFilter.toLowerCase()
    const matchesSearch =
      !orderSearch ||
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.shippingName && o.shippingName.toLowerCase().includes(orderSearch.toLowerCase())) ||
      (o.shippingPhone && o.shippingPhone.includes(orderSearch))
    return matchesStatus && matchesSearch
  })

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true
    const term = customerSearch.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.phoneNumber && c.phoneNumber.includes(term))
    )
  })

  return (
    <div className="min-h-screen bg-background text-beige flex">
      {/* ─── SIDEBAR NAVIGATION (SHEIN / AJIO / SHOPIFY PATTERN) ─────────────── */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col justify-between hidden md:flex sticky top-0 h-screen z-40">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-gold" />
              <span className="font-serif text-lg font-bold gold-text-gradient tracking-wider">
                NEXUS
              </span>
            </Link>
            <Badge variant="gold" className="text-[9px] font-mono">PORTAL</Badge>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-sm font-medium">
            {[
              { id: 'overview', label: 'Dashboard & KPI', icon: BarChart3 },
              { id: 'products', label: 'Catalog & Inventory', icon: Package, count: products.length },
              { id: 'categories', label: 'Collections / Depts', icon: FolderTree, count: categories.length },
              { id: 'orders', label: 'Orders & Fulfillment', icon: ShoppingCart, count: orders.length },
              { id: 'coupons', label: 'Promotions & Coupons', icon: Ticket, count: coupons.length },
              { id: 'customers', label: 'Clientele CRM', icon: Users, count: customers.length },
              { id: 'settings', label: 'Store Settings', icon: Settings },
            ].map(({ id, label, icon: Icon, count }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
                      : 'text-beige-muted hover:text-beige hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-background/20 text-background font-bold' : 'bg-surface-2 text-beige-muted'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* User footer & Storefront link */}
        <div className="p-4 border-t border-border space-y-2">
          <Button variant="outline" size="sm" asChild className="w-full text-xs">
            <Link href="/" target="_blank" className="flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Live Storefront
            </Link>
          </Button>
          <div className="flex items-center justify-between pt-2 px-1 text-xs text-beige-muted">
            <span className="truncate max-w-[120px]">{user?.email}</span>
            <button
              onClick={() => {
                logout()
                window.location.href = '/'
              }}
              className="text-error hover:underline flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar on Mobile */}
        <div className="md:hidden border-b border-border bg-surface p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold" />
            <span className="font-serif font-bold text-beige">NEXUS CONTROL</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Shop</Link>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center gap-2 p-3 overflow-x-auto border-b border-border bg-surface-2 text-xs">
          {['overview', 'products', 'categories', 'orders', 'coupons', 'customers', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap font-medium ${
                activeTab === tab ? 'bg-gold text-background font-bold' : 'text-beige-muted'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
          {/* ─── TAB 1: OVERVIEW ──────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Executive Overview</h1>
                  <p className="text-sm text-beige-muted mt-1">Live metrics across sales, logistics, and inventory</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAllData}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveTab('products')
                      setShowAddProductModal(true)
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    New Product
                  </Button>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-beige-muted mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
                    <DollarSign className="w-5 h-5 text-gold" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {formatCurrency(stats?.totalRevenue ?? 0)}
                  </p>
                  <p className="text-xs text-success mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Verified Sales
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-beige-muted mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Fulfillment Queue</span>
                    <ShoppingCart className="w-5 h-5 text-gold" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {stats?.pendingOrders ?? 0}
                  </p>
                  <p className="text-xs text-gold mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Awaiting Courier Dispatch
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-beige-muted mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Active Inventory</span>
                    <Package className="w-5 h-5 text-gold" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {stats?.totalProducts ?? products.length}
                  </p>
                  <p className="text-xs text-beige-muted mt-2">
                    {stats?.lowStockProducts ?? 0} low stock items
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between text-beige-muted mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Client Base</span>
                    <Users className="w-5 h-5 text-gold" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {stats?.totalCustomers ?? customers.length}
                  </p>
                  <p className="text-xs text-beige-muted mt-2">Registered clientele</p>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl font-bold text-beige">Recent Orders Feed</h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')} className="text-xs text-gold">
                    View All Orders →
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/40">
                      <tr>
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orders.slice(0, 6).map((ord) => (
                        <tr key={ord.id} className="hover:bg-surface-2/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-gold font-bold">{ord.orderNumber}</td>
                          <td className="py-3.5 px-4 text-beige font-medium">{ord.shippingName ?? 'Client'}</td>
                          <td className="py-3.5 px-4 font-medium">{formatCurrency(ord.totalAmount ?? ord.total ?? 0)}</td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                ord.status === 'delivered'
                                  ? 'success'
                                  : ord.status === 'cancelled'
                                  ? 'error'
                                  : 'gold'
                              }
                            >
                              {ord.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-beige-muted text-xs">{formatDate(ord.createdAt)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenInspectOrder(ord)}>
                              <Eye className="w-4 h-4 text-gold" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: PRODUCTS ──────────────────────────────────────────────── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Catalog Inventory</h1>
                  <p className="text-sm text-beige-muted mt-1">Manage luxury timepieces, jewelry, and fragrances</p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Product
                </Button>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products by title or slug..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                  />
                </div>

                <select
                  value={prodCatFilter}
                  onChange={(e) => setProdCatFilter(e.target.value)}
                  className="w-full sm:w-auto bg-surface border border-border text-beige text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="all">All Collections</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Products Table */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/40">
                      <tr>
                        <th className="py-3.5 px-4">Item</th>
                        <th className="py-3.5 px-4">Collection</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4">Inventory</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProducts.map((p) => {
                        const stockVal = p.stock ?? p.stockQuantity ?? 0
                        const img = p.primaryImageUrl ?? p.primaryImage
                        return (
                          <tr key={p.id} className="hover:bg-surface-2/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded-lg bg-surface-2 overflow-hidden border border-border flex-shrink-0">
                                  {img ? (
                                    <Image src={img} alt={p.name} fill className="object-cover" sizes="48px" />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-beige-muted/30">
                                      <Package className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-beige line-clamp-1">{p.name}</div>
                                  <div className="text-xs text-beige-muted font-mono">{p.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-gold text-xs uppercase font-medium">
                              {p.categoryName ?? p.category?.name ?? 'Collection'}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-beige">{formatCurrency(p.price)}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  stockVal > 5
                                    ? 'bg-success/20 text-success'
                                    : stockVal > 0
                                    ? 'bg-gold/20 text-gold'
                                    : 'bg-error/20 text-error'
                                }`}
                              >
                                {stockVal} in stock
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge variant={p.isActive !== false ? 'gold' : 'error'}>
                                {p.isActive !== false ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditProduct(p)}
                                className="text-xs py-1 px-2.5"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleProduct(p.id)}
                                className="text-xs py-1 px-2.5 text-beige-muted hover:text-beige"
                              >
                                Toggle
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(p.id)}
                                className="text-xs py-1 px-2 text-error hover:bg-error/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: CATEGORIES / COLLECTIONS ──────────────────────────────── */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Collections & Departments</h1>
                  <p className="text-sm text-beige-muted mt-1">Organize storefront navigation and product grouping</p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Collection
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <FolderTree className="w-6 h-6 text-gold" />
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-beige-muted hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-serif text-xl font-bold text-beige">{cat.name}</h3>
                      <p className="text-xs text-gold font-mono mt-0.5">/{cat.slug}</p>
                      {cat.description && (
                        <p className="text-xs text-beige-muted mt-2 leading-relaxed">{cat.description}</p>
                      )}
                    </div>

                    <div className="border-t border-border pt-4 mt-6 flex items-center justify-between text-xs text-beige-muted">
                      <span>Live in Storefront</span>
                      <Link href={`/products?category=${cat.id}`} className="text-gold hover:underline">
                        View Products →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 4: ORDERS & COURIER FULFILLMENT ─────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl font-bold text-beige">Orders & Fulfillment</h1>
                <p className="text-sm text-beige-muted mt-1">
                  Assign courier tracking codes, update order states, and verify client fulfillment
                </p>
              </div>

              {/* Status Pills & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by order number, recipient, contact phone..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        orderStatusFilter === st
                          ? 'bg-gold text-background'
                          : 'bg-surface border border-border text-beige-muted hover:text-beige'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/40">
                      <tr>
                        <th className="py-3.5 px-4">Order #</th>
                        <th className="py-3.5 px-4">Recipient</th>
                        <th className="py-3.5 px-4">Total</th>
                        <th className="py-3.5 px-4">Payment</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4 text-right">Fulfillment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-gold font-bold">{ord.orderNumber}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-beige">{ord.shippingName}</div>
                            <div className="text-xs text-beige-muted font-mono">{ord.shippingPhone}</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-beige">
                            {formatCurrency(ord.totalAmount ?? ord.total ?? 0)}
                          </td>
                          <td className="py-3.5 px-4 text-xs uppercase text-beige-muted">
                            {ord.paymentMethod} • <span className="text-gold font-semibold">{ord.paymentStatus}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                ord.status === 'delivered'
                                  ? 'success'
                                  : ord.status === 'cancelled'
                                  ? 'error'
                                  : 'gold'
                              }
                            >
                              {ord.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-beige-muted">{formatDate(ord.createdAt)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenInspectOrder(ord)}
                              className="text-xs font-semibold py-1 px-3"
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 5: PROMOTIONS & COUPONS ─────────────────────────────────── */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Promotions & Promo Codes</h1>
                  <p className="text-sm text-beige-muted mt-1">Configure percentage and flat promotional discounts</p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowAddCouponModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Promo Code
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-surface border border-gold/30 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Ticket className="w-6 h-6 text-gold" />
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-beige-muted hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="font-mono text-xl font-bold text-gold tracking-widest bg-gold/10 px-3 py-1 rounded-lg border border-gold/20 inline-block">
                        {coupon.code}
                      </span>
                      <p className="text-sm font-semibold text-beige mt-3">
                        {coupon.discountValue}
                        {Number(coupon.discountType) === 0 ? '% OFF' : ' FLAT OFF'}
                      </p>
                      {coupon.description && (
                        <p className="text-xs text-beige-muted mt-1">{coupon.description}</p>
                      )}
                    </div>

                    <div className="border-t border-border pt-4 mt-6 text-xs text-beige-muted space-y-1">
                      <div className="flex justify-between">
                        <span>Min Order:</span>
                        <span className="text-beige">{formatCurrency(coupon.minOrderValue ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Times Redeemed:</span>
                        <span className="text-gold font-bold">{coupon.timesUsed ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 6: CLIENTELE CRM ────────────────────────────────────────── */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl font-bold text-beige">Clientele Management</h1>
                <p className="text-sm text-beige-muted mt-1">Review registered customers, historical purchases, and lifetime values</p>
              </div>

              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clients by name, email, phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                />
              </div>

              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/40">
                      <tr>
                        <th className="py-3.5 px-4">Client Name</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Orders Placed</th>
                        <th className="py-3.5 px-4">Lifetime Spend</th>
                        <th className="py-3.5 px-4">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-beige">
                            {c.firstName} {c.lastName}
                          </td>
                          <td className="py-3.5 px-4 text-beige-muted text-xs">{c.email}</td>
                          <td className="py-3.5 px-4 font-mono text-xs text-gold">{c.phoneNumber ?? '—'}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-beige">{c.totalOrders}</td>
                          <td className="py-3.5 px-4 font-serif font-bold text-gold">{formatCurrency(c.totalSpent)}</td>
                          <td className="py-3.5 px-4 text-xs text-beige-muted">{formatDate(c.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 7: SETTINGS ─────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h1 className="font-serif text-2xl font-bold text-beige border-b border-border pb-3">
                Storefront & Fulfillment Settings
              </h1>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-beige-muted uppercase mb-1">
                    Storefront Currency
                  </label>
                  <input
                    type="text"
                    value="INR (₹) - Indian Rupee"
                    disabled
                    className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-beige-muted uppercase mb-1">
                    Complimentary White-Glove Threshold
                  </label>
                  <input
                    type="text"
                    value="₹5,000 (Free delivery on orders above ₹5,000)"
                    disabled
                    className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-beige-muted uppercase mb-1">
                    Doorstep Payment (COD) Limit
                  </label>
                  <input
                    type="text"
                    value="Available on all domestic orders"
                    disabled
                    className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige text-xs"
                  />
                </div>

                <div className="p-4 bg-surface-2 rounded-xl border border-border text-xs text-beige-muted">
                  <p className="font-semibold text-gold mb-1">NEXUS Platform Version</p>
                  <p>Release 2.4.0 — High-Concurrency Luxury E-Commerce Architecture</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── MODAL: ADD PRODUCT ─────────────────────────────────────────────── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-xl font-bold text-beige">Publish New Luxury Item</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Title"
                  placeholder="e.g. Audemars Piguet Royal Oak"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                    Collection / Category
                  </label>
                  <select
                    value={newProd.categoryId}
                    onChange={(e) => setNewProd({ ...newProd, categoryId: e.target.value })}
                    className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Price (₹)"
                  type="number"
                  step="0.01"
                  placeholder="150000"
                  value={newProd.price}
                  onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                  required
                />
                <Input
                  label="Compare At Price (₹)"
                  type="number"
                  step="0.01"
                  placeholder="175000"
                  value={newProd.compareAtPrice}
                  onChange={(e) => setNewProd({ ...newProd, compareAtPrice: e.target.value })}
                />
                <Input
                  label="Stock Inventory"
                  type="number"
                  placeholder="10"
                  value={newProd.stock}
                  onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SKU Code"
                  placeholder="NEX-ROYAL-001"
                  value={newProd.sku}
                  onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                />
                <Input
                  label="Tags (comma-separated)"
                  placeholder="luxury, gold, sapphire"
                  value={newProd.tags}
                  onChange={(e) => setNewProd({ ...newProd, tags: e.target.value })}
                />
              </div>

              <Input
                label="Primary Image URL"
                placeholder="https://images.unsplash.com/..."
                value={newProd.imageUrl}
                onChange={(e) => setNewProd({ ...newProd, imageUrl: e.target.value })}
              />

              {newProd.imageUrl && (
                <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                    <Image src={newProd.imageUrl} alt="Preview" fill className="object-cover" />
                  </div>
                  <span className="text-xs text-success font-medium">Valid image preview attached</span>
                </div>
              )}

              <Input
                label="Short Tagline"
                placeholder="Handcrafted horological masterpiece"
                value={newProd.shortDescription}
                onChange={(e) => setNewProd({ ...newProd, shortDescription: e.target.value })}
              />

              <div>
                <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                  Full Description
                </label>
                <textarea
                  rows={3}
                  placeholder="In-depth specifications, movement, and casing..."
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-xl p-3 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={newProd.isFeatured}
                  onChange={(e) => setNewProd({ ...newProd, isFeatured: e.target.checked })}
                  className="accent-gold w-4 h-4"
                />
                <span className="text-sm text-beige">Show in Featured Showcase on Homepage</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" size="md" onClick={() => setShowAddProductModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={isSubmittingProd}>
                  Publish Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: QUICK EDIT PRODUCT ──────────────────────────────────────── */}
      {showEditProductModal && selectedProductToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-beige truncate">
                Edit: {selectedProductToEdit.name}
              </h3>
              <button
                onClick={() => setShowEditProductModal(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4">
              <Input
                label="Price (₹)"
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
              />
              <Input
                label="Stock Inventory"
                type="number"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                required
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditProductModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingProd}>
                  Update Inventory
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD CATEGORY ────────────────────────────────────────────── */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-beige">New Collection / Category</h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <Input
                label="Category Name"
                placeholder="e.g. Swiss Chronographs"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                required
              />
              <Input
                label="Description"
                placeholder="Artisanal chronographs crafted in Geneva"
                value={newCat.description}
                onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
              />
              <Input
                label="Banner Image URL"
                placeholder="https://images.unsplash.com/..."
                value={newCat.imageUrl}
                onChange={(e) => setNewCat({ ...newCat, imageUrl: e.target.value })}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCategoryModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingCat}>
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD COUPON ──────────────────────────────────────────────── */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-beige">Create Promotional Coupon</h3>
              <button
                onClick={() => setShowAddCouponModal(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <Input
                label="Promo Code"
                placeholder="e.g. VIP20 or FESTIVE500"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-beige mb-1.5 uppercase">Type</label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                    className="w-full bg-surface-2 border border-border text-beige text-xs rounded-xl p-2.5 focus:outline-none focus:border-gold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (₹)</option>
                  </select>
                </div>
                <Input
                  label="Discount Value"
                  type="number"
                  placeholder="20"
                  value={newCoupon.discountValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Min Order (₹)"
                  type="number"
                  value={newCoupon.minOrderValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: e.target.value })}
                />
                <Input
                  label="Usage Limit"
                  type="number"
                  value={newCoupon.usageLimit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCouponModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingCoupon}>
                  Publish Promo Code
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: INSPECT / MANAGE ORDER ────────────────────────────────── */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-beige flex items-center gap-2">
                  Order <span className="font-mono text-gold">{inspectOrder.orderNumber}</span>
                </h3>
                <p className="text-xs text-beige-muted mt-0.5">Placed on {formatDate(inspectOrder.createdAt)}</p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Updater Section */}
            <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3">
              <h4 className="text-xs font-semibold uppercase text-gold tracking-wider">
                Logistics & Fulfillment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-beige-muted mb-1 uppercase">Fulfillment Status</label>
                  <select
                    value={orderStatusUpdate}
                    onChange={(e) => setOrderStatusUpdate(e.target.value)}
                    className="w-full bg-surface border border-border text-beige text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-beige-muted mb-1 uppercase">Courier Tracking ID</label>
                  <input
                    type="text"
                    placeholder="e.g. BLUEDART-84920"
                    value={orderTrackingUpdate}
                    onChange={(e) => setOrderTrackingUpdate(e.target.value)}
                    className="w-full bg-surface border border-border text-beige text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveOrderStatus}
                  isLoading={isUpdatingOrder}
                  className="text-xs font-semibold"
                >
                  Save Status & Tracking
                </Button>
              </div>
            </div>

            {/* Recipient & Shipping info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-surface-2/40 rounded-xl border border-border">
                <span className="font-semibold text-beige-muted uppercase tracking-wider block mb-1">
                  Customer Delivery Destination
                </span>
                <p className="font-semibold text-beige text-sm">{inspectOrder.shippingName}</p>
                <p className="text-beige-muted mt-1 leading-relaxed">
                  {inspectOrder.shippingAddressLine1}
                  {inspectOrder.shippingAddressLine2 ? `, ${inspectOrder.shippingAddressLine2}` : ''}
                  <br />
                  {inspectOrder.shippingCity}, {inspectOrder.shippingState} - {inspectOrder.shippingPinCode}
                </p>
                <p className="text-gold font-mono mt-1 font-semibold">Phone: {inspectOrder.shippingPhone}</p>
              </div>

              <div className="p-3.5 bg-surface-2/40 rounded-xl border border-border">
                <span className="font-semibold text-beige-muted uppercase tracking-wider block mb-1">
                  Financial Record
                </span>
                <p className="text-beige">
                  Method:{' '}
                  <span className="font-semibold text-gold uppercase">{inspectOrder.paymentMethod}</span>
                </p>
                <p className="text-beige mt-1">
                  Payment Status:{' '}
                  <span className="font-semibold text-gold uppercase">{inspectOrder.paymentStatus}</span>
                </p>
                <p className="text-beige text-base font-bold font-serif pt-2">
                  Total: {formatCurrency(inspectOrder.totalAmount ?? inspectOrder.total ?? 0)}
                </p>
              </div>
            </div>

            {/* Ordered Items */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-beige-muted tracking-wider mb-3">
                Itemized Products
              </h4>
              <div className="divide-y divide-border max-h-56 overflow-y-auto">
                {inspectOrder.items?.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-10 rounded bg-surface-2 overflow-hidden flex-shrink-0 border border-border">
                        {item.productImageUrl ? (
                          <Image src={item.productImageUrl} alt={item.productName ?? ''} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-beige-muted/30">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-beige">{item.productName}</p>
                        <p className="text-beige-muted">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-beige">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-beige-muted">Loading Control Center...</div>}>
      <AdminContent />
    </Suspense>
  )
}
