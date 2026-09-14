'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Package, MapPin, LogOut, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AccountPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = React.useState(true)

  React.useEffect(() => {
    if (!isAuthenticated) return
    const fetchOrders = async () => {
      try {
        const res = await api.get<{ items?: Order[]; data?: Order[] }>('/api/orders')
        setOrders(res.data.items ?? res.data.data ?? [])
      } catch {
        setOrders([])
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <User className="w-10 h-10 text-gold" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-beige mb-3">NEXUS Account</h1>
        <p className="text-beige-muted mb-8">Sign in to view your orders, saved addresses, and profile details.</p>
        <Button variant="primary" size="lg" onClick={() => openAuthModal('login', '/account')}>
          Sign In to NEXUS
        </Button>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    router.push('/')
    toast.success('Logged out successfully')
  }

  const isAdmin = user?.role === 'admin' || (user?.role as unknown as string) === 'Admin'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Profile Summary */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold font-serif text-2xl font-bold">
            {user?.firstName?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-bold text-beige">
                {user?.firstName} {user?.lastName}
              </h1>
              {isAdmin && <Badge variant="gold">Admin</Badge>}
            </div>
            <p className="text-sm text-beige-muted mt-0.5">{user?.email}</p>
            {user?.phone && <p className="text-xs text-beige-muted mt-0.5">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <Button variant="primary" size="sm" asChild>
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-error" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-beige flex items-center gap-2.5">
            <Package className="w-6 h-6 text-gold" />
            Recent Orders
          </h2>
          <span className="text-sm text-beige-muted">{orders.length} total orders</span>
        </div>

        {loadingOrders ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <Package className="w-12 h-12 text-beige-muted/40 mx-auto mb-3" />
            <h3 className="font-medium text-beige text-lg mb-1">No orders yet</h3>
            <p className="text-sm text-beige-muted mb-6">Your order history will appear here once you make a purchase.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">Browse NEXUS Catalog</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-surface border border-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-semibold text-gold">{order.orderNumber}</span>
                    <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'gold'}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-beige-muted">
                    Ordered on {formatDate(order.createdAt)} • {order.items?.length ?? 0} items
                  </p>
                </div>
                <div className="text-right sm:self-center">
                  <p className="font-serif text-xl font-bold text-beige">{formatCurrency(order.totalAmount ?? order.total ?? 0)}</p>
                  <p className="text-xs text-beige-muted capitalize">{order.paymentMethod} • {order.paymentStatus}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
