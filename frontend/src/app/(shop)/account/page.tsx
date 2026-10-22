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
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
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

  const [activeTab, setActiveTab] = React.useState<'orders' | 'addresses' | 'profile'>('orders')
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
          // Auto-expand the newly placed order
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
    useCartStore.getState().clearCart()
    useWishlistStore.getState().clearWishlist()
    router.push('/')
    toast.success('Signed out successfully')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await api.put<any>('/api/auth/me', {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phoneNumber: profileForm.phone.trim(),
      })
      updateUser(res.data)
      toast.success('Profile updated successfully!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAddr.fullName || !newAddr.phone || !newAddr.addressLine1 || !newAddr.city || !newAddr.pinCode) {
      toast.error('Please fill in required address fields')
      return
    }
    try {
      const res = await api.post<Address>('/api/addresses', {
        fullName: newAddr.fullName,
        phoneNumber: newAddr.phone,
        addressLine1: newAddr.addressLine1,
        addressLine2: newAddr.addressLine2 || null,
        city: newAddr.city,
        state: newAddr.state || 'State',
        pinCode: newAddr.pinCode,
        country: 'India',
        addressType: newAddr.addressType,
        isDefault: addresses.length === 0,
      })
      setAddresses([...addresses, res.data])
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
      toast.success('Address saved successfully!')
    } catch {
      toast.error('Failed to save address')
    }
  }

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.delete(`/api/addresses/${id}`)
      setAddresses(addresses.filter((a) => a.id !== id))
      toast.success('Address removed')
    } catch {
      toast.error('Failed to delete address')
    }
  }

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await api.patch(`/api/addresses/${id}/default`)
      setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id })))
      toast.success('Default address updated')
    } catch {
      toast.error('Failed to set default')
    }
  }

  const isAdmin = user?.role === 'admin' || (user?.role as unknown as string) === 'Admin'

  const getStatusStep = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'delivered') return 4
    if (s === 'shipped') return 3
    if (s === 'confirmed' || s === 'processing') return 2
    return 1 // pending
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Order Success Banner */}
      {orderSuccessParam && (
        <div className="bg-gradient-to-r from-gold/20 via-surface to-gold/10 border border-gold/40 rounded-2xl p-6 sm:p-8 mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in shadow-xl shadow-gold/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-gold flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-beige">
                Order Confirmed! 🎉
              </h2>
              <p className="text-sm text-beige-muted mt-1">
                Thank you for choosing NEXUS. Your order{' '}
                <span className="font-mono text-gold font-semibold">{orderSuccessParam}</span> is being
                curated and will be dispatched promptly.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.replace('/account')} className="flex-shrink-0">
            Dismiss
          </Button>
        </div>
      )}

      {/* Profile Header Summary */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold font-serif text-2xl font-bold shadow-md shadow-gold/10">
            {user?.firstName?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-bold text-beige">
                {user?.firstName} {user?.lastName}
              </h1>
              {isAdmin && <Badge variant="gold">ADMIN</Badge>}
            </div>
            <p className="text-sm text-beige-muted mt-0.5">{user?.email}</p>
            {user?.phone && <p className="text-xs text-gold/80 mt-0.5 font-mono">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdmin && (
            <Button variant="primary" size="sm" asChild>
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Control Center
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-error" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-4 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'orders'
              ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
              : 'text-beige-muted hover:text-beige hover:bg-surface'
          }`}
        >
          <Package className="w-4 h-4" />
          My Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'addresses'
              ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
              : 'text-beige-muted hover:text-beige hover:bg-surface'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Saved Addresses
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'profile'
              ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
              : 'text-beige-muted hover:text-beige hover:bg-surface'
          }`}
        >
          <User className="w-4 h-4" />
          Profile Settings
        </button>
      </div>

      {/* ─── TAB 1: ORDERS ─────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {loadingOrders ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-32 bg-surface border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 text-beige-muted/30 mx-auto mb-4" />
              <h3 className="font-serif text-2xl font-semibold text-beige mb-2">No orders placed yet</h3>
              <p className="text-sm text-beige-muted mb-6 max-w-md mx-auto">
                Explore our catalog to discover curated luxury watches, jewelry, and exquisite fragrances.
              </p>
              <Button variant="primary" size="md" asChild>
                <Link href="/products">Discover Catalogue</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id
                const currentStep = getStatusStep(order.status)
                const isCancelled = order.status.toLowerCase() === 'cancelled'

                return (
                  <div
                    key={order.id}
                    className="bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:border-gold/30 shadow-lg shadow-black/20"
                  >
                    {/* Order summary header */}
                    <div
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-6 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface hover:bg-surface-2/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-base font-bold text-gold">
                            {order.orderNumber}
                          </span>
                          <Badge
                            variant={
                              order.status === 'delivered'
                                ? 'success'
                                : order.status === 'cancelled'
                                ? 'error'
                                : 'gold'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-beige-muted">
                          Placed on {formatDate(order.createdAt)} • {order.items?.length ?? 0}{' '}
                          {order.items?.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-center">
                        <div className="text-right">
                          <p className="font-serif text-xl font-bold text-beige">
                            {formatCurrency(order.totalAmount ?? order.total ?? 0)}
                          </p>
                          <p className="text-[11px] text-beige-muted uppercase tracking-wider">
                            {order.paymentMethod} • {order.paymentStatus}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Progress tracking bar */}
                    {!isCancelled && (
                      <div className="px-6 py-4 bg-surface-2/40 border-t border-border">
                        <div className="flex items-center justify-between text-xs font-medium">
                          {[
                            { label: 'Order Placed', step: 1, icon: Check },
                            { label: 'Confirmed', step: 2, icon: CheckCircle2 },
                            { label: 'Dispatched', step: 3, icon: Truck },
                            { label: 'Delivered', step: 4, icon: Sparkles },
                          ].map((s, idx) => {
                            const isDone = currentStep >= s.step
                            return (
                              <div key={s.label} className="flex flex-col items-center flex-1 text-center">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mb-1.5 transition-all ${
                                    isDone
                                      ? 'bg-gold text-background font-bold shadow-md shadow-gold/20'
                                      : 'bg-surface border border-border text-beige-muted/40'
                                  }`}
                                >
                                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                </div>
                                <span
                                  className={`text-[11px] hidden sm:block ${
                                    isDone ? 'text-gold font-medium' : 'text-beige-muted/40'
                                  }`}
                                >
                                  {s.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Expandable Order Details */}
                    {isExpanded && (
                      <div className="p-6 border-t border-border space-y-6 bg-surface/50 animate-fade-in">
                        {/* Ordered Items List */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase text-beige-muted tracking-wider mb-4">
                            Ordered Items
                          </h4>
                          <div className="divide-y divide-border">
                            {order.items?.map((item) => (
                              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-2 border border-border flex-shrink-0">
                                    {item.productImageUrl ? (
                                      <Image
                                        src={item.productImageUrl}
                                        alt={item.productName ?? 'Item'}
                                        fill
                                        className="object-cover"
                                        sizes="56px"
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-beige-muted/30">
                                        <Package className="w-5 h-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-beige text-sm">{item.productName}</p>
                                    {item.variantName && (
                                      <p className="text-xs text-gold/80">{item.variantName}</p>
                                    )}
                                    <p className="text-xs text-beige-muted">
                                      Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-semibold text-beige text-sm">
                                  {formatCurrency(item.totalPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping destination & Tracking */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
                          <div>
                            <span className="font-semibold uppercase text-beige-muted block mb-1">
                              Shipping Recipient
                            </span>
                            <p className="text-beige font-medium">{order.shippingName}</p>
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
                            <span className="font-semibold uppercase text-beige-muted block mb-1">
                              Delivery & Tracking
                            </span>
                            <p className="text-beige">
                              Method:{' '}
                              <span className="text-gold font-medium uppercase">
                                Complimentary White-Glove
                              </span>
                            </p>
                            {order.trackingNumber ? (
                              <p className="text-beige mt-1">
                                Tracking No:{' '}
                                <span className="font-mono text-gold font-bold">
                                  {order.trackingNumber}
                                </span>
                              </p>
                            ) : (
                              <p className="text-beige-muted mt-1 italic">
                                Tracking number will update once dispatched.
                              </p>
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
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </Button>
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <form onSubmit={handleAddAddress} className="bg-surface border border-gold/40 rounded-2xl p-6 sm:p-8 space-y-4 animate-slide-up shadow-xl">
              <h3 className="font-serif text-lg font-bold text-beige border-b border-border pb-3">
                New Address Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  placeholder="Recipient Name"
                  value={newAddr.fullName}
                  onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="+91 98765 43210"
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Street Address / Residence"
                placeholder="House / Flat / Street"
                value={newAddr.addressLine1}
                onChange={(e) => setNewAddr({ ...newAddr, addressLine1: e.target.value })}
                required
              />

              <Input
                label="Landmark / Area (Optional)"
                placeholder="Near landmark"
                value={newAddr.addressLine2}
                onChange={(e) => setNewAddr({ ...newAddr, addressLine2: e.target.value })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-beige-muted text-sm">No saved addresses found. Add one for quick checkout.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between gap-4"
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
        <div className="max-w-xl bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="font-serif text-2xl font-bold text-beige border-b border-border pb-3">
            Profile Settings
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
              Update Profile
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-16 text-center text-beige-muted">Loading account...</div>}>
      <AccountContent />
    </Suspense>
  )
}
