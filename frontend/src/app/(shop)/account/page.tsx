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
  Star,
  Search,
  ExternalLink,
  X,
  RotateCcw,
  CreditCard,
  ShieldCheck,
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
import { invalidateFrontendCatalogCache } from '@/lib/catalogCache'
import toast from 'react-hot-toast'
import type { Order, OrderItem, Address, MyReview, SupportTicket, ProductListItem } from '@/types'
import { cn, formatCurrency, formatDate, formatRelativeDate, optimizeImageUrl } from '@/lib/utils'

function AccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderSuccessParam = searchParams.get('orderSuccess')

  const { user, isAuthenticated, logout, updateUser } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()

  const [activeTab, setActiveTab] = React.useState<'orders' | 'addresses' | 'profile' | 'support'>('orders')
  const [orders, setOrders] = React.useState<Order[]>([])
  const [myReviewsByProduct, setMyReviewsByProduct] = React.useState<Record<string, MyReview>>({})
  const [loadingOrders, setLoadingOrders] = React.useState(true)
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null)
  const [orderStatusFilter, setOrderStatusFilter] = React.useState<'all' | 'delivered' | 'active' | 'returns' | 'cancelled'>('all')
  const [orderSearch, setOrderSearch] = React.useState('')

  // 7-Day Return & Refund request modal state
  const [returnOrderTarget, setReturnOrderTarget] = React.useState<Order | null>(null)
  const [returnForm, setReturnForm] = React.useState({
    reason: 'Size / Fit Issue',
    notes: '',
    refundMethodPreference: 'RazorpayOriginalSource',
    refundAccountDetails: '',
  })
  const [submittingReturn, setSubmittingReturn] = React.useState(false)

  // Delivered item rating & review composer state
  const [activeReviewKey, setActiveReviewKey] = React.useState<string | null>(null)
  const [reviewRating, setReviewRating] = React.useState(5)
  const [reviewTitle, setReviewTitle] = React.useState('')
  const [reviewComment, setReviewComment] = React.useState('')
  const [submittingReviewKey, setSubmittingReviewKey] = React.useState<string | null>(null)
  const [deletingReviewId, setDeletingReviewId] = React.useState<string | null>(null)

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
  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = React.useState(false)
  const [ticketForm, setTicketForm] = React.useState({
    category: 'Damaged or Wrong Item',
    issueType: 'Damaged or Defective Product',
    orderId: '',
    orderNumber: '',
    productId: '',
    productName: '',
    productImageUrl: '',
    subject: '',
    message: '',
  })
  const [productSearchTerm, setProductSearchTerm] = React.useState('')
  const [productSearchResults, setProductSearchResults] = React.useState<ProductListItem[]>([])
  const [searchingProducts, setSearchingProducts] = React.useState(false)
  const [submittingTicket, setSubmittingTicket] = React.useState(false)
  const [closingTicketId, setClosingTicketId] = React.useState<string | null>(null)
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null)

  // Search catalog products for support ticket attachment
  React.useEffect(() => {
    const q = productSearchTerm.trim()
    if (q.length < 2) {
      setProductSearchResults([])
      return
    }
    let active = true
    setSearchingProducts(true)
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<{ items?: ProductListItem[]; data?: ProductListItem[] }>('/api/products', {
          params: { search: q, page: 1, pageSize: 6 },
        })
        if (active) {
          setProductSearchResults(data?.items ?? data?.data ?? [])
        }
      } catch {
        if (active) setProductSearchResults([])
      } finally {
        if (active) setSearchingProducts(false)
      }
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [productSearchTerm])

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

  // Fetch orders, user reviews & support tickets
  const fetchOrdersAndReviews = React.useCallback(async () => {
    if (!isAuthenticated) return
    setLoadingOrders(true)
    setLoadingTickets(true)
    try {
      const [ordersRes, reviewsRes, ticketsRes] = await Promise.all([
        api.get<any>('/api/orders?pageSize=50'),
        api.get<MyReview[]>('/api/reviews/my').catch(() => ({ data: [] as MyReview[] })),
        api.get<SupportTicket[]>('/api/support/tickets').catch(() => ({ data: [] as SupportTicket[] })),
      ])
      const list: Order[] =
        ordersRes.data?.items ?? ordersRes.data?.data ?? (Array.isArray(ordersRes.data) ? ordersRes.data : [])
      setOrders(list)
      setTickets(Array.isArray(ticketsRes.data) ? ticketsRes.data : [])

      const reviewMap: Record<string, MyReview> = {}
      for (const rev of reviewsRes.data ?? []) {
        if (rev?.productId) reviewMap[rev.productId] = rev
      }
      setMyReviewsByProduct(reviewMap)

      if (list.length > 0) {
        setExpandedOrderId((prev) => prev ?? list[0].id)
      }
    } catch {
      setOrders([])
    } finally {
      setLoadingOrders(false)
      setLoadingTickets(false)
    }
  }, [isAuthenticated])

  React.useEffect(() => {
    fetchOrdersAndReviews()
  }, [fetchOrdersAndReviews, orderSuccessParam])

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

  const deliveredOrdersCount = orders.filter((o) => String(o.status).toLowerCase() === 'delivered').length
  const returnsOrdersCount = orders.filter(
    (o) =>
      (o.returnStatus && String(o.returnStatus).toLowerCase() !== 'none') ||
      String(o.status).toLowerCase() === 'refunded' ||
      String(o.paymentStatus).toLowerCase().includes('refund'),
  ).length
  const cancelledOrdersCount = orders.filter((o) => {
    const s = String(o.status).toLowerCase()
    return s === 'cancelled' || s === 'refunded'
  }).length
  const activeOrdersCount = orders.length - deliveredOrdersCount - cancelledOrdersCount

  const filteredOrders = React.useMemo(() => {
    const q = orderSearch.trim().toLowerCase()
    return orders.filter((order) => {
      const s = String(order.status).toLowerCase()
      const rs = String(order.returnStatus ?? 'None').toLowerCase()
      const ps = String(order.paymentStatus ?? '').toLowerCase()
      if (orderStatusFilter === 'delivered' && s !== 'delivered') return false
      if (orderStatusFilter === 'returns' && rs === 'none' && s !== 'refunded' && !ps.includes('refund')) return false
      if (orderStatusFilter === 'cancelled' && s !== 'cancelled' && s !== 'refunded') return false
      if (orderStatusFilter === 'active' && (s === 'delivered' || s === 'cancelled' || s === 'refunded')) return false
      if (!q) return true
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.items?.some((item) => (item.productName ?? '').toLowerCase().includes(q))
      )
    })
  }, [orders, orderStatusFilter, orderSearch])

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
      const res = await api.post<{ message?: string }>(`/api/orders/${orderId}/cancel`, {})
      toast.success(res.data?.message ?? 'Order cancelled successfully.')
      await fetchOrdersAndReviews()
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to cancel order')
    }
  }

  const handleOpenReturnModal = (order: Order) => {
    const isCod =
      order.paymentMethod === (1 as any) ||
      String(order.paymentMethod).toLowerCase().includes('cash')
    setReturnOrderTarget(order)
    setReturnForm({
      reason: 'Size / Fit Issue',
      notes: '',
      refundMethodPreference: isCod ? 'UpiTransfer' : 'RazorpayOriginalSource',
      refundAccountDetails: '',
    })
  }

  const handleSubmitReturnRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!returnOrderTarget) return
    setSubmittingReturn(true)
    try {
      await api.post(`/api/orders/${returnOrderTarget.id}/return`, {
        reason: returnForm.reason,
        notes: returnForm.notes.trim() || null,
        refundMethodPreference: returnForm.refundMethodPreference,
        refundAccountDetails: returnForm.refundAccountDetails.trim() || null,
      })
      toast.success('7-day doorstep return requested! Our concierge team will approve pickup shortly.')
      setReturnOrderTarget(null)
      await fetchOrdersAndReviews()
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to submit return request')
    } finally {
      setSubmittingReturn(false)
    }
  }

  const handleOpenDeliveredReview = (draftKey: string, initialRating = 5) => {
    setActiveReviewKey(draftKey)
    setReviewRating(initialRating)
    setReviewTitle('')
    setReviewComment('')
  }

  const handleSubmitDeliveredReview = async (e: React.FormEvent, productId: string, draftKey: string) => {
    e.preventDefault()
    if (!reviewComment.trim()) {
      toast.error('Please share your feedback about the item.')
      return
    }
    setSubmittingReviewKey(draftKey)
    try {
      const { data } = await api.post<MyReview & { userName?: string }>('/api/reviews', {
        productId,
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        comment: reviewComment.trim(),
      })
      setMyReviewsByProduct((prev) => ({
        ...prev,
        [productId]: {
          id: data.id,
          productId,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          isVerifiedPurchase: data.isVerifiedPurchase,
          createdAt: data.createdAt,
        },
      }))
      invalidateFrontendCatalogCache()
      setActiveReviewKey(null)
      setReviewTitle('')
      setReviewComment('')
      setReviewRating(5)
      toast.success('Thank you! Your rating & review has been saved.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Unable to submit review')
    } finally {
      setSubmittingReviewKey(null)
    }
  }

  const handleDeleteDeliveredReview = async (reviewId: string, productId: string) => {
    if (!confirm('Delete your rating & review for this item?')) return
    setDeletingReviewId(reviewId)
    try {
      await api.delete(`/api/reviews/${reviewId}`)
      setMyReviewsByProduct((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
      invalidateFrontendCatalogCache()
      toast.success('Review removed')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete review')
    } finally {
      setDeletingReviewId(null)
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

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) {
      toast.error('Please enter a subject and details for your support request.')
      return
    }
    setSubmittingTicket(true)
    try {
      const { data } = await api.post<SupportTicket>('/api/support/tickets', {
        category: ticketForm.category,
        issueType: ticketForm.issueType,
        orderId: ticketForm.orderId || null,
        orderNumber: ticketForm.orderNumber.trim() || null,
        productId: ticketForm.productId || null,
        subject: ticketForm.subject.trim(),
        message: ticketForm.message.trim(),
      })
      setTickets((prev) => [data, ...prev])
      setTicketForm({
        category: 'Damaged or Wrong Item',
        issueType: 'Damaged or Defective Product',
        orderId: '',
        orderNumber: '',
        productId: '',
        productName: '',
        productImageUrl: '',
        subject: '',
        message: '',
      })
      setProductSearchTerm('')
      setProductSearchResults([])
      toast.success(`Support Ticket ${data.ticketNumber} submitted to our support team!`, {
        duration: 5000,
        icon: '🛎️',
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to submit support ticket')
    } finally {
      setSubmittingTicket(false)
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    setClosingTicketId(ticketId)
    try {
      const { data } = await api.post<SupportTicket>(`/api/support/tickets/${ticketId}/close`)
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)))
      toast.success(`Ticket ${data.ticketNumber} marked as closed.`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Unable to close ticket')
    } finally {
      setClosingTicketId(null)
    }
  }

  const handleStartSupportForOrderItem = (order: Order, item: OrderItem) => {
    setTicketForm((prev) => ({
      ...prev,
      orderId: order.id,
      orderNumber: order.orderNumber,
      productId: item.productId,
      productName: item.productName ?? 'Selected Item',
      productImageUrl: item.productImageUrl ?? '',
      category: 'Damaged or Wrong Item',
      issueType: 'Damaged or Defective Product',
      subject: prev.subject || `Assistance with ${item.productName ?? order.orderNumber}`,
    }))
    setActiveTab('support')
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        document.getElementById('support-ticket-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
  }

  const getFulfillmentStep = (status: string) => {
    const s = (status ?? '').toLowerCase()
    if (s === 'cancelled' || s === 'refunded') return -1
    if (s === 'delivered') return 5
    if (s === 'outfordelivery' || s === 'out_for_delivery') return 4
    if (s === 'shipped') return 3
    if (s === 'processing') return 2
    if (s === 'confirmed') return 1
    return 0 // pending / payment pending
  }

  const getReturnStep = (returnStatus?: string) => {
    const rs = (returnStatus ?? 'None').toLowerCase()
    if (rs === 'rejected') return -2
    if (rs === 'refundcompleted') return 4
    if (rs === 'refundinitiated' || rs === 'received') return 3
    if (rs === 'pickedup') return 2
    if (rs === 'approved') return 1
    if (rs === 'requested') return 0
    return -1
  }

  const isAdmin = (user?.role ?? '').toString().toLowerCase() === 'admin'

  const FAQ_ITEMS = [
    {
      q: 'How do I track my luxury delivery?',
      a: 'All orders qualify for real-time step-by-step tracking (Placed -> Confirmed -> Packed -> Shipped -> Out for Delivery -> Delivered). Once your order is dispatched, our concierge assigns a dedicated courier tracking ID visible under My Orders.',
    },
    {
      q: 'Can I cancel an order after placing it?',
      a: 'Yes, pending, confirmed, and packing orders can be cancelled directly with 1 click from your "My Orders" tab before dispatch. Prepaid orders automatically trigger a tracked refund in our Returns & Refunds pipeline.',
    },
    {
      q: 'What is your doorstep return and exchange policy?',
      a: 'NEXUS provides a 7-day complimentary doorstep return policy from delivery. Our delivery associate collects the package from your doorstep and, once verified, settles your full refund to your original payment source, UPI ID, bank account, or store credit.',
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
        <div className="space-y-6">
          {!loadingOrders && orders.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: `All (${orders.length})` },
                  { id: 'delivered', label: `Delivered (${deliveredOrdersCount})` },
                  { id: 'active', label: `In Progress (${activeOrdersCount})` },
                  { id: 'returns', label: `Returns & Refunds (${returnsOrdersCount})` },
                  { id: 'cancelled', label: `Cancelled (${cancelledOrdersCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOrderStatusFilter(f.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      orderStatusFilter === f.id
                        ? 'bg-gold text-background shadow-sm shadow-gold/20'
                        : 'bg-surface-2 text-beige-muted hover:text-beige border border-border'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search className="w-3.5 h-3.5 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order # or item..."
                  className="w-full bg-surface-2 border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          )}

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
          ) : filteredOrders.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-gold/40 mx-auto" />
              <p className="text-sm font-medium text-beige">No matching orders found.</p>
              <button
                type="button"
                onClick={() => {
                  setOrderStatusFilter('all')
                  setOrderSearch('')
                }}
                className="text-xs font-semibold text-gold hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id
                const step = getFulfillmentStep(order.status as unknown as string)
                const returnStep = getReturnStep(order.returnStatus)
                const orderStatusNorm = order.status.toString().toLowerCase()
                const returnStatusNorm = (order.returnStatus ?? 'None').toString().toLowerCase()
                const paymentStatusNorm = (order.paymentStatus ?? '').toString().toLowerCase()
                const isCancelled = orderStatusNorm === 'cancelled'
                const isRefunded = orderStatusNorm === 'refunded' || returnStatusNorm === 'refundcompleted' || paymentStatusNorm === 'refunded'
                const canCancel =
                  orderStatusNorm === 'pending' ||
                  orderStatusNorm === 'paymentpending' ||
                  orderStatusNorm === 'confirmed' ||
                  orderStatusNorm === 'processing'
                const isDelivered = orderStatusNorm === 'delivered'
                const deliveredAnchor = order.deliveredAt ?? order.updatedAt
                const returnWindowDeadline = deliveredAnchor ? new Date(new Date(deliveredAnchor).getTime() + 7 * 24 * 60 * 60 * 1000) : null
                const isWithinReturnWindow = isDelivered && !!returnWindowDeadline && returnWindowDeadline >= new Date()
                const canRequestReturn = isWithinReturnWindow && returnStatusNorm === 'none'
                const isShipped = orderStatusNorm === 'shipped' || orderStatusNorm.includes('outfor')
                const totalUnits = order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) ?? 0
                const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Exceptional']

                return (
                  <div
                    key={order.id}
                    className={`bg-surface border rounded-2xl overflow-hidden transition-all duration-300 shadow-md ${
                      isCancelled
                        ? 'border-rose-500/30 bg-rose-950/5'
                        : isRefunded || returnStatusNorm !== 'none'
                        ? 'border-amber-500/40 bg-amber-950/5'
                        : isDelivered
                        ? 'border-emerald-500/35 bg-emerald-950/5 hover:border-emerald-500/50'
                        : isShipped
                        ? 'border-sky-500/30 bg-sky-950/5 hover:border-sky-500/50'
                        : 'border-border hover:border-gold/30'
                    }`}
                  >
                    {/* Order Card Header */}
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-2/40 border-b border-border">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-gold">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} size="md" />
                          {returnStatusNorm !== 'none' && (
                            <StatusBadge status={order.returnStatus!} size="sm" />
                          )}
                          {isDelivered && returnStatusNorm === 'none' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered {formatDate(order.deliveredAt ?? order.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-beige-muted">
                          Placed on {formatDate(order.createdAt)} • {totalUnits} {totalUnits === 1 ? 'item' : 'items'} • Payment:{' '}
                          <span className="uppercase text-beige font-semibold">
                            {order.paymentMethod === (1 as any) || String(order.paymentMethod).toLowerCase().includes('cash')
                              ? 'Cash on Delivery'
                              : 'Razorpay'}
                          </span>
                          {order.paymentStatus && (
                            <>
                              {' '}• <span className="text-gold font-semibold uppercase">{order.paymentStatus}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center">
                        <div className="text-right mr-1">
                          <span className="text-[11px] text-beige-muted block">Total Paid</span>
                          <span className="text-base font-serif font-bold text-beige">
                            {formatCurrency(order.totalAmount ?? 0)}
                          </span>
                        </div>
                        {canRequestReturn && (
                          <button
                            type="button"
                            onClick={() => handleOpenReturnModal(order)}
                            className="h-8 px-3 rounded-lg bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111] flex items-center gap-1.5 text-[11px] font-semibold transition-colors shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Request 7-Day Return</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          aria-label={isExpanded ? 'Hide price and delivery details' : 'View price and delivery details'}
                          className="h-8 px-2.5 rounded-lg bg-surface border border-border hover:border-gold/40 flex items-center gap-1.5 text-[11px] font-medium text-beige-muted hover:text-beige transition-colors"
                        >
                          <span>{isExpanded ? 'Less' : 'Invoice & Track'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* 6-Step Visual Fulfillment Progress Bar */}
                    {step >= 0 ? (
                      <div className="px-4 sm:px-6 py-5 bg-surface border-b border-border overflow-x-auto">
                        <div className="relative flex items-center justify-between min-w-[460px] max-w-3xl mx-auto">
                          <div className="absolute top-4 left-6 right-6 h-0.5 bg-border -z-0">
                            <div
                              className={`h-full transition-all duration-500 ${
                                step === 5
                                  ? 'bg-gradient-to-r from-gold via-sky-400 to-emerald-400'
                                  : 'bg-gold'
                              }`}
                              style={{ width: `${(step / 5) * 100}%` }}
                            />
                          </div>

                          {[
                            { label: 'Placed', icon: Clock, time: order.createdAt },
                            { label: 'Confirmed', icon: ShieldCheck, time: order.confirmedAt },
                            { label: 'Packed', icon: Package, time: order.processingAt },
                            { label: 'Shipped', icon: Truck, time: order.shippedAt },
                            { label: 'Out Delivery', icon: MapPin, time: order.outForDeliveryAt },
                            { label: 'Delivered', icon: Check, time: order.deliveredAt },
                          ].map((s, idx) => {
                            const isDone = idx <= step
                            const isCurrent = idx === step
                            const isCompletedDelivered = isDone && idx === 5
                            const isTransitStep = isDone && (idx === 3 || idx === 4)

                            return (
                              <div key={s.label} className="flex flex-col items-center gap-1.5 z-10 min-w-[66px]">
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
                                    isCurrent && step === 5
                                      ? 'text-emerald-600 font-bold'
                                      : isCurrent
                                      ? 'text-gold'
                                      : isDone
                                      ? 'text-beige'
                                      : 'text-beige-muted/60'
                                  }`}
                                >
                                  {s.label}
                                </span>
                                {s.time && (
                                  <span className="text-[9px] text-beige-muted/80 font-mono">
                                    {new Date(s.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className={`p-4 border-b flex items-start gap-2.5 text-xs ${
                        isRefunded
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-rose-500/10 border-rose-500/25 text-rose-800'
                      }`}>
                        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isRefunded ? 'text-emerald-600' : 'text-rose-500'}`} />
                        <div>
                          <p className="font-semibold">
                            {isRefunded
                              ? `Order Refunded (${formatCurrency(order.refundAmount ?? order.totalAmount ?? 0)})`
                              : 'Order Cancelled'}
                          </p>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {isRefunded
                              ? `Refund settled via ${order.refundMethod ?? 'Concierge Payout'}${order.refundReference ? ` • Ref: ${order.refundReference}` : ''}.`
                              : paymentStatusNorm === 'refundinitiated'
                              ? 'Prepaid cancellation refund has been queued for concierge settlement.'
                              : order.cancellationReason || 'This order was cancelled prior to dispatch.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 7-Day Return & Refund Live Status Banner */}
                    {(returnStatusNorm !== 'none' || paymentStatusNorm.includes('refund')) && (
                      <div className="px-5 py-4 bg-amber-50/50 border-b border-amber-200/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-gold" />
                            <span className="text-xs font-bold uppercase tracking-wider text-beige">
                              Return &amp; Refund Workflow
                            </span>
                            <StatusBadge status={order.returnStatus ?? order.paymentStatus} size="sm" />
                          </div>
                          {order.refundAmount && (
                            <span className="text-xs font-mono font-bold text-beige">
                              Refund Value: {formatCurrency(order.refundAmount)}
                            </span>
                          )}
                        </div>

                        {returnStep >= 0 && (
                          <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
                            {[
                              { label: 'Requested', min: 0 },
                              { label: 'Approved', min: 1 },
                              { label: 'Picked Up', min: 2 },
                              { label: 'QC Verified', min: 3 },
                              { label: 'Refund Paid', min: 4 },
                            ].map((rsItem) => {
                              const done = returnStep >= rsItem.min
                              return (
                                <div key={rsItem.label} className="space-y-1">
                                  <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-border'}`} />
                                  <span className={`block text-[10px] font-semibold ${done ? 'text-emerald-700' : 'text-beige-muted'}`}>
                                    {rsItem.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-beige-muted">
                          <div>
                            {order.returnReason && (
                              <span>
                                <strong>Reason:</strong> {order.returnReason}
                              </span>
                            )}
                            {order.returnPickupTracking && (
                              <span className="ml-3 font-mono text-gold font-semibold">
                                Pickup ID: {order.returnPickupTracking}
                              </span>
                            )}
                            {order.customerRefundAccount && (
                              <span className="ml-3">
                                Payout To: <strong className="text-beige font-mono">{order.customerRefundAccount}</strong>
                              </span>
                            )}
                          </div>
                          {order.refundReference && (
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Ref: {order.refundReference}
                            </span>
                          )}
                        </div>

                        {order.returnAdminNotes && (
                          <p className="text-[11px] text-beige bg-surface border border-border rounded-lg px-3 py-2">
                            <strong className="text-gold">Concierge Note:</strong> {order.returnAdminNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Always-Visible Ordered Items + Post-Delivery Rating & Review */}
                    <div className="p-5 sm:p-6 space-y-3 bg-surface-2/15">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gold">
                          Ordered Items ({order.items?.length ?? 0})
                        </span>
                        {isDelivered && (
                          <span className="text-[11px] font-medium text-emerald-700">
                            Delivered • Rate &amp; review your items
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {order.items?.map((item) => {
                          const draftKey = `${order.id}:${item.productId}`
                          const existingReview = myReviewsByProduct[item.productId]
                          const isComposerOpen = activeReviewKey === draftKey
                          const itemSlug = item.productSlug || item.product?.slug
                          const productHref = itemSlug ? `/products/${itemSlug}` : undefined

                          return (
                            <div
                              key={item.id}
                              className="bg-surface border border-border rounded-xl p-3.5 sm:p-4 space-y-3"
                            >
                              <div className="flex items-center gap-4">
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-2 border border-border flex-shrink-0">
                                  {item.productImageUrl ? (
                                    <Image
                                      src={optimizeImageUrl(item.productImageUrl, 160)}
                                      alt={item.productName ?? 'Product item'}
                                      fill
                                      className="object-cover"
                                      sizes="56px"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] text-beige-muted">
                                      No Img
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {productHref ? (
                                    <Link
                                      href={productHref}
                                      className="text-xs sm:text-sm font-semibold text-beige hover:text-gold transition-colors inline-flex items-center gap-1 max-w-full"
                                    >
                                      <span className="truncate">{item.productName}</span>
                                      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                                    </Link>
                                  ) : (
                                    <p className="text-xs sm:text-sm font-semibold text-beige truncate">
                                      {item.productName}
                                    </p>
                                  )}
                                  {item.variantName && (
                                    <p className="text-[11px] text-gold/80 mt-0.5">{item.variantName}</p>
                                  )}
                                  <p className="text-[11px] text-beige-muted mt-0.5">
                                    Qty: {item.quantity} × {formatCurrency(item.unitPrice ?? 0)}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0 space-y-1">
                                  <span className="text-xs sm:text-sm font-bold text-beige font-mono block">
                                    {formatCurrency(item.totalPrice ?? 0)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStartSupportForOrderItem(order, item)}
                                    className="text-[11px] font-medium text-gold hover:underline inline-flex items-center gap-1"
                                  >
                                    <Headphones className="w-3 h-3" />
                                    Need Help?
                                  </button>
                                </div>
                              </div>

                              {/* Post-Delivery Rating & Review Display / Composer */}
                              {isDelivered && (
                                <div className="pt-3 border-t border-border/70">
                                  {existingReview ? (
                                    <div className="bg-surface-2/80 border border-gold/25 rounded-xl p-3.5 space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="flex items-center gap-0.5" aria-label={`Rated ${existingReview.rating} out of 5 stars`}>
                                            {Array.from({ length: 5 }).map((_, starIdx) => (
                                              <Star
                                                key={starIdx}
                                                className={cn(
                                                  'w-3.5 h-3.5',
                                                  starIdx < existingReview.rating
                                                    ? 'text-gold fill-gold'
                                                    : 'text-beige-muted/30',
                                                )}
                                              />
                                            ))}
                                          </div>
                                          <span className="text-xs font-bold text-beige tabular-nums">
                                            {existingReview.rating}.0 / 5
                                          </span>
                                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            Your Delivered Review
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-beige-muted">
                                          <span>{formatRelativeDate(existingReview.createdAt)}</span>
                                          <button
                                            type="button"
                                            disabled={deletingReviewId === existingReview.id}
                                            onClick={() => handleDeleteDeliveredReview(existingReview.id, item.productId)}
                                            className="text-beige-muted hover:text-error transition-colors disabled:opacity-50"
                                            title="Delete your review"
                                          >
                                            {deletingReviewId === existingReview.id ? 'Removing...' : 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                      {existingReview.title && (
                                        <p className="text-xs font-semibold text-beige">{existingReview.title}</p>
                                      )}
                                      {existingReview.comment && (
                                        <p className="text-xs text-beige-muted leading-relaxed">
                                          {existingReview.comment}
                                        </p>
                                      )}
                                    </div>
                                  ) : isComposerOpen ? (
                                    <form
                                      onSubmit={(e) => handleSubmitDeliveredReview(e, item.productId, draftKey)}
                                      className="bg-surface-2/80 border border-gold/40 rounded-xl p-4 space-y-3 animate-fade-in"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-beige">
                                          Rate Delivered Product
                                        </span>
                                        <span className="text-xs font-medium text-gold">
                                          {reviewRating} / 5 • {ratingLabels[reviewRating]}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewRating(star)}
                                            aria-label={`Rate ${star} stars`}
                                            className="p-1 transition-transform hover:scale-110"
                                          >
                                            <Star
                                              className={cn(
                                                'w-5 h-5',
                                                star <= reviewRating ? 'text-gold fill-gold' : 'text-beige-muted/30',
                                              )}
                                            />
                                          </button>
                                        ))}
                                      </div>
                                      <input
                                        type="text"
                                        value={reviewTitle}
                                        onChange={(e) => setReviewTitle(e.target.value)}
                                        placeholder="Headline (optional) — e.g. Tailored fit & soft fabric"
                                        maxLength={200}
                                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                                      />
                                      <textarea
                                        rows={2}
                                        value={reviewComment}
                                        onChange={(e) => setReviewComment(e.target.value)}
                                        placeholder="Share your experience with quality, sizing, and finish after delivery..."
                                        required
                                        maxLength={2000}
                                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                                      />
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setActiveReviewKey(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          type="submit"
                                          variant="primary"
                                          size="sm"
                                          isLoading={submittingReviewKey === draftKey}
                                        >
                                          Submit Review
                                        </Button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-beige-muted">
                                          How was your delivery? Tap a rating:
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => handleOpenDeliveredReview(draftKey, star)}
                                              aria-label={`Rate ${item.productName} ${star} stars`}
                                              className="p-0.5 text-beige-muted/40 hover:text-gold transition-colors"
                                            >
                                              <Star className="w-4 h-4 hover:fill-gold" />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenDeliveredReview(draftKey, 5)}
                                        className="text-xs self-start sm:self-auto"
                                      >
                                        Rate &amp; Review Item
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Expandable Price Breakdown & Shipping Details */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 pt-0 space-y-5 animate-fade-in bg-surface-2/15 border-t border-border/60">
                        {/* Order Price Summary */}
                        <div className="bg-surface border border-border rounded-xl p-4 space-y-2 text-xs mt-5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gold block">
                            Payment Summary
                          </span>
                          <div className="flex justify-between text-beige-muted">
                            <span>Subtotal</span>
                            <span className="text-beige font-medium">{formatCurrency(order.subTotal ?? order.subtotal ?? 0)}</span>
                          </div>
                          {(order.discount ?? order.discountAmount ?? 0) > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                              <span>-{formatCurrency(order.discount ?? order.discountAmount ?? 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-beige-muted">
                            <span>Delivery Charges</span>
                            <span className={(order.shippingCost ?? 0) === 0 ? 'text-emerald-600 font-semibold' : 'text-beige font-medium'}>
                              {(order.shippingCost ?? 0) === 0 ? 'FREE' : formatCurrency(order.shippingCost ?? 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-beige-muted">
                            <span>Platform Fee</span>
                            <span className="text-beige font-medium">{formatCurrency(order.platformFee ?? 0)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-beige">
                            <span>Total Paid</span>
                            <span className="text-gold">{formatCurrency(order.totalAmount ?? 0)}</span>
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
                                  type="button"
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
          <div id="support-ticket-form" className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-xl font-bold text-beige flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-gold" />
                  Raise a Support Ticket for a Product or Order
                </h3>
                <p className="text-xs text-beige-muted mt-1">
                  Select which order &amp; product you need help with and specify the issue so our support team can review and resolve it quickly.
                </p>
              </div>
              {tickets.length > 0 && (
                <span className="text-xs font-mono font-semibold text-gold bg-gold/10 border border-gold/30 px-3 py-1 rounded-full self-start sm:self-center">
                  {tickets.filter((t) => t.status === 'Open' || t.status === 'InReview').length} Active Ticket(s)
                </span>
              )}
            </div>

            <form onSubmit={handleTicketSubmit} className="space-y-5 max-w-3xl">
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
                    <option value="Damaged or Wrong Item">Damaged, Defective or Wrong Item</option>
                    <option value="Size & Fitting Exchange">Size &amp; Fitting Exchange</option>
                    <option value="Order Status & Delivery">Order Status &amp; Delivery</option>
                    <option value="Request Doorstep Return">Request Doorstep Return or Refund</option>
                    <option value="Product Quality & Authenticity">Product Quality &amp; Authenticity</option>
                    <option value="Payment & Refund Inquiry">Payment or Coupon Inquiry</option>
                    <option value="General Inquiry">General Product / Store Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-beige-muted block mb-1">
                    Specific Product / Order Issue
                  </label>
                  <select
                    value={ticketForm.issueType}
                    onChange={(e) => setTicketForm({ ...ticketForm, issueType: e.target.value })}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                  >
                    <option value="Damaged or Defective Product">Damaged or Defective Product</option>
                    <option value="Wrong Item or Wrong Size Delivered">Wrong Item or Wrong Size Delivered</option>
                    <option value="Size & Fitting Exchange Request">Size &amp; Fitting Exchange Request</option>
                    <option value="Quality or Finish Concern">Quality or Finish Concern</option>
                    <option value="Missing Accessories or Parts">Missing Accessories or Parts</option>
                    <option value="Delivery Delay or Tracking Help">Delivery Delay or Tracking Help</option>
                    <option value="Refund or Payment Issue">Refund or Payment Issue</option>
                    <option value="Product Details & Sizing Question">Product Details &amp; Sizing Question</option>
                    <option value="Other Assistance">Other Assistance</option>
                  </select>
                </div>
              </div>

              {/* Select Order */}
              <div>
                <label className="text-xs font-semibold text-beige-muted block mb-1">
                  Related Order (Optional)
                </label>
                <select
                  value={ticketForm.orderId}
                  onChange={(e) => {
                    const selected = orders.find((o) => o.id === e.target.value)
                    setTicketForm((prev) => ({
                      ...prev,
                      orderId: selected?.id ?? '',
                      orderNumber: selected?.orderNumber ?? '',
                      productId:
                        selected && selected.items?.length === 1
                          ? selected.items[0].productId
                          : '',
                      productName:
                        selected && selected.items?.length === 1
                          ? selected.items[0].productName ?? ''
                          : '',
                      productImageUrl:
                        selected && selected.items?.length === 1
                          ? selected.items[0].productImageUrl ?? ''
                          : '',
                    }))
                  }}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold font-mono"
                >
                  <option value="">General query (not linked to a specific order)</option>
                  {orders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.orderNumber} • {String(ord.status)} • {formatCurrency(ord.totalAmount ?? 0)} ({ord.items?.length ?? 0} item{(ord.items?.length ?? 0) === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Selector from Selected Order or Catalog Search */}
              <div className="space-y-3 bg-surface-2/60 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-beige block">
                    Which Product Is This Issue About?
                  </label>
                  {ticketForm.productId && (
                    <button
                      type="button"
                      onClick={() =>
                        setTicketForm((prev) => ({
                          ...prev,
                          productId: '',
                          productName: '',
                          productImageUrl: '',
                        }))
                      }
                      className="text-[11px] text-beige-muted hover:text-error inline-flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear Product
                    </button>
                  )}
                </div>

                {/* Clickable items from chosen order */}
                {(() => {
                  const chosenOrder = orders.find((o) => o.id === ticketForm.orderId)
                  if (!chosenOrder || !chosenOrder.items?.length) return null
                  return (
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-gold font-medium block">
                        Select item from order {chosenOrder.orderNumber}:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {chosenOrder.items.map((item) => {
                          const isSelected = ticketForm.productId === item.productId
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setTicketForm((prev) => ({
                                  ...prev,
                                  productId: item.productId,
                                  productName: item.productName ?? 'Product Item',
                                  productImageUrl: item.productImageUrl ?? '',
                                }))
                              }
                              className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'border-gold bg-gold/10 shadow-sm'
                                  : 'border-border bg-surface hover:border-gold/50'
                              }`}
                            >
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-2 flex-shrink-0 border border-border">
                                {item.productImageUrl ? (
                                  <Image
                                    src={optimizeImageUrl(item.productImageUrl, 100)}
                                    alt={item.productName ?? 'Product'}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-beige truncate">{item.productName}</p>
                                <p className="text-[10px] text-beige-muted">
                                  Qty {item.quantity} • {formatCurrency(item.unitPrice ?? 0)}
                                </p>
                              </div>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Search catalog products */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      placeholder="Search any product in catalog by name (e.g. Polo T-Shirt, Denim)..."
                      className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-beige placeholder:text-beige-muted/60 focus:outline-none focus:border-gold"
                    />
                  </div>
                  {searchingProducts && (
                    <p className="text-[11px] text-beige-muted">Searching catalog...</p>
                  )}
                  {productSearchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {productSearchResults.map((p) => {
                        const thumb = p.primaryImageUrl || p.primaryImage || ''
                        const isSelected = ticketForm.productId === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setTicketForm((prev) => ({
                                ...prev,
                                productId: p.id,
                                productName: p.name,
                                productImageUrl: thumb,
                              }))
                              setProductSearchTerm('')
                              setProductSearchResults([])
                            }}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-gold bg-gold/10'
                                : 'border-border bg-surface hover:border-gold/50'
                            }`}
                          >
                            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-surface-2 flex-shrink-0 border border-border">
                              {thumb ? (
                                <Image
                                  src={optimizeImageUrl(thumb, 100)}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-beige truncate">{p.name}</p>
                              <p className="text-[10px] text-gold font-mono">{formatCurrency(p.price)}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Product Confirmation */}
                {ticketForm.productId && ticketForm.productName && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-gold/40">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-2 flex-shrink-0 border border-border">
                      {ticketForm.productImageUrl ? (
                        <Image
                          src={optimizeImageUrl(ticketForm.productImageUrl, 100)}
                          alt={ticketForm.productName}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold block">
                        Attached Product
                      </span>
                      <p className="text-xs font-semibold text-beige truncate">{ticketForm.productName}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-beige-muted block mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue (e.g. Stitch defect near collar / Size M feels tight)"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  required
                  minLength={3}
                  maxLength={200}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-beige-muted block mb-1">
                  Detailed Issue Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe what happened with the product or order and how you would like our support team to resolve it..."
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  required
                  minLength={5}
                  maxLength={2000}
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
                {submittingTicket ? 'Sending to Support Team...' : 'Submit Support Ticket'}
              </Button>
            </form>
          </div>

          {/* Customer's Raised Support Tickets & Support Team Replies */}
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-beige flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gold" />
                  My Support Tickets ({tickets.length})
                </h3>
                <p className="text-xs text-beige-muted mt-0.5">
                  Track status updates and direct responses from our Concierge &amp; Support Team.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrdersAndReviews} className="text-xs">
                Refresh Status
              </Button>
            </div>

            {loadingTickets ? (
              <div className="h-28 rounded-xl bg-surface-2 animate-pulse" />
            ) : tickets.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-2/60 border border-border text-center text-xs text-beige-muted">
                No support tickets submitted yet. Use the form above if you need assistance with any item or order.
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((tkt) => {
                  const statusTone =
                    tkt.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : tkt.status === 'InReview'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : tkt.status === 'Closed'
                      ? 'bg-surface-2 text-beige-muted border-border'
                      : 'bg-amber-50 text-amber-800 border-amber-200'

                  return (
                    <div
                      key={tkt.id}
                      className="rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gold">
                            {tkt.ticketNumber}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusTone}`}>
                            {tkt.status === 'InReview' ? 'In Review' : tkt.status}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border text-beige-muted">
                            {tkt.priority} Priority
                          </span>
                        </div>
                        <span className="text-[11px] text-beige-muted font-mono">
                          {formatDate(tkt.createdAt)}
                        </span>
                      </div>

                      {tkt.productName && (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-border">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-2 flex-shrink-0 border border-border">
                            {tkt.productImageUrl ? (
                              <Image
                                src={optimizeImageUrl(tkt.productImageUrl, 100)}
                                alt={tkt.productName}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            {tkt.productSlug ? (
                              <Link
                                href={`/products/${tkt.productSlug}`}
                                className="text-xs font-semibold text-beige hover:text-gold transition-colors truncate block"
                              >
                                {tkt.productName}
                              </Link>
                            ) : (
                              <p className="text-xs font-semibold text-beige truncate">{tkt.productName}</p>
                            )}
                            <p className="text-[11px] text-beige-muted">
                              {tkt.category} • <span className="text-gold font-medium">{tkt.issueType}</span>
                              {tkt.orderNumber ? ` • Order ${tkt.orderNumber}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {!tkt.productName && (
                        <p className="text-[11px] text-beige-muted">
                          {tkt.category} • <span className="text-gold font-medium">{tkt.issueType}</span>
                          {tkt.orderNumber ? ` • Order ${tkt.orderNumber}` : ''}
                        </p>
                      )}

                      <div>
                        <h4 className="text-sm font-bold text-beige">{tkt.subject}</h4>
                        <p className="text-xs text-beige-muted mt-1 leading-relaxed">{tkt.message}</p>
                      </div>

                      {tkt.adminResponse && (
                        <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Support Team Resolution
                              {tkt.reviewedByAdminName ? ` (${tkt.reviewedByAdminName})` : ''}
                            </span>
                            {tkt.resolvedAt && (
                              <span className="text-[10px] font-mono text-emerald-700">
                                {formatDate(tkt.resolvedAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-emerald-950 leading-relaxed">{tkt.adminResponse}</p>
                        </div>
                      )}

                      {tkt.status !== 'Closed' && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={closingTicketId === tkt.id}
                            onClick={() => handleCloseTicket(tkt.id)}
                            className="text-[11px] font-medium text-beige-muted hover:text-beige border border-border rounded-lg px-2.5 py-1 hover:bg-surface transition-colors disabled:opacity-50"
                          >
                            {closingTicketId === tkt.id ? 'Closing...' : 'Close Ticket'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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

      {/* ── 7-Day Doorstep Return & Refund Modal ── */}
      {returnOrderTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitReturnRequest}
            className="bg-surface border border-gold/40 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-slide-up my-8"
          >
            <div className="flex items-start justify-between border-b border-border pb-3 gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-gold font-bold">
                  7-Day Concierge Return Guarantee
                </span>
                <h3 className="font-serif text-xl font-bold text-beige mt-0.5">
                  Return Order <span className="font-mono text-gold">{returnOrderTarget.orderNumber}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReturnOrderTarget(null)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-surface-2/70 border border-border rounded-xl p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-beige-muted">Refundable Order Value</span>
                <span className="font-bold text-beige">{formatCurrency(returnOrderTarget.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-beige-muted">Original Payment</span>
                <span className="font-semibold text-gold uppercase">
                  {returnOrderTarget.paymentMethod === (1 as any) ||
                  String(returnOrderTarget.paymentMethod).toLowerCase().includes('cash')
                    ? 'Cash on Delivery'
                    : 'Razorpay Online'}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-beige block mb-1">Return Reason</label>
                <select
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-beige focus:outline-none focus:border-gold"
                >
                  <option value="Size / Fit Issue">Size or Fit Not Right</option>
                  <option value="Damaged or Defective Product">Damaged or Defective Product Received</option>
                  <option value="Wrong Item Delivered">Wrong Product / Variant Delivered</option>
                  <option value="Quality Not As Expected">Quality / Material Not As Expected</option>
                  <option value="Missing Accessories or Parts">Missing Accessories or Packaging Parts</option>
                  <option value="No Longer Needed (Within 7 Days)">No Longer Needed (Within 7-Day Window)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-beige block mb-1">Refund Settlement Method</label>
                <select
                  value={returnForm.refundMethodPreference}
                  onChange={(e) => setReturnForm({ ...returnForm, refundMethodPreference: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-beige focus:outline-none focus:border-gold"
                >
                  {!(
                    returnOrderTarget.paymentMethod === (1 as any) ||
                    String(returnOrderTarget.paymentMethod).toLowerCase().includes('cash')
                  ) && <option value="RazorpayOriginalSource">Original Razorpay Payment Source (Card / UPI)</option>}
                  <option value="UpiTransfer">Instant UPI Transfer</option>
                  <option value="BankTransfer">Bank NEFT / IMPS Transfer</option>
                  <option value="StoreCredit">NEXUS Concierge Store Credit</option>
                </select>
              </div>

              {returnForm.refundMethodPreference !== 'RazorpayOriginalSource' &&
                returnForm.refundMethodPreference !== 'StoreCredit' && (
                  <div>
                    <label className="font-semibold text-beige block mb-1">
                      {returnForm.refundMethodPreference === 'UpiTransfer'
                        ? 'Your UPI ID (for Refund Transfer)'
                        : 'Bank Account / IFSC Details'}
                    </label>
                    <input
                      type="text"
                      required={
                        returnOrderTarget.paymentMethod === (1 as any) ||
                        String(returnOrderTarget.paymentMethod).toLowerCase().includes('cash')
                      }
                      value={returnForm.refundAccountDetails}
                      onChange={(e) => setReturnForm({ ...returnForm, refundAccountDetails: e.target.value })}
                      placeholder={
                        returnForm.refundMethodPreference === 'UpiTransfer'
                          ? 'e.g. yourname@okicici'
                          : 'A/C No, IFSC & Account Holder Name'
                      }
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-beige font-mono focus:outline-none focus:border-gold"
                    />
                  </div>
                )}

              <div>
                <label className="font-semibold text-beige block mb-1">Additional Pickup / Condition Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  placeholder="Share condition details or preferred doorstep pickup slot..."
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-beige focus:outline-none focus:border-gold resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setReturnOrderTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submittingReturn}>
                Submit 7-Day Return Request
              </Button>
            </div>
          </form>
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
