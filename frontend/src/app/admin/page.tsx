'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { DashboardStats, Order, ProductListItem } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [products, setProducts] = React.useState<ProductListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'products' | 'orders'>('overview')

  // New product form modal state
  const [showAddProduct, setShowAddProduct] = React.useState(false)
  const [newProd, setNewProd] = React.useState({
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    stock: '',
    sku: '',
    tags: '',
    imageUrl: '',
  })

  const isAdmin = user?.role === 'admin' || (user?.role as unknown as string) === 'Admin'

  React.useEffect(() => {
    if (!isAuthenticated) return
    const fetchData = async () => {
      try {
        const [dashRes, ordRes, prodRes] = await Promise.all([
          api.get<DashboardStats>('/api/admin/dashboard').catch(() => null),
          api.get<{ items?: Order[]; data?: Order[] }>('/api/admin/orders').catch(() => null),
          api.get<{ items?: ProductListItem[]; data?: ProductListItem[] }>('/api/admin/products').catch(() => null),
        ])

        if (dashRes?.data) setStats(dashRes.data)
        if (ordRes?.data) setOrders(ordRes.data.items ?? ordRes.data.data ?? [])
        if (prodRes?.data) setProducts(prodRes.data.items ?? prodRes.data.data ?? [])
      } catch {
        toast.error('Failed to load admin analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isAuthenticated])

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background text-beige flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4">
          <Shield className="w-12 h-12 text-gold mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-beige">NEXUS Admin Access</h1>
          <p className="text-sm text-beige-muted">
            You must be signed in with an administrative account to access the control panel.
          </p>
          <div className="bg-surface-2 p-3 rounded-lg text-xs text-beige-muted text-left">
            <span className="text-gold font-mono font-semibold">Demo Admin Credentials:</span>
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/api/admin/orders/${orderId}/status`, { status: newStatus })
      toast.success(`Order status updated to ${newStatus}`)
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o)))
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleToggleProduct = async (prodId: string) => {
    try {
      const res = await api.patch<{ isActive: boolean }>(`/api/admin/products/${prodId}/toggle`)
      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, isActive: res.data.isActive } : p))
      )
      toast.success('Product status toggled')
    } catch {
      toast.error('Failed to toggle product status')
    }
  }

  return (
    <div className="min-h-screen bg-background text-beige">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-gold" />
            <span className="font-serif text-xl font-bold gold-text-gradient tracking-wider">
              NEXUS CONTROL
            </span>
            <Badge variant="gold" className="text-[10px] ml-2">ADMIN PORTAL</Badge>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Back to Shop</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige hover:bg-surface'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'products' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige hover:bg-surface'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders' ? 'bg-gold text-background font-semibold' : 'text-beige-muted hover:text-beige hover:bg-surface'
            }`}
          >
            Orders ({orders.length})
          </button>
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                  <DollarSign className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {formatCurrency(stats?.totalRevenue ?? 0)}
                </p>
                <p className="text-xs text-success mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Live Gross Sales
                </p>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
                  <ShoppingCart className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {stats?.totalOrders ?? orders.length}
                </p>
                <p className="text-xs text-beige-muted mt-2">
                  {stats?.pendingOrders ?? 0} orders awaiting processing
                </p>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Products Live</span>
                  <Package className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {stats?.totalProducts ?? products.length}
                </p>
                <p className="text-xs text-gold mt-2">
                  {stats?.lowStockProducts ?? 0} low stock items
                </p>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between text-beige-muted mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Customers</span>
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <p className="font-serif text-3xl font-bold text-beige">
                  {stats?.totalCustomers ?? 1}
                </p>
                <p className="text-xs text-beige-muted mt-2">Registered clientele</p>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(stats?.recentOrders ?? orders.slice(0, 5)).map((ord: any) => (
                      <tr key={ord.orderNumber ?? ord.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-gold">{ord.orderNumber}</td>
                        <td className="py-3 px-4 text-beige">{ord.customerName ?? ord.shippingName ?? 'Client'}</td>
                        <td className="py-3 px-4 font-medium">{formatCurrency(ord.total ?? ord.totalAmount ?? 0)}</td>
                        <td className="py-3 px-4">
                          <Badge variant="gold">{ord.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-beige-muted text-xs">
                          {formatDate(ord.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Products */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-beige">Inventory Catalogue</h2>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/30">
                  <tr>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price</th>
                    <th className="py-3.5 px-4">Stock</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-beige">{p.name}</div>
                        <div className="text-xs text-beige-muted font-mono">{p.slug}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gold text-xs uppercase">{p.categoryName ?? p.category?.name}</td>
                      <td className="py-3.5 px-4 font-medium">{formatCurrency(p.price)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          (p.stock ?? p.stockQuantity ?? 0) > 5 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                        }`}>
                          {p.stock ?? p.stockQuantity ?? 0} in stock
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={p.isActive !== false ? 'gold' : 'error'}>
                          {p.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleProduct(p.id)}>
                          Toggle Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-bold text-beige">Customer Orders</h2>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/30">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gold font-semibold">{ord.orderNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-beige">{ord.shippingName}</div>
                        <div className="text-xs text-beige-muted">{ord.shippingPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">{formatCurrency(ord.totalAmount ?? ord.total ?? 0)}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs uppercase text-beige-muted font-medium">
                          {ord.paymentMethod} • {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={ord.status === 'delivered' ? 'success' : ord.status === 'cancelled' ? 'error' : 'gold'}>
                          {ord.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="bg-surface-2 border border-border text-beige text-xs rounded px-2 py-1.5 focus:outline-none focus:border-gold cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
