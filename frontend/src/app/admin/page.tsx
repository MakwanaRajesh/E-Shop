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
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { DashboardStats, Order, ProductListItem, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

function AdminContent() {
  const { user, isAuthenticated } = useAuthStore()

  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [products, setProducts] = React.useState<ProductListItem[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'products' | 'orders'>('overview')

  // Search & filter states
  const [prodSearch, setProdSearch] = React.useState('')
  const [prodCatFilter, setProdCatFilter] = React.useState('all')
  const [orderStatusFilter, setOrderStatusFilter] = React.useState('all')
  const [orderSearch, setOrderSearch] = React.useState('')

  // Modals state
  const [showAddProductModal, setShowAddProductModal] = React.useState(false)
  const [showEditProductModal, setShowEditProductModal] = React.useState(false)
  const [selectedProductToEdit, setSelectedProductToEdit] = React.useState<ProductListItem | null>(null)
  const [inspectOrder, setInspectOrder] = React.useState<Order | null>(null)

  // Add product form
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

  // Edit product form
  const [editPrice, setEditPrice] = React.useState('')
  const [editStock, setEditStock] = React.useState('')
  const [isUpdatingProd, setIsUpdatingProd] = React.useState(false)

  // Order status update state
  const [orderStatusUpdate, setOrderStatusUpdate] = React.useState('')
  const [orderTrackingUpdate, setOrderTrackingUpdate] = React.useState('')
  const [isUpdatingOrder, setIsUpdatingOrder] = React.useState(false)

  const isAdmin = user?.role === 'admin' || (user?.role as unknown as string) === 'Admin'

  // Fetch all admin data
  const fetchAllData = React.useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return
    try {
      const [dashRes, ordRes, prodRes, catRes] = await Promise.all([
        api.get<DashboardStats>('/api/admin/dashboard').catch(() => null),
        api.get<{ items?: Order[]; data?: Order[] }>('/api/admin/orders?pageSize=100').catch(() => null),
        api.get<{ items?: ProductListItem[]; data?: ProductListItem[] }>('/api/admin/products?pageSize=100').catch(() => null),
        api.get<Category[]>('/api/categories').catch(() => null),
      ])

      if (dashRes?.data) setStats(dashRes.data)
      if (ordRes?.data) setOrders(ordRes.data.items ?? ordRes.data.data ?? [])
      if (prodRes?.data) setProducts(prodRes.data.items ?? prodRes.data.data ?? [])
      if (catRes?.data) {
        setCategories(catRes.data)
        if (catRes.data.length > 0 && !newProd.categoryId) {
          setNewProd((prev) => ({ ...prev, categoryId: catRes.data[0].id }))
        }
      }
    } catch {
      toast.error('Failed to load control center data')
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

  // Handle Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProd.name || !newProd.price || !newProd.categoryId) {
      toast.error('Please provide name, category, and price')
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
      toast.success('Product created successfully! 🎉')
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

  // Handle Quick Edit Product
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
      toast.success('Product updated successfully!')
      setShowEditProductModal(false)
      fetchAllData()
    } catch {
      toast.error('Failed to update product')
    } finally {
      setIsUpdatingProd(false)
    }
  }

  // Handle Toggle Product Status
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

  // Handle Delete Product
  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm('Are you sure you want to deactivate and remove this product?')) return
    try {
      await api.delete(`/api/products/${prodId}`)
      setProducts((prev) => prev.filter((p) => p.id !== prodId))
      toast.success('Product removed')
    } catch {
      toast.error('Failed to delete product')
    }
  }

  // Handle Inspect Order
  const handleOpenInspectOrder = (order: Order) => {
    setInspectOrder(order)
    setOrderStatusUpdate(order.status)
    setOrderTrackingUpdate(order.trackingNumber ?? '')
  }

  // Handle Save Order Status & Tracking
  const handleSaveOrderStatus = async () => {
    if (!inspectOrder) return
    setIsUpdatingOrder(true)
    try {
      await api.patch(`/api/admin/orders/${inspectOrder.id}/status`, {
        status: orderStatusUpdate,
        trackingNumber: orderTrackingUpdate.trim() || null,
      })
      toast.success(`Order updated to ${orderStatusUpdate}!`)
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
      toast.error('Failed to update order status')
    } finally {
      setIsUpdatingOrder(false)
    }
  }

  // Filtered lists
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

  return (
    <div className="min-h-screen bg-background text-beige">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-gold" />
            <span className="font-serif text-xl font-bold gold-text-gradient tracking-wider">
              NEXUS CONTROL
            </span>
            <Badge variant="gold" className="text-[10px] ml-2 font-mono">PORTAL</Badge>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/" className="flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4" />
                Storefront
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
                : 'text-beige-muted hover:text-beige hover:bg-surface'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
                : 'text-beige-muted hover:text-beige hover:bg-surface'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
                : 'text-beige-muted hover:text-beige hover:bg-surface'
            }`}
          >
            Orders ({orders.length})
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                  <DollarSign className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {formatCurrency(stats?.totalRevenue ?? 0)}
                </p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Live Gross Sales
                </p>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Orders</span>
                  <ShoppingCart className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {stats?.totalOrders ?? orders.length}
                </p>
                <p className="text-xs text-gold mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {stats?.pendingOrders ?? 0} awaiting fulfillment
                </p>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Live Catalog</span>
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {stats?.totalProducts ?? products.length}
                </p>
                <p className="text-xs text-beige-muted mt-2">
                  {stats?.lowStockProducts ?? 0} low stock items
                </p>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Clientele</span>
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {stats?.totalCustomers ?? 1}
                </p>
                <p className="text-xs text-beige-muted mt-2">Registered luxury customers</p>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center gap-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setActiveTab('products')
                  setShowAddProductModal(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Product
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setActiveTab('orders')
                  setOrderStatusFilter('pending')
                }}
              >
                View Pending Orders ({stats?.pendingOrders ?? 0})
              </Button>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
              <h3 className="font-serif text-xl font-bold text-beige mb-6">Recent Customer Orders</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-beige-muted uppercase border-b border-border">
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
                          <Badge variant={ord.status === 'delivered' ? 'success' : ord.status === 'cancelled' ? 'error' : 'gold'}>
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

        {/* ─── TAB 2: PRODUCTS MANAGEMENT ───────────────────────────────────── */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Header + Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-beige">Catalog Inventory</h2>
                <p className="text-xs text-beige-muted mt-1">Manage luxury timepieces, fragrances, and jewelry</p>
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

            {/* Filter toolbar */}
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
                <option value="all">All Categories</option>
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
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Stock</th>
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

        {/* ─── TAB 3: ORDERS MANAGEMENT ─────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-beige">Client Orders</h2>
              <p className="text-xs text-beige-muted mt-1">Fulfill customer orders, assign courier tracking numbers, and update status</p>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by order number, recipient name, phone..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                />
              </div>

              {/* Status pills */}
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

        {/* ─── MODAL: ADD PRODUCT ───────────────────────────────────────────── */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-surface border border-gold/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up my-8">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-serif text-xl font-bold text-beige">Create New Luxury Product</h3>
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
                    placeholder="e.g. Rolex Submariner Date"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    required
                  />
                  <div>
                    <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                      Category
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
                    label="Stock Quantity"
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
                    placeholder="NEX-TIME-001"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                  />
                  <Input
                    label="Tags (comma-separated)"
                    placeholder="luxury, gold, waterproof"
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
                    <span className="text-xs text-success font-medium">Image preview valid</span>
                  </div>
                )}

                <Input
                  label="Short Tagline"
                  placeholder="Exquisite craftsmanship with perpetual caliber"
                  value={newProd.shortDescription}
                  onChange={(e) => setNewProd({ ...newProd, shortDescription: e.target.value })}
                />

                <div>
                  <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                    Full Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide in-depth luxury specifications and artisanal heritage..."
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
                  <span className="text-sm text-beige">Highlight as Featured on Homepage</span>
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

        {/* ─── MODAL: QUICK EDIT PRODUCT ────────────────────────────────────── */}
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
                  Update Fulfillment Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-beige-muted mb-1 uppercase">Status</label>
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
                    <label className="block text-[11px] text-beige-muted mb-1 uppercase">Tracking Number</label>
                    <input
                      type="text"
                      placeholder="e.g. BLUEDART-984920"
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
                    Save Status Changes
                  </Button>
                </div>
              </div>

              {/* Recipient & Shipping info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-surface-2/40 rounded-xl border border-border">
                  <span className="font-semibold text-beige-muted uppercase tracking-wider block mb-1">
                    Customer Delivery Address
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
                    Financial Summary
                  </span>
                  <p className="text-beige">
                    Payment Method:{' '}
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
                  Purchased Products
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
      </main>
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
