'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  Package,
  MapPin,
  LogOut,
  Shield,
  CheckCircle2,
  Clock,
  Truck,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Sparkles,
  Headphones,
  PhoneCall,
  MessageSquare,
  HelpCircle,
  FileText,
  Send,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { Order, Address } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

function AccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderSuccessParam = searchParams.get('orderSuccess')

  const { user, isAuthenticated, logout, updateUser } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()

  const [activeTab, setActiveTab] = React.useState<'orders' | 'addresses' | 'profile' | 'support'>('orders')
  const [orders, setOrders] = React.useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = React.useState(true)
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null)

  // Addresses state
  const [addresses, setAddresses] = React.useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = React.useState(false)
  const [showAddAddress, setShowAddAddress] = React.useState(false)
  const [newAddr, setNewAddr] = React.useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    addressType: 'Home',
  })

  // Profile edit state
  const [profileForm, setProfileForm] = React.useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  })
  const [savingProfile, setSavingProfile] = React.useState(false)

  // Support / Customer Care ticket state
  const [ticketForm, setTicketForm] = React.useState({
    category: 'Order Status & Delivery',
    orderNumber: '',
    subject: '',
    message: '',
  })
  const [submittingTicket, setSubmittingTicket] = React.useState(false)
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null)

  // Sync profile form when user updates
  React.useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? '',
      })
    }
  }, [user])

  // Fetch orders
  React.useEffect(() => {
    if (!isAuthenticated) return
    const fetchOrders = async () => {
      try {
        const res = await api.get<any>('/api/orders')
        const list = res.data?.items ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : [])
        setOrders(list)
        if (orderSuccessParam && list.length > 0) {
          setExpandedOrderId(list[0].id)
        }
      } catch {
        setOrders([])
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [isAuthenticated, orderSuccessParam])

  // Fetch addresses when tab active
  React.useEffect(() => {
    if (!isAuthenticated || activeTab !== 'addresses') return
    const fetchAddresses = async () => {
      setLoadingAddresses(true)
      try {
        const res = await api.get<Address[]>('/api/addresses')
        setAddresses(res.data ?? [])
      } catch {
        setAddresses([])
      } finally {
        setLoadingAddresses(false)
      }
    }
    fetchAddresses()
  }, [isAuthenticated, activeTab])

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center mx-auto mb-4 text-gold">
          <User className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-beige mb-3">Sign In Required</h1>
        <p className="text-beige-muted mb-8 text-sm">
          Access your personal concierge, order tracking, and delivery preferences.
        </p>
        <Button variant="primary" size="lg" onClick={() => openAuthModal('login')}>
          Sign In to NEXUS
        </Button>
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    useCartStore.getState().clearCart()
    useWishlistStore.getState().clearWishlist()
    router.push('/')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await api.put<any>('/api/auth/me', {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phoneNumber: profileForm.phone.trim() || null,
      })
      if (res.data?.user) {
        updateUser(res.data.user)
      } else if (user) {
        updateUser({
          ...user,
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          phone: profileForm.phone.trim() || undefined,
        })
      }
      toast.success('Profile updated successfully!')
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you wish to cancel this order?')) return
    try {
      await api.post(`/api/orders/${orderId}/cancel`)
      toast.success('Order cancelled successfully.')
      // Refresh orders
      const res = await api.get<any>('/api/orders')
      const list = res.data?.items ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : [])
      setOrders(list)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to cancel order')
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.post<Address>('/api/addresses', {
        fullName: newAddr.fullName.trim(),
        phoneNumber: newAddr.phone.trim(),
        addressLine1: newAddr.addressLine1.trim(),
        addressLine2: newAddr.addressLine2.trim() || null,
        city: newAddr.city.trim(),
        state: newAddr.state.trim(),
        pinCode: newAddr.pinCode.trim(),
        country: 'India',
        addressType: newAddr.addressType,
        isDefault: addresses.length === 0,
      })
      setAddresses([res.data, ...addresses])
      setShowAddAddress(false)
      setNewAddr({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pinCode: '',
        addressType: 'Home',
      })
      toast.success('Address saved successfully')
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to save address')
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to remove this address?')) return
    try {
      await api.delete(`/api/addresses/${id}`)
      setAddresses(addresses.filter((a) => a.id !== id))
      toast.success('Address removed')
    } catch {
      toast.error('Failed to remove address')
    }
  }

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await api.patch(`/api/addresses/${id}/default`)
      setAddresses(
        addresses.map((a) => ({
          ...a,
          isDefault: a.id === id,
        })),
      )
      toast.success('Default address updated')
    } catch {
      toast.error('Failed to set default address')
    }
  }

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingTicket(true)
    setTimeout(() => {
      const tktNum = `TKT-${Math.floor(100000 + Math.random() * 900000)}`
      toast.success(`Support Ticket ${tktNum} created! Our Concierge will reach out within 2 hours.`, {
        duration: 6000,
        icon: '🛎️',
      })
      setTicketForm({
        category: 'Order Status & Delivery',
        orderNumber: '',
        subject: '',
        message: '',
      })
      setSubmittingTicket(false)
    }, 1000)
  }

  const getFulfillmentStep = (status: string) => {
    const s = (status ?? '').toLowerCase()
    if (s === 'cancelled' || s === 'refunded') return -1
    if (s === 'delivered') return 3
    if (s === 'shipped' || s === 'outfordelivery' || s === 'out_for_delivery') return 2
    if (s === 'confirmed' || s === 'processing') return 1
    return 0 // pending / payment pending
  }

  const isAdmin = user?.role === 'admin'

  const FAQ_ITEMS = [
    {
      q: 'How do I track my luxury delivery?',
      a: 'All orders qualify for real-time tracking. Once your order is dispatched, our concierge assigns a dedicated courier tracking ID (e.g., BlueDart or FedEx) visible under the My Orders tab. You will also receive SMS and WhatsApp dispatch notifications.',
    },
    {
      q: 'Can I cancel an order after placing it?',
      a: 'Yes, pending and confirmed orders can be cancelled directly with 1 click from your "My Orders" tab before they are dispatched. If already shipped, you can refuse delivery or request an immediate doorstep return.',
    },
    {
      q: 'What is your doorstep return and exchange policy?',
      a: 'NEXUS provides a 30-day complimentary doorstep return policy. Our delivery associate picks up the package directly from your address and ensures an immediate replacement or full refund to your original payment method.',
    },
    {
      q: 'Are all products authentic and covered by warranty?',
      a: '100% of items on NEXUS are direct from luxury artisans and official brand ateliers. Every timepiece, piece of jewelry, and fine garment arrives with an authenticity card and a complimentary 2-year warranty.',
    },
    {
      q: 'What payment options are supported?',
      a: 'We accept Cash on Delivery (COD) across India up to ₹25,000, UPI (Google Pay, PhonePe, Paytm), All Major Credit & Debit Cards (Visa, MasterCard, Amex, RuPay), and Net Banking.',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Order Success Banner ── */}
      {orderSuccessParam && (
        <div className="bg-gradient-to-r from-gold/20 via-surface to-gold/10 border border-gold/40 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl shadow-gold/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-gold flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-beige">
                Order Placed Successfully! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-beige-muted mt-1">
                Thank you for choosing NEXUS. Your order{' '}
                <span className="font-mono text-gold font-bold">{orderSuccessParam}</span> is now confirmed and our team is preparing it for white-glove dispatch.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.replace('/account')} className="flex-shrink-0 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* ── Profile Header Summary ── */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold font-serif text-2xl font-bold shadow-md shadow-gold/10">
            {user?.firstName?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-bold text-beige">
                {user?.firstName} {user?.lastName}
              </h1>
              {isAdmin && <Badge variant="gold">ADMIN</Badge>}
            </div>
            <p className="text-xs text-beige-muted mt-0.5">{user?.email}</p>
            {user?.phone && <p className="text-xs text-gold/90 mt-0.5 font-mono">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <Button variant="primary" size="sm" asChild>
              <Link href="/admin" className="flex items-center gap-2 text-xs">
                <Shield className="w-4 h-4" />
                Admin Portal
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2 text-xs">
            <LogOut className="w-4 h-4 text-error" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-8 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'orders'
              ? 'bg-gold text-background shadow-md shadow-gold/20'
              : 'text-beige-muted hover:text-beige hover:bg-surface-2'
          }`}
        >
          <Package className="w-4 h-4" />
          My Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'addresses'
              ? 'bg-gold text-background shadow-md shadow-gold/20'
              : 'text-beige-muted hover:text-beige hover:bg-surface-2'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Saved Addresses
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'profile'
              ? 'bg-gold text-background shadow-md shadow-gold/20'
              : 'text-beige-muted hover:text-beige hover:bg-surface-2'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'support'
              ? 'bg-gold text-background shadow-md shadow-gold/20'
              : 'text-beige-muted hover:text-beige hover:bg-surface-2'
          }`}
        >
          <Headphones className="w-4 h-4 text-gold" />
          24/7 VIP Concierge & Help
        </button>
      </div>

      {/* ─── TAB 1: ORDERS ─────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {loadingOrders ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-44 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4">
              <Package className="w-16 h-16 text-gold/30 mx-auto" />
              <h3 className="font-serif text-2xl font-bold text-beige">No orders placed yet</h3>
              <p className="text-beige-muted text-xs max-w-md mx-auto">
                Explore our curated men, women, and horology collections to experience white-glove doorstep delivery.
              </p>
              <Button variant="primary" size="md" asChild>
                <Link href="/products">Explore Catalog</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id
                const step = getFulfillmentStep(order.status as unknown as string)
                const isCancelled = order.status.toString().toLowerCase() === 'cancelled'
                const canCancel =
                  order.status.toString().toLowerCase() === 'pending' ||
                  order.status.toString().toLowerCase() === 'confirmed'

                const isDelivered = order.status.toString().toLowerCase() === 'delivered'
                const isShipped = order.status.toString().toLowerCase() === 'shipped' || order.status.toString().toLowerCase().includes('outfor')

                return (
                  <div
                    key={order.id}
                    className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 shadow-md ${
                      isCancelled
                        ? 'border-rose-500/30 bg-rose-950/5'
                        : isDelivered
                        ? 'border-emerald-500/30 bg-emerald-950/5 hover:border-emerald-500/50'
                        : isShipped
                        ? 'border-sky-500/30 bg-sky-950/5 hover:border-sky-500/50'
                        : 'border-border hover:border-gold/30'
                    }`}
                  >
                    {/* Order Card Header */}
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-2/40 border-b border-border">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-gold">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} size="md" />
                        </div>
                        <p className="text-[11px] text-beige-muted">
                          Placed on {formatDate(order.createdAt)} • Payment:{' '}
                          <span className="uppercase text-beige font-semibold">
                            {order.paymentMethod === (1 as any) || (order.paymentMethod as any) === 'CashOnDelivery'
                              ? 'Cash on Delivery'
                              : 'Razorpay'}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[11px] text-beige-muted block">Total Paid</span>
                          <span className="text-base font-serif font-bold text-beige">
                            {formatCurrency(order.totalAmount ?? 0)}
                          </span>
                        </div>
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="w-8 h-8 rounded-lg bg-surface border border-border hover:border-gold/40 flex items-center justify-center text-beige-muted hover:text-beige transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Visual Progress Bar (SHEIN / AJIO style) */}
                    {!isCancelled ? (
                      <div className="p-6 bg-surface border-b border-border">
                        <div className="relative flex items-center justify-between max-w-2xl mx-auto">
                          <div className="absolute top-4 left-6 right-6 h-0.5 bg-border -z-0">
                            <div
                              className={`h-full transition-all duration-500 ${
                                step === 3
                                  ? 'bg-gradient-to-r from-gold via-sky-400 to-emerald-400'
                                  : 'bg-gold'
                              }`}
                              style={{ width: `${(step / 3) * 100}%` }}
                            />
                          </div>

                          {[
                            { label: 'Order Placed', icon: Clock },
                            { label: 'Confirmed', icon: CheckCircle2 },
                            { label: 'Dispatched', icon: Truck },
                            { label: 'Delivered', icon: Check },
                          ].map((s, idx) => {
                            const isDone = idx <= step
                            const isCurrent = idx === step
                            const isCompletedDelivered = isDone && idx === 3
                            const isTransitStep = isDone && idx === 2

                            return (
                              <div key={s.label} className="flex flex-col items-center gap-2 z-10">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold ${
                                    isCompletedDelivered
                                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                                      : isTransitStep
                                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40'
                                      : isDone
                                      ? 'bg-gold text-background shadow-md shadow-gold/30'
                                      : 'bg-surface-2 border border-border text-beige-muted'
                                  }`}
                                >
                                  <s.icon className="w-4 h-4" />
                                </div>
                                <span
                                  className={`text-[10px] tracking-wider uppercase font-semibold text-center ${
                                    isCurrent && step === 3
                                      ? 'text-emerald-400 font-bold'
                                      : isCurrent
                                      ? 'text-gold'
                                      : isDone
                                      ? 'text-beige'
                                      : 'text-beige-muted/60'
                                  }`}
                                >
                                  {s.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-500/10 border-b border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>This order was cancelled. Any pre-payments are automatically refunded within 24–48 hours.</span>
                      </div>
                    )}

                    {/* Expandable Order Details */}
                    {isExpanded && (
                      <div className="p-6 space-y-6 animate-fade-in bg-surface-2/20">
                        {/* Ordered Items List */}
                        <div className="space-y-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-gold block">
                            Ordered Items ({order.items?.length ?? 0})
                          </span>
                          <div className="space-y-2">
                            {order.items?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 bg-surface border border-border rounded-xl"
                              >
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-2 border border-border flex-shrink-0">
                                  {item.productImageUrl ? (
                                    <Image
                                      src={item.productImageUrl}
                                      alt={item.productName ?? 'Product item'}
                                      fill
                                      className="object-cover"
                                      sizes="48px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-beige-muted">
                                      No Img
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-beige truncate">
                                    {item.productName}
                                  </p>
                                  {item.variantName && (
                                    <p className="text-[11px] text-gold/80">{item.variantName}</p>
                                  )}
                                  <p className="text-[11px] text-beige-muted">
                                    Qty: {item.quantity} × {formatCurrency(item.unitPrice ?? 0)}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-beige font-mono">
                                  {formatCurrency(item.totalPrice ?? 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping Details & Logistics Tracking */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
                          <div>
                            <span className="font-bold uppercase text-beige-muted block mb-1">
                              Delivery Address
                            </span>
                            <p className="text-beige font-semibold">{order.shippingName}</p>
                            <p className="text-beige-muted">{order.shippingAddressLine1}</p>
                            {order.shippingAddressLine2 && (
                              <p className="text-beige-muted">{order.shippingAddressLine2}</p>
                            )}
                            <p className="text-beige-muted">
                              {order.shippingCity}, {order.shippingState} - {order.shippingPinCode}
                            </p>
                            <p className="text-gold mt-1 font-mono">Phone: {order.shippingPhone}</p>
                          </div>

                          <div>
                            <span className="font-bold uppercase text-beige-muted block mb-1">
                              Courier & Tracking
                            </span>
                            <p className="text-beige">
                              Service:{' '}
                              <span className="text-gold font-medium uppercase">
                                Complimentary White-Glove
                              </span>
                            </p>
                            {order.trackingNumber ? (
                              <p className="text-beige mt-1">
                                Tracking No:{' '}
                                <span className="font-mono text-gold font-bold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                                  {order.trackingNumber}
                                </span>
                              </p>
                            ) : (
                              <p className="text-beige-muted mt-1 italic">
                                Assigned upon dispatch from warehouse.
                              </p>
                            )}

                            {/* Cancel Order Action */}
                            {canCancel && (
                              <div className="mt-4 pt-3 border-t border-border/80">
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="text-xs text-error hover:text-error/80 border border-error/30 rounded-lg px-3 py-1.5 hover:bg-error/10 transition-colors"
                                >
                                  Cancel Order
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SAVED ADDRESSES ────────────────────────────────────────── */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold text-beige">Saved Delivery Addresses</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="flex items-center gap-1.5 text-xs"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </Button>
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <form onSubmit={handleAddAddress} className="bg-surface border border-gold/40 rounded-2xl p-6 sm:p-8 space-y-4 animate-slide-up shadow-xl">
              <h3 className="font-serif text-lg font-bold text-beige border-b border-border pb-2">
                New Shipping Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Recipient Name"
                  placeholder="e.g. Rajesh Makwana"
                  value={newAddr.fullName}
                  onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                  required
                />
                <Input
                  label="10-Digit Mobile Number"
                  placeholder="e.g. 9876543210"
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Street Address / House No."
                placeholder="Flat 402, Signature Towers"
                value={newAddr.addressLine1}
                onChange={(e) => setNewAddr({ ...newAddr, addressLine1: e.target.value })}
                required
              />
              <Input
                label="Apartment, Landmark, Area (Optional)"
                placeholder="Near Golf Club"
                value={newAddr.addressLine2}
                onChange={(e) => setNewAddr({ ...newAddr, addressLine2: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  placeholder="Mumbai"
                  value={newAddr.city}
                  onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                  required
                />
                <Input
                  label="State"
                  placeholder="Maharashtra"
                  value={newAddr.state}
                  onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                  required
                />
                <Input
                  label="PIN Code"
                  placeholder="400001"
                  value={newAddr.pinCode}
                  onChange={(e) => setNewAddr({ ...newAddr, pinCode: e.target.value })}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddAddress(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Address
                </Button>
              </div>
            </form>
          )}

          {/* Address Cards Grid */}
          {loadingAddresses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-36 bg-surface border border-border rounded-xl animate-pulse" />
              <div className="h-36 bg-surface border border-border rounded-xl animate-pulse" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-10 text-center">
              <MapPin className="w-12 h-12 text-beige-muted/30 mx-auto mb-3" />
              <p className="text-beige-muted text-xs">No saved addresses found. Add one for 1-click checkout.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-beige text-sm">{addr.fullName}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] uppercase font-bold bg-gold/20 text-gold px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-beige-muted leading-relaxed">
                      {addr.addressLine1}
                      {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                      <br />
                      {addr.city}, {addr.state} - {addr.pinCode ?? addr.postalCode}
                    </p>
                    <p className="text-xs text-gold/90 font-mono mt-2">
                      Phone: {addr.phoneNumber ?? addr.phone}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                    {!addr.isDefault ? (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-gold hover:underline"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="text-beige-muted italic text-[11px]">Primary delivery address</span>
                    )}

                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-error hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: PROFILE SETTINGS ───────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="max-w-xl bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-md">
          <h2 className="font-serif text-2xl font-bold text-beige border-b border-border pb-3">
            Personal Information
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                required
              />
            </div>

            <Input
              label="Email Address"
              value={user?.email ?? ''}
              disabled
              className="opacity-60 cursor-not-allowed"
            />

            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-4"
              isLoading={savingProfile}
            >
              Update Information
            </Button>
          </form>
        </div>
      )}

      {/* ─── TAB 4: 24/7 VIP CONCIERGE & CUSTOMER CARE ─────────────────────── */}
      {activeTab === 'support' && (
        <div className="space-y-8 animate-fade-in">
          {/* Quick Helpline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface border border-gold/30 rounded-2xl p-6 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-beige">Toll-Free Helpline</h3>
              <p className="text-xs text-beige-muted">Direct phone assistance from 9 AM to 9 PM IST daily.</p>
              <a
                href="tel:18008906398"
                className="inline-block font-mono text-sm font-bold text-gold hover:underline"
              >
                1800-890-6398
              </a>
            </div>

            <div className="bg-surface border border-gold/30 rounded-2xl p-6 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-beige">WhatsApp VIP Concierge</h3>
              <p className="text-xs text-beige-muted">Average response time: under 5 minutes.</p>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-bold text-gold hover:underline"
              >
                Chat on WhatsApp (+91 98765 43210) →
              </a>
            </div>

            <div className="bg-surface border border-gold/30 rounded-2xl p-6 space-y-3 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-beige">Official Concierge Email</h3>
              <p className="text-xs text-beige-muted">For corporate, bespoke orders & returns.</p>
              <a
                href="mailto:concierge@nexus-luxury.com"
                className="inline-block text-xs font-mono text-gold hover:underline"
              >
                concierge@nexus-luxury.com
              </a>
            </div>
          </div>

          {/* Raise Support Ticket Form */}
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <h3 className="font-serif text-xl font-bold text-beige flex items-center gap-2">
              <Headphones className="w-5 h-5 text-gold" />
              Raise a Support Request or Return
            </h3>
            <form onSubmit={handleTicketSubmit} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-beige-muted block mb-1">
                    Issue Category
                  </label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                  >
                    <option value="Order Status & Delivery">Order Status & Live Tracking</option>
                    <option value="Request Doorstep Return">Request Doorstep Return or Exchange</option>
                    <option value="Payment & Refund Inquiry">Payment or Refund Assistance</option>
                    <option value="Size & Fitting Consultation">Size & Fitting Consultation</option>
                    <option value="Damaged or Wrong Item">Report Damaged or Defective Item</option>
                    <option value="General Inquiry">General Feedback or Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-beige-muted block mb-1">
                    Order Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ORD-20261022-XXXXXX"
                    value={ticketForm.orderNumber}
                    onChange={(e) => setTicketForm({ ...ticketForm, orderNumber: e.target.value })}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-beige-muted block mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of your request"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  required
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-beige-muted block mb-1">
                  Detailed Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Please describe how our concierge team can assist you..."
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  required
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={submittingTicket}
                className="flex items-center gap-2 text-xs"
              >
                <Send className="w-4 h-4" />
                {submittingTicket ? 'Submitting...' : 'Submit Support Ticket'}
              </Button>
            </form>
          </div>

          {/* Frequently Asked Questions */}
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-4">
            <h3 className="font-serif text-xl font-bold text-beige flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-gold" />
              Frequently Asked Questions
            </h3>
            <div className="space-y-2">
              {FAQ_ITEMS.map((faq, idx) => {
                const isOpen = expandedFaq === idx
                return (
                  <div key={idx} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-xs font-semibold text-beige hover:bg-surface-2 text-left transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gold transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-surface-2/60 border-t border-border text-xs text-beige-muted leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-beige-muted">
          Loading account...
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  )
}
