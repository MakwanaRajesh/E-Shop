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
  AlertTriangle,
  Bell,
  FileText,
  Printer,
  Layers,
  ListPlus,
  Copy,
  ShieldAlert,
  FolderPlus,
  LayoutGrid,
  RotateCcw,
  PackagePlus,
  Filter,
  MessageSquare,
  Clock,
  CreditCard,
  Check,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Download,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SecurityBadge, type SecurityPostureInfo } from '@/components/ui/SecurityBadge'
import { Input } from '@/components/ui/Input'
import api, { getApiBaseUrl } from '@/lib/api'
import { invalidateFrontendCatalogCache } from '@/lib/catalogCache'
import toast, { Toaster } from 'react-hot-toast'
import { AuthModal } from '@/components/auth/AuthModal'
import type { DashboardStats, Order, ProductListItem, Category, SupportTicket } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateTaxInvoicePdfBlob } from '@/lib/invoicePdf'

const safeStr = (s?: string | null) => (s ?? '').toLowerCase().trim()
const isValidImageUrl = (url?: string | null) =>
  !!url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))

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
  timesUsed?: number
  usedCount?: number
  isActive: boolean
  expiresAt?: string
}

interface SecurityAlertDto {
  id: string
  severity: 'Critical' | 'High' | 'Medium' | 'Warning' | string
  category: string
  title: string
  description: string
  timestamp: string
  ipAddress?: string
  referenceId?: string
  isResolved: boolean
  actionTaken?: string
}

interface BulkProductRow {
  name: string
  price: string
  compareAtPrice: string
  stock: string
  sku: string
  imageUrl: string
  tags: string
  shortDescription: string
  isFeatured: boolean
}

function AdminContent() {
  const { user, isAuthenticated, logout, updateUser } = useAuthStore()
  const { open: openAuthModal } = useAuthModalStore()
  const [mounted, setMounted] = React.useState(false)
  const [serverVerifiedAdmin, setServerVerifiedAdmin] = React.useState(false)
  const [roleCheckLoading, setRoleCheckLoading] = React.useState(true)
  const [portalError, setPortalError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Navigation state
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'orders' | 'returns' | 'products' | 'categories' | 'support' | 'security' | 'coupons' | 'customers' | 'settings'
  >('overview')

  // Main data states
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [returnsOrders, setReturnsOrders] = React.useState<Order[]>([])
  const [returnsSummary, setReturnsSummary] = React.useState({
    requestedCount: 0,
    inPickupCount: 0,
    pendingPayoutCount: 0,
    pendingPayoutAmount: 0,
    completedCount: 0,
    totalRefundedAmount: 0,
    rejectedCount: 0,
  })
  const [returnFilter, setReturnFilter] = React.useState<'all' | 'requested' | 'pickup' | 'payout' | 'completed' | 'rejected'>('all')
  const [returnSearch, setReturnSearch] = React.useState('')
  const [returnDrafts, setReturnDrafts] = React.useState<
    Record<
      string,
      {
        pickupTracking: string
        adminNotes: string
        refundAmount: string
        refundMethod: string
        refundReference: string
        restockInventory: boolean
      }
    >
  >({})
  const [processingReturnId, setProcessingReturnId] = React.useState<string | null>(null)
  const [products, setProducts] = React.useState<ProductListItem[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [coupons, setCoupons] = React.useState<CouponDto[]>([])
  const [customers, setCustomers] = React.useState<CustomerDto[]>([])
  const [supportTickets, setSupportTickets] = React.useState<SupportTicket[]>([])
  const [ticketStatusFilter, setTicketStatusFilter] = React.useState<'all' | 'Open' | 'InReview' | 'Resolved' | 'Closed'>('all')
  const [ticketSearch, setTicketSearch] = React.useState('')
  const [ticketDrafts, setTicketDrafts] = React.useState<
    Record<string, { status: string; priority: string; adminResponse: string }>
  >({})
  const [savingTicketId, setSavingTicketId] = React.useState<string | null>(null)
  const [alerts, setAlerts] = React.useState<SecurityAlertDto[]>([])
  const [securityPosture, setSecurityPosture] = React.useState<SecurityPostureInfo | null>(null)
  const [unreadAlerts, setUnreadAlerts] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  // Filters & searches
  const [prodSearch, setProdSearch] = React.useState('')
  const [prodDeptFilter, setProdDeptFilter] = React.useState('all')
  const [prodSubFilter, setProdSubFilter] = React.useState('all')
  const [orderStatusFilter, setOrderStatusFilter] = React.useState('all')
  const [orderSearch, setOrderSearch] = React.useState('')
  const [customerSearch, setCustomerSearch] = React.useState('')
  const [securityFilter, setSecurityFilter] = React.useState<'all' | 'unresolved' | 'critical' | 'resolved'>('all')

  // Modals & Category Drawer state
  const [showAddProductModal, setShowAddProductModal] = React.useState(false)
  const [showBulkAddModal, setShowBulkAddModal] = React.useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = React.useState(false)
  const [showEditProductModal, setShowEditProductModal] = React.useState(false)
  const [selectedProductToEdit, setSelectedProductToEdit] = React.useState<ProductListItem | null>(null)
  const [inspectOrder, setInspectOrder] = React.useState<Order | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = React.useState(false)
  const [showEditCategoryModal, setShowEditCategoryModal] = React.useState(false)
  const [selectedCategoryDetail, setSelectedCategoryDetail] = React.useState<Category | null>(null)
  const [categorySearch, setCategorySearch] = React.useState('')
  const [categoryViewMode, setCategoryViewMode] = React.useState<'hierarchy' | 'flat'>('hierarchy')
  const [editingCategory, setEditingCategory] = React.useState<{
    id: string
    name: string
    description: string
    imageUrl: string
    parentId: string
    sortOrder: number
  } | null>(null)
  const [showAddCouponModal, setShowAddCouponModal] = React.useState(false)

  // Bulk Product state
  const [bulkTargetCategoryId, setBulkTargetCategoryId] = React.useState('')
  const [bulkMode, setBulkMode] = React.useState<'table' | 'paste'>('table')
  const [bulkPasteText, setBulkPasteText] = React.useState('')
  const [isSubmittingBulk, setIsSubmittingBulk] = React.useState(false)
  const [bulkRows, setBulkRows] = React.useState<BulkProductRow[]>([
    {
      name: '',
      price: '',
      compareAtPrice: '',
      stock: '15',
      sku: '',
      imageUrl: '',
      tags: 'apparel, luxury, new',
      shortDescription: '',
      isFeatured: false,
    },
    {
      name: '',
      price: '',
      compareAtPrice: '',
      stock: '15',
      sku: '',
      imageUrl: '',
      tags: 'apparel, luxury, new',
      shortDescription: '',
      isFeatured: false,
    },
  ])

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

  // Full edit product form state
  const [editForm, setEditForm] = React.useState({
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
    isActive: true,
  })
  const [isUpdatingProd, setIsUpdatingProd] = React.useState(false)

  // Order status update state
  const [orderStatusUpdate, setOrderStatusUpdate] = React.useState('')
  const [orderCourierUpdate, setOrderCourierUpdate] = React.useState('NEXUS White-Glove')
  const [orderTrackingUpdate, setOrderTrackingUpdate] = React.useState('')
  const [orderCancelReason, setOrderCancelReason] = React.useState('')
  const [isUpdatingOrder, setIsUpdatingOrder] = React.useState(false)

  // Add Category form state
  const [newCat, setNewCat] = React.useState({
    name: '',
    description: '',
    imageUrl: '',
    parentId: '',
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

  const isAdmin = serverVerifiedAdmin

  // Authoritative server-side RBAC check against GET /api/auth/me (prevents localStorage role tampering)
  React.useEffect(() => {
    let cancelled = false
    const verifyServerRole = async () => {
      if (!mounted) return
      if (!isAuthenticated) {
        setServerVerifiedAdmin(false)
        setRoleCheckLoading(false)
        return
      }
      setRoleCheckLoading(true)
      try {
        const { data } = await api.get<any>('/api/auth/me')
        if (cancelled) return
        if (data) {
          updateUser(data)
        }
        const serverRole = String(data?.role ?? '').toLowerCase()
        const verified = serverRole === 'admin' && data?.isActive !== false
        setServerVerifiedAdmin(verified)
        if (!verified) {
          setPortalError('Access denied: Administrator privileges are verified server-side.')
        }
      } catch (err: any) {
        if (!cancelled) {
          const code = err?.statusCode ?? 0
          setServerVerifiedAdmin(false)
          if (code !== 401 && code !== 403) {
            setPortalError(
              err?.message ?? 'Unable to verify administrator session right now. Please click Retry.',
            )
          }
        }
      } finally {
        if (!cancelled) setRoleCheckLoading(false)
      }
    }
    verifyServerRole()
    return () => {
      cancelled = true
    }
  }, [mounted, isAuthenticated, updateUser])

  // Fetch all admin data
  const fetchAllData = React.useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return
    setLoading(true)
    setPortalError(null)
    try {
      const failedEndpoints: string[] = []
      const [dashRes, ordRes, prodRes, catRes, coupRes, custRes, alertRes, supportRes, returnsRes] = await Promise.all([
        api.get<DashboardStats>('/api/admin/dashboard').catch((e) => {
          failedEndpoints.push(`dashboard (${e?.statusCode || 'network'})`)
          return null
        }),
        api.get<any>('/api/admin/orders?pageSize=100').catch((e) => {
          failedEndpoints.push(`orders (${e?.statusCode || 'network'})`)
          return null
        }),
        api.get<any>('/api/admin/products?pageSize=100').catch((e) => {
          failedEndpoints.push(`products (${e?.statusCode || 'network'})`)
          return null
        }),
        api.get<Category[]>('/api/categories').catch(() => null),
        api.get<CouponDto[]>('/api/coupons').catch(() => null),
        api.get<any>('/api/admin/customers?pageSize=100').catch(() => null),
        api.get<any>('/api/admin/security/alerts').catch(() => null),
        api.get<any>('/api/admin/support/tickets?pageSize=100').catch(() => null),
        api.get<any>('/api/admin/returns').catch(() => null),
      ])

      if (failedEndpoints.length > 0) {
        setPortalError(
          `Could not load ${failedEndpoints.join(', ')}. Ensure the backend API (${getApiBaseUrl()}) is reachable and your Admin session is active.`
        )
      }

      if (dashRes?.data) setStats(dashRes.data)

      const ordList = ordRes?.data?.items ?? ordRes?.data?.Items ?? ordRes?.data?.data ?? []
      setOrders(Array.isArray(ordList) ? ordList : [])

      if (returnsRes?.data) {
        const retList = returnsRes.data.items ?? returnsRes.data.Items ?? []
        setReturnsOrders(Array.isArray(retList) ? retList : [])
        setReturnsSummary({
          requestedCount: returnsRes.data.requestedCount ?? returnsRes.data.RequestedCount ?? 0,
          inPickupCount: returnsRes.data.inPickupCount ?? returnsRes.data.InPickupCount ?? 0,
          pendingPayoutCount: returnsRes.data.pendingPayoutCount ?? returnsRes.data.PendingPayoutCount ?? 0,
          pendingPayoutAmount: returnsRes.data.pendingPayoutAmount ?? returnsRes.data.PendingPayoutAmount ?? 0,
          completedCount: returnsRes.data.completedCount ?? returnsRes.data.CompletedCount ?? 0,
          totalRefundedAmount: returnsRes.data.totalRefundedAmount ?? returnsRes.data.TotalRefundedAmount ?? 0,
          rejectedCount: returnsRes.data.rejectedCount ?? returnsRes.data.RejectedCount ?? 0,
        })
      }

      const prodList = prodRes?.data?.items ?? prodRes?.data?.Items ?? prodRes?.data?.data ?? []
      setProducts(Array.isArray(prodList) ? prodList : [])

      if (catRes?.data) {
        setCategories(catRes.data)
        if (catRes.data.length > 0) {
          setNewProd((p) => (p.categoryId ? p : { ...p, categoryId: catRes.data[0].id }))
          const firstChild = catRes.data[0].children?.[0]?.id ?? catRes.data[0].id
          setBulkTargetCategoryId((prev) => prev || firstChild)
        }
      }

      if (coupRes?.data) setCoupons(coupRes.data)

      const custList = custRes?.data?.items ?? custRes?.data?.Items ?? custRes?.data?.data ?? []
      setCustomers(Array.isArray(custList) ? custList : [])

      if (alertRes?.data) {
        setAlerts(alertRes.data.alerts ?? alertRes.data.Alerts ?? [])
        setUnreadAlerts(alertRes.data.unreadCount ?? alertRes.data.UnreadCount ?? 0)
        setSecurityPosture(alertRes.data.securityPosture ?? alertRes.data.SecurityPosture ?? null)
      }

      const tktList = supportRes?.data?.items ?? supportRes?.data?.Items ?? supportRes?.data?.data ?? []
      setSupportTickets(Array.isArray(tktList) ? tktList : [])
    } catch {
      setPortalError('Failed to load portal data. Please check your connection and sign in again.')
      toast.error('Failed to load portal data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, isAdmin])

  React.useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleUpdateSupportTicket = async (
    ticketId: string,
    overrideStatus?: 'Open' | 'InReview' | 'Resolved' | 'Closed',
  ) => {
    const existing = supportTickets.find((t) => t.id === ticketId)
    if (!existing) return
    const draft = ticketDrafts[ticketId] ?? {
      status: existing.status,
      priority: existing.priority,
      adminResponse: existing.adminResponse ?? '',
    }
    const nextStatus = overrideStatus ?? draft.status
    setSavingTicketId(ticketId)
    try {
      const { data } = await api.patch<SupportTicket>(`/api/admin/support/tickets/${ticketId}`, {
        status: nextStatus,
        priority: draft.priority,
        adminResponse: draft.adminResponse,
      })
      setSupportTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)))
      setTicketDrafts((prev) => ({
        ...prev,
        [ticketId]: {
          status: data.status,
          priority: data.priority,
          adminResponse: data.adminResponse ?? '',
        },
      }))
      toast.success(`Ticket ${data.ticketNumber} updated to ${data.status}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update support ticket')
    } finally {
      setSavingTicketId(null)
    }
  }

  // Security Alert Handlers
  const handleResolveAlert = async (alertId: string, customAction?: string) => {
    try {
      await api.patch(`/api/admin/security/alerts/${alertId}/resolve`, {
        action: customAction ?? 'Reviewed and verified safe by administrator',
      })
      toast.success('Alert resolved and archived.')
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, isResolved: true, actionTaken: customAction ?? 'Reviewed and verified safe' }
            : a
        )
      )
      setUnreadAlerts((prev) => Math.max(0, prev - 1))
    } catch {
      toast.error('Failed to update alert')
    }
  }

  const handleToggleUserSecurity = async (customerId: string) => {
    try {
      const res = await api.post<{ message: string; isActive: boolean }>(
        `/api/admin/security/toggle-user-status/${customerId}`
      )
      toast.success(res.data.message)
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, isActive: res.data.isActive } : c))
      )
    } catch {
      toast.error('Failed to update customer status')
    }
  }

  // Bulk Product Handlers
  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        name: '',
        price: '',
        compareAtPrice: '',
        stock: '15',
        sku: '',
        imageUrl: '',
        tags: 'apparel, luxury',
        shortDescription: '',
        isFeatured: false,
      },
    ])
  }

  const handleRemoveBulkRow = (index: number) => {
    setBulkRows((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleDuplicateBulkRow = (index: number) => {
    const row = bulkRows[index]
    if (!row) return
    setBulkRows((prev) => [
      ...prev,
      { ...row, name: `${row.name} (Variant)`, sku: row.sku ? `${row.sku}-2` : '' },
    ])
  }

  const handleLoadBulkTemplate = (type: 'mens-tees' | 'womens-dresses' | 'footwear') => {
    if (type === 'mens-tees') {
      setBulkRows([
        {
          name: 'Nexus Pima Cotton Ribbed Tee',
          price: '2499',
          compareAtPrice: '3499',
          stock: '25',
          sku: 'NX-M-TEE-01',
          imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
          tags: 'men, t-shirts, cotton, casual',
          shortDescription: '100% Peruvian Pima cotton with micro-ribbed crew neckline.',
          isFeatured: true,
        },
        {
          name: 'Nexus Relaxed Mercerized Polo',
          price: '3299',
          compareAtPrice: '4299',
          stock: '20',
          sku: 'NX-M-POLO-02',
          imageUrl: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=800&q=80',
          tags: 'men, polo, mercerized, smart',
          shortDescription: 'Lustrous mercerized cotton polo with mother-of-pearl buttons.',
          isFeatured: false,
        },
        {
          name: 'Nexus Heavyweight Raw Hem Tee',
          price: '2199',
          compareAtPrice: '2999',
          stock: '30',
          sku: 'NX-M-TEE-03',
          imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
          tags: 'men, heavyweight, oversized, raw',
          shortDescription: '280 GSM heavyweight structured streetwear cut with dropped shoulders.',
          isFeatured: false,
        },
      ])
    } else if (type === 'womens-dresses') {
      setBulkRows([
        {
          name: 'Nexus Silk Satin Slip Midi Dress',
          price: '5499',
          compareAtPrice: '7999',
          stock: '15',
          sku: 'NX-W-SLIP-01',
          imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
          tags: 'women, dress, silk, evening',
          shortDescription: 'Pure mulberry silk satin with delicate cowl neck and bias cut.',
          isFeatured: true,
        },
        {
          name: 'Nexus Tailored Double-Breasted Blazer Dress',
          price: '6999',
          compareAtPrice: '9499',
          stock: '12',
          sku: 'NX-W-BLZ-02',
          imageUrl: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80',
          tags: 'women, blazer, dress, couture',
          shortDescription: 'Structured crepe blazer dress with satin peak lapels and gold buttons.',
          isFeatured: true,
        },
      ])
    } else {
      setBulkRows([
        {
          name: 'Nexus Tuscan Suede Loafer',
          price: '7999',
          compareAtPrice: '11999',
          stock: '10',
          sku: 'NX-SHOE-01',
          imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80',
          tags: 'footwear, shoes, leather, suede',
          shortDescription: 'Handcrafted Italian suede loafer with cushioned leather insole.',
          isFeatured: true,
        },
        {
          name: 'Nexus Minimalist Low-Top Sneaker',
          price: '5999',
          compareAtPrice: '7999',
          stock: '18',
          sku: 'NX-SHOE-02',
          imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80',
          tags: 'footwear, sneakers, leather, white',
          shortDescription: 'Full-grain calfskin leather sneaker with Margom rubber cupsole.',
          isFeatured: false,
        },
      ])
    }
  }

  const handleParseBulkPaste = () => {
    if (!bulkPasteText.trim()) return
    const lines = bulkPasteText.trim().split('\n')
    const newItems: BulkProductRow[] = []

    for (const line of lines) {
      if (!line.trim() || line.startsWith('#')) continue
      // Format: Name | Price | Stock | ImageUrl | Tags
      const parts = line.split(/[|\t,]/).map((p) => p.trim())
      if (parts.length >= 2) {
        newItems.push({
          name: parts[0] || 'New Product',
          price: parts[1]?.replace(/[^0-9.]/g, '') || '1999',
          compareAtPrice: parts[2]?.replace(/[^0-9.]/g, '') || '',
          stock: parts[3]?.replace(/[^0-9]/g, '') || '15',
          sku: parts[4] || '',
          imageUrl: parts[5] || '',
          tags: parts[6] || 'apparel, luxury',
          shortDescription: '',
          isFeatured: false,
        })
      }
    }

    if (newItems.length > 0) {
      setBulkRows(newItems)
      setBulkMode('table')
      toast.success(`Parsed ${newItems.length} products into table editor!`)
    } else {
      toast.error('Could not parse text. Use format: Name | Price | Stock | ImageUrl')
    }
  }

  const handleCreateBulkProducts = async () => {
    if (!bulkTargetCategoryId) {
      toast.error('Please choose a target category')
      return
    }

    const validRows = bulkRows.filter((r) => r.name.trim() && parseFloat(r.price) > 0)
    if (validRows.length === 0) {
      toast.error('Please enter at least one valid product title and price')
      return
    }

    setIsSubmittingBulk(true)
    try {
      const payload = {
        defaultCategoryId: bulkTargetCategoryId,
        products: validRows.map((r) => ({
          name: r.name.trim(),
          price: parseFloat(r.price),
          compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
          stock: parseInt(r.stock || '10', 10),
          sku: r.sku.trim() || null,
          imageUrl: r.imageUrl.trim() || null,
          tags: r.tags.trim() || null,
          shortDescription: r.shortDescription.trim() || null,
          description: r.shortDescription.trim() || r.name.trim(),
          isFeatured: r.isFeatured,
          categoryId: bulkTargetCategoryId,
        })),
      }

      const res = await api.post<any>('/api/products/bulk', payload)
      invalidateFrontendCatalogCache()
      toast.success(res.data.message ?? `${validRows.length} products added successfully! 🎉`)
      setShowBulkAddModal(false)
      fetchAllData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to publish bulk products')
    } finally {
      setIsSubmittingBulk(false)
    }
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
      invalidateFrontendCatalogCache()
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

  // Open Full Edit Product Modal
  const handleOpenEditProduct = (prod: ProductListItem) => {
    setSelectedProductToEdit(prod)
    setEditForm({
      name: prod.name ?? '',
      categoryId: prod.categoryId ?? prod.category?.id ?? categories[0]?.id ?? '',
      price: String(prod.price ?? ''),
      compareAtPrice: prod.compareAtPrice ? String(prod.compareAtPrice) : '',
      stock: String(prod.stock ?? prod.stockQuantity ?? 0),
      sku: prod.sku ?? '',
      tags: typeof prod.tags === 'string' ? prod.tags : Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
      shortDescription: prod.shortDescription ?? '',
      description: (prod as any).description ?? prod.shortDescription ?? prod.name ?? '',
      imageUrl: prod.primaryImageUrl ?? prod.primaryImage ?? '',
      isFeatured: !!prod.isFeatured,
      isActive: prod.isActive !== false,
    })
    setShowEditProductModal(true)
  }

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductToEdit) return
    if (!editForm.name.trim() || !editForm.price || !editForm.categoryId) {
      toast.error('Title, category, and price are required')
      return
    }
    setIsUpdatingProd(true)
    try {
      await api.put(`/api/products/${selectedProductToEdit.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || editForm.shortDescription.trim() || editForm.name.trim(),
        shortDescription: editForm.shortDescription.trim() || null,
        price: parseFloat(editForm.price),
        compareAtPrice: editForm.compareAtPrice ? parseFloat(editForm.compareAtPrice) : null,
        sku: editForm.sku.trim() || null,
        tags: editForm.tags.trim() || null,
        stock: parseInt(editForm.stock || '0', 10),
        categoryId: editForm.categoryId,
        isActive: editForm.isActive,
        isFeatured: editForm.isFeatured,
        trackInventory: true,
      })

      const originalImg = selectedProductToEdit.primaryImageUrl ?? selectedProductToEdit.primaryImage ?? ''
      if (editForm.imageUrl.trim() && editForm.imageUrl.trim() !== originalImg && isValidImageUrl(editForm.imageUrl.trim())) {
        await api.post(`/api/products/${selectedProductToEdit.id}/images`, {
          url: editForm.imageUrl.trim(),
          altText: editForm.name.trim(),
          isPrimary: true,
          sortOrder: 0,
        })
      }

      toast.success('Product updated successfully!')
      invalidateFrontendCatalogCache()
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
      invalidateFrontendCatalogCache()
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
      invalidateFrontendCatalogCache()
      setProducts((prev) => prev.filter((p) => p.id !== prodId))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    }
  }

  // Order Fulfillment Step Helpers
  const getOrderStepInfo = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    if (s === 'cancelled') return { step: -1, label: 'Cancelled', nextStatus: null, nextLabel: null }
    if (s === 'refunded') return { step: -2, label: 'Refunded', nextStatus: null, nextLabel: null }
    if (s === 'delivered') return { step: 5, label: 'Step 6/6 • Delivered', nextStatus: null, nextLabel: null }
    if (s === 'outfordelivery' || s === 'out_for_delivery')
      return { step: 4, label: 'Step 5/6 • Out for Delivery', nextStatus: 'delivered', nextLabel: 'Mark Delivered' }
    if (s === 'shipped')
      return { step: 3, label: 'Step 4/6 • Shipped', nextStatus: 'outfordelivery', nextLabel: 'Out for Delivery' }
    if (s === 'processing')
      return { step: 2, label: 'Step 3/6 • Packed & QC', nextStatus: 'shipped', nextLabel: 'Dispatch Order' }
    if (s === 'confirmed')
      return { step: 1, label: 'Step 2/6 • Confirmed', nextStatus: 'processing', nextLabel: 'Start Packing' }
    return { step: 0, label: 'Step 1/6 • Pending', nextStatus: 'confirmed', nextLabel: 'Confirm Order' }
  }

  const getValidNextStatuses = (currentStatus?: string) => {
    const s = (currentStatus ?? '').toLowerCase()
    if (s === 'cancelled' || s === 'refunded') return [s]
    if (s === 'delivered') return ['delivered']
    if (s === 'outfordelivery' || s === 'out_for_delivery') return ['outfordelivery', 'delivered']
    if (s === 'shipped') return ['shipped', 'outfordelivery', 'delivered']
    if (s === 'processing') return ['processing', 'shipped', 'outfordelivery', 'delivered', 'cancelled']
    if (s === 'confirmed') return ['confirmed', 'processing', 'shipped', 'outfordelivery', 'delivered', 'cancelled']
    return [s || 'pending', 'confirmed', 'processing', 'shipped', 'cancelled']
  }

  // Inspect & Update Order
  const handleOpenInspectOrder = (order: Order) => {
    setInspectOrder(order)
    setOrderStatusUpdate((order.status ?? 'pending').toString().toLowerCase())
    setOrderCourierUpdate(order.courierName || 'NEXUS White-Glove')
    setOrderTrackingUpdate(order.trackingNumber ?? '')
    setOrderCancelReason(order.cancellationReason ?? '')
  }

  const applyOrderStatusUpdate = async (
    orderId: string,
    targetStatus: string,
    opts?: { courierName?: string; trackingNumber?: string; reason?: string },
  ) => {
    setIsUpdatingOrder(true)
    try {
      const res = await api.patch<any>(`/api/admin/orders/${orderId}/status`, {
        status: targetStatus,
        courierName: opts?.courierName?.trim() || null,
        trackingNumber: opts?.trackingNumber?.trim() || null,
        reason: opts?.reason?.trim() || null,
      })
      toast.success(res.data?.message ?? `Order moved to ${targetStatus}!`)
      const nextStatus = (res.data?.status ?? targetStatus) as any
      const nextPaymentStatus = (res.data?.paymentStatus ?? inspectOrder?.paymentStatus) as any
      const nextReturnStatus = (res.data?.returnStatus ?? inspectOrder?.returnStatus) as any
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: nextStatus,
                paymentStatus: nextPaymentStatus,
                returnStatus: nextReturnStatus,
                courierName: res.data?.courierName ?? o.courierName,
                trackingNumber: res.data?.trackingNumber ?? o.trackingNumber,
                confirmedAt: res.data?.confirmedAt ?? o.confirmedAt,
                processingAt: res.data?.processingAt ?? o.processingAt,
                shippedAt: res.data?.shippedAt ?? o.shippedAt,
                outForDeliveryAt: res.data?.outForDeliveryAt ?? o.outForDeliveryAt,
                deliveredAt: res.data?.deliveredAt ?? o.deliveredAt,
                cancelledAt: res.data?.cancelledAt ?? o.cancelledAt,
              }
            : o,
        ),
      )
      setInspectOrder((prev) =>
        prev && prev.id === orderId
          ? {
              ...prev,
              status: nextStatus,
              paymentStatus: nextPaymentStatus,
              returnStatus: nextReturnStatus,
              courierName: res.data?.courierName ?? prev.courierName,
              trackingNumber: res.data?.trackingNumber ?? prev.trackingNumber,
              confirmedAt: res.data?.confirmedAt ?? prev.confirmedAt,
              processingAt: res.data?.processingAt ?? prev.processingAt,
              shippedAt: res.data?.shippedAt ?? prev.shippedAt,
              outForDeliveryAt: res.data?.outForDeliveryAt ?? prev.outForDeliveryAt,
              deliveredAt: res.data?.deliveredAt ?? prev.deliveredAt,
              cancelledAt: res.data?.cancelledAt ?? prev.cancelledAt,
            }
          : prev,
      )
      fetchAllData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to update order status')
    } finally {
      setIsUpdatingOrder(false)
    }
  }

  const handleSaveOrderStatus = async () => {
    if (!inspectOrder) return
    await applyOrderStatusUpdate(inspectOrder.id, orderStatusUpdate, {
      courierName: orderCourierUpdate,
      trackingNumber: orderTrackingUpdate,
      reason: orderCancelReason,
    })
  }

  const getReturnDraft = (ord: Order) => {
    const existing = returnDrafts[ord.id]
    if (existing) return existing
    const isCod =
      ord.paymentMethod === (1 as any) ||
      String(ord.paymentMethod ?? '').toLowerCase().includes('cash')
    return {
      pickupTracking: ord.returnPickupTracking ?? '',
      adminNotes: ord.returnAdminNotes ?? '',
      refundAmount: String(ord.refundAmount ?? ord.totalAmount ?? ord.total ?? 0),
      refundMethod: ord.refundMethod ?? (isCod ? 'UpiTransfer' : 'RazorpayOriginalSource'),
      refundReference: ord.refundReference ?? '',
      restockInventory: !ord.returnInventoryRestocked,
    }
  }

  const handleReturnStepAction = async (
    ord: Order,
    action: 'Approve' | 'Reject' | 'MarkPickedUp' | 'MarkReceived',
  ) => {
    const draft = getReturnDraft(ord)
    if (action === 'Reject' && !draft.adminNotes.trim()) {
      toast.error('Please write a clear rejection reason in Admin Notes first.')
      return
    }
    setProcessingReturnId(ord.id)
    try {
      const res = await api.patch<{ message?: string }>(`/api/admin/returns/${ord.id}/step`, {
        action,
        adminNotes: draft.adminNotes.trim() || null,
        pickupTracking: draft.pickupTracking.trim() || null,
        restockInventory: draft.restockInventory,
      })
      toast.success(res.data?.message ?? `Return updated (${action})`)
      await fetchAllData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to update return step')
    } finally {
      setProcessingReturnId(null)
    }
  }

  const handleProcessReturnRefund = async (ord: Order) => {
    const draft = getReturnDraft(ord)
    const parsedAmt = parseFloat(draft.refundAmount)
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      toast.error('Enter a valid refund amount.')
      return
    }
    setProcessingReturnId(ord.id)
    try {
      const res = await api.post<{ message?: string }>(`/api/admin/returns/${ord.id}/refund`, {
        refundAmount: parsedAmt,
        refundMethod: draft.refundMethod,
        refundReference: draft.refundReference.trim() || null,
        restockInventory: draft.restockInventory,
        adminNotes: draft.adminNotes.trim() || null,
      })
      toast.success(res.data?.message ?? 'Refund payment completed cleanly!')
      await fetchAllData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to process refund')
    } finally {
      setProcessingReturnId(null)
    }
  }

  // Close Tax Invoice or Inspect Order cleanly on Escape key
  React.useEffect(() => {
    if (!showInvoiceModal && !inspectOrder) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showInvoiceModal) setShowInvoiceModal(false)
        else if (inspectOrder) setInspectOrder(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showInvoiceModal, inspectOrder])

  const buildTaxInvoiceHtml = (ord: Order) => {
    const esc = (v?: string | number | null) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const total = ord.totalAmount ?? ord.total ?? 0
    const taxable = total / 1.18
    const cgst = (total * 0.09) / 1.18
    const sgst = (total * 0.09) / 1.18
    const itemRows = (ord.items ?? [])
      .map((item, idx) => {
        const netRate = item.unitPrice / 1.18
        const gstLine = (item.unitPrice - netRate) * item.quantity
        const slug = item.product?.slug || (item as any).productSlug || ''
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${esc(item.productName)}</strong>
              ${slug ? `<div class="sku">SKU: ${esc(slug)}</div>` : ''}
            </td>
            <td class="mono">6205 / 9102</td>
            <td class="center">${item.quantity}</td>
            <td class="right mono">${esc(formatCurrency(netRate))}</td>
            <td class="right mono">${esc(formatCurrency(gstLine))}</td>
            <td class="right mono bold">${esc(formatCurrency(item.totalPrice))}</td>
          </tr>`
      })
      .join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice INV-${esc(ord.orderNumber)} - NEXUS Luxury Atelier</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111111; background: #ffffff; margin: 0; padding: 24px; line-height: 1.5; }
    .invoice-box { max-width: 820px; margin: 0 auto; border: 1px solid #d6d3d1; border-radius: 12px; padding: 28px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #C5A059; padding-bottom: 18px; margin-bottom: 18px; }
    .brand { font-family: Georgia, serif; font-size: 24px; font-weight: 700; letter-spacing: 1px; margin: 0; color: #111111; }
    .tagline { font-size: 12px; color: #57534e; margin: 4px 0 8px; }
    .meta { font-size: 12px; color: #44403c; }
    .mono { font-family: Consolas, monospace; }
    .badge { display: inline-block; background: #faf5ea; border: 1px solid #C5A059; color: #7a5d24; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
    .card { border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; font-size: 12px; background: #faf8f5; }
    .card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9a7b38; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
    th { background: #f5f2eb; text-align: left; padding: 9px 10px; border-bottom: 1px solid #d6d3d1; font-size: 10px; text-transform: uppercase; color: #57534e; }
    td { padding: 10px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
    .sku { font-size: 10px; color: #78716c; font-family: Consolas, monospace; margin-top: 2px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-box { width: 300px; font-size: 12px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; color: #57534e; }
    .totals-row.final { border-top: 2px solid #111111; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 700; color: #111111; }
    .footer { border-top: 1px solid #e7e5e4; margin-top: 22px; padding-top: 12px; font-size: 11px; color: #57534e; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div>
        <h1 class="brand">NEXUS LUXURY ATELIER</h1>
        <p class="tagline">High-End Couture, Horology &amp; Fine Living</p>
        <div class="meta">
          <div>2 Maruti Chock, Rajkot, Gujarat, 360005, India</div>
          <div>Email: nexustech1003@gmail.com | Helpline: +91 12345 67890</div>
          <div class="mono bold">GSTIN: 24AAACN1234F1Z5 &bull; CIN: U74999GJ2026PTC109842</div>
        </div>
      </div>
      <div class="right">
        <div class="badge">Tax Invoice / Bill of Supply</div>
        <div class="meta mono" style="margin-top:8px;">
          <div>Invoice #: <strong>INV-${esc(ord.orderNumber)}</strong></div>
          <div>Order Date: ${esc(formatDate(ord.createdAt))}</div>
          <div>Place of Supply: Gujarat (State Code: 24)</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Billed &amp; Shipped To</div>
        <div style="font-weight:700;font-size:13px;">${esc(ord.shippingName)}</div>
        <div style="margin-top:4px;color:#44403c;">
          ${esc(ord.shippingAddressLine1)}${ord.shippingAddressLine2 ? `, ${esc(ord.shippingAddressLine2)}` : ''}<br/>
          ${esc(ord.shippingCity)}, ${esc(ord.shippingState)} - ${esc(ord.shippingPinCode)}
        </div>
        <div class="mono" style="margin-top:6px;">Mobile: ${esc(ord.shippingPhone)}</div>
      </div>
      <div class="card">
        <div class="card-title">Payment &amp; Logistics Info</div>
        <div class="totals-row"><span>Payment Mode:</span><strong>${esc(ord.paymentMethod)}</strong></div>
        <div class="totals-row"><span>Payment Status:</span><strong>${esc(ord.paymentStatus)}</strong></div>
        <div class="totals-row"><span>Courier Tracking:</span><span class="mono">${esc(ord.trackingNumber || 'Pending Courier Dispatch')}</span></div>
        <div class="totals-row"><span>Order Number:</span><span class="mono">${esc(ord.orderNumber)}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th>HSN Code</th>
          <th class="center">Qty</th>
          <th class="right">Unit Rate</th>
          <th class="right">GST (18%)</th>
          <th class="right">Total Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>Taxable Subtotal:</span><span class="mono">${esc(formatCurrency(taxable))}</span></div>
        <div class="totals-row"><span>CGST (9.0%):</span><span class="mono">${esc(formatCurrency(cgst))}</span></div>
        <div class="totals-row"><span>SGST (9.0%):</span><span class="mono">${esc(formatCurrency(sgst))}</span></div>
        <div class="totals-row"><span>Doorstep Delivery Charges:</span><strong>${(ord.shippingCost ?? 0) === 0 ? 'FREE' : esc(formatCurrency(ord.shippingCost ?? 0))}</strong></div>
        <div class="totals-row"><span>Platform Fee:</span><span class="mono">${esc(formatCurrency(ord.platformFee ?? 0))}</span></div>
        <div class="totals-row final"><span>Total Invoice Value:</span><span>${esc(formatCurrency(total))}</span></div>
      </div>
    </div>

    <div class="footer">
      <span>Computer generated GST tax invoice issued by NEXUS E-Commerce Retail Pvt. Ltd. No physical signature required.</span>
      <strong>For NEXUS LUXURY ATELIER</strong>
    </div>
  </div>
</body>
</html>`
  }

  const handlePrintInvoice = (ord: Order) => {
    try {
      const html = buildTaxInvoiceHtml(ord)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.setAttribute('aria-hidden', 'true')
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc || !iframe.contentWindow) {
        iframe.remove()
        toast.error('Unable to open print preview in this browser.')
        return
      }

      doc.open()
      doc.write(html)
      doc.close()

      const cleanup = () => {
        setTimeout(() => {
          iframe.remove()
        }, 400)
      }

      iframe.contentWindow.onafterprint = cleanup
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } finally {
          cleanup()
        }
      }, 150)
    } catch {
      toast.error('Print preview failed. Please use Download Invoice instead.')
    }
  }

  const handleDownloadInvoice = (ord: Order) => {
    try {
      const pdfBlob = generateTaxInvoicePdfBlob(ord)
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Tax-Invoice-INV-${ord.orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`Downloaded Tax-Invoice-INV-${ord.orderNumber}.pdf`)
    } catch {
      toast.error('Failed to download invoice PDF.')
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
        parentId: newCat.parentId ? newCat.parentId : null,
        sortOrder: categories.length + 1,
      })
      toast.success('Category created!')
      invalidateFrontendCatalogCache()
      setShowAddCategoryModal(false)
      setNewCat({ name: '', description: '', imageUrl: '', parentId: '' })
      fetchAllData()
    } catch {
      toast.error('Failed to create category')
    } finally {
      setIsSubmittingCat(false)
    }
  }

  // Update Category
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !editingCategory.name.trim()) return
    setIsSubmittingCat(true)
    try {
      await api.put(`/api/categories/${editingCategory.id}`, {
        name: editingCategory.name.trim(),
        description: editingCategory.description.trim() || null,
        imageUrl: editingCategory.imageUrl.trim() || null,
        parentId: editingCategory.parentId ? editingCategory.parentId : null,
        sortOrder: editingCategory.sortOrder ?? 1,
        isActive: true,
      })
      toast.success('Category updated successfully!')
      invalidateFrontendCatalogCache()
      setShowEditCategoryModal(false)
      if (selectedCategoryDetail && selectedCategoryDetail.id === editingCategory.id) {
        setSelectedCategoryDetail((prev) =>
          prev
            ? {
                ...prev,
                name: editingCategory.name.trim(),
                description: editingCategory.description.trim() || undefined,
                imageUrl: editingCategory.imageUrl.trim() || undefined,
                parentId: editingCategory.parentId || undefined,
              }
            : null
        )
      }
      setEditingCategory(null)
      fetchAllData()
    } catch {
      toast.error('Failed to update category')
    } finally {
      setIsSubmittingCat(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate / delete this collection category?')) return
    try {
      await api.delete(`/api/categories/${id}`)
      invalidateFrontendCatalogCache()
      setCategories(categories.filter((c) => c.id !== id))
      if (selectedCategoryDetail?.id === id) {
        setSelectedCategoryDetail(null)
      }
      toast.success('Category deleted')
      fetchAllData()
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

  const handleToggleCoupon = async (coupon: CouponDto) => {
    try {
      const isPct =
        Number(coupon.discountType) === 0 ||
        String(coupon.discountType).toLowerCase() === 'percentage'
      await api.put(`/api/coupons/${coupon.id}`, {
        code: coupon.code,
        description: coupon.description ?? null,
        discountType: isPct ? 0 : 1,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue ?? null,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        usageLimit: coupon.usageLimit ?? null,
        isActive: !coupon.isActive,
        expiresAt: coupon.expiresAt ?? null,
      })
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
      )
      toast.success(`Coupon ${coupon.code} is now ${!coupon.isActive ? 'Active' : 'Paused'}`)
    } catch {
      toast.error('Failed to update coupon')
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

  // Flattened categories list (Roots + Subcategories)
  const flatCategories = React.useMemo(() => {
    const list: (Category & { parentName?: string; isChild: boolean; fullHierarchy: string })[] = []
    ;(categories ?? []).forEach((root) => {
      list.push({
        ...root,
        isChild: false,
        fullHierarchy: root.name ?? 'Unnamed Category',
      })
      if (root.children && root.children.length > 0) {
        root.children.forEach((child) => {
          list.push({
            ...child,
            parentName: root.name ?? '',
            isChild: true,
            fullHierarchy: `${root.name ?? ''} › ${child.name ?? ''}`,
          })
        })
      }
    })
    return list
  }, [categories])

  // Subcategories dynamically available based on selected Department
  const availableSubcategories = React.useMemo(() => {
    if (prodDeptFilter === 'all') {
      const subs: { id: string; name: string; slug: string; parentName: string }[] = []
      ;(categories ?? []).forEach((root) => {
        if (root.children && root.children.length > 0) {
          root.children.forEach((sub) => {
            subs.push({ id: sub.id, name: sub.name, slug: sub.slug, parentName: root.name ?? '' })
          })
        }
      })
      return subs
    }
    const root = (categories ?? []).find(
      (c) =>
        c.id === prodDeptFilter ||
        safeStr(c.slug) === safeStr(prodDeptFilter) ||
        safeStr(c.name) === safeStr(prodDeptFilter)
    )
    if (!root || !root.children) return []
    return root.children.map((sub) => ({ id: sub.id, name: sub.name, slug: sub.slug, parentName: root.name ?? '' }))
  }, [categories, prodDeptFilter])

  // Helper to count products in a department
  const getDeptProductCount = React.useCallback(
    (dept: Category) => {
      const childIds = new Set((dept.children ?? []).map((ch) => ch.id))
      const childSlugs = new Set((dept.children ?? []).map((ch) => safeStr(ch.slug)))
      return (products ?? []).filter((p) => {
        if (p.categoryId === dept.id || p.categorySlug === dept.slug) return true
        if (p.categoryName && safeStr(p.categoryName) === safeStr(dept.name)) return true
        if (p.categoryId && childIds.has(p.categoryId)) return true
        if (p.categorySlug && childSlugs.has(safeStr(p.categorySlug))) return true
        if (p.parentCategoryId === dept.id || p.parentCategorySlug === dept.slug) return true
        if (p.parentCategoryName && safeStr(p.parentCategoryName) === safeStr(dept.name)) return true
        return false
      }).length
    },
    [products]
  )

  // Filtered products with hierarchical category & subcategory awareness + multi-field search
  const filteredProducts = React.useMemo(() => {
    return (products ?? []).filter((p) => {
      // 1. Search Query
      if (prodSearch.trim()) {
        const term = safeStr(prodSearch)
        const matchName = safeStr(p.name).includes(term)
        const matchSlug = safeStr(p.slug).includes(term)
        const matchSku = safeStr(p.sku).includes(term)
        const matchCat = safeStr(p.categoryName).includes(term)
        const matchParentCat = safeStr(p.parentCategoryName).includes(term)
        const matchTags = typeof p.tags === 'string' ? safeStr(p.tags).includes(term) : false
        if (!matchName && !matchSlug && !matchSku && !matchCat && !matchParentCat && !matchTags) {
          return false
        }
      }

      // 2. Department Filter
      if (prodDeptFilter !== 'all') {
        const targetRoot = (categories ?? []).find(
          (c) =>
            c.id === prodDeptFilter ||
            safeStr(c.slug) === safeStr(prodDeptFilter) ||
            safeStr(c.name) === safeStr(prodDeptFilter)
        )
        if (targetRoot) {
          const childIds = new Set((targetRoot.children ?? []).map((ch) => ch.id))
          const childSlugs = new Set((targetRoot.children ?? []).map((ch) => safeStr(ch.slug)))
          const isDirect =
            p.categoryId === targetRoot.id ||
            p.categorySlug === targetRoot.slug ||
            (p.categoryName && safeStr(p.categoryName) === safeStr(targetRoot.name))
          const isChild =
            (p.categoryId && childIds.has(p.categoryId)) ||
            (p.categorySlug && childSlugs.has(safeStr(p.categorySlug))) ||
            p.parentCategoryId === targetRoot.id ||
            p.parentCategorySlug === targetRoot.slug ||
            (p.parentCategoryName && safeStr(p.parentCategoryName) === safeStr(targetRoot.name))

          if (!isDirect && !isChild) return false
        }
      }

      // 3. Subcategory Filter
      if (prodSubFilter !== 'all') {
        const isMatch =
          p.categoryId === prodSubFilter ||
          p.categorySlug === prodSubFilter ||
          (p.categoryName && safeStr(p.categoryName) === safeStr(prodSubFilter))
        if (!isMatch) return false
      }

      return true
    })
  }, [products, prodSearch, prodDeptFilter, prodSubFilter, categories])

  const filteredOrders = React.useMemo(() => {
    return (orders ?? []).filter((o) => {
      const s = safeStr(o.status)
      const rs = safeStr(o.returnStatus)
      const ps = safeStr(o.paymentStatus)
      const matchesStatus =
        orderStatusFilter === 'all'
          ? true
          : orderStatusFilter === 'returns'
          ? (rs && rs !== 'none') || ps.includes('refund') || s === 'refunded'
          : orderStatusFilter === 'pending'
          ? s === 'pending' || s === 'paymentpending'
          : s === safeStr(orderStatusFilter)
      const matchesSearch =
        !orderSearch ||
        safeStr(o.orderNumber).includes(safeStr(orderSearch)) ||
        (o.shippingName && safeStr(o.shippingName).includes(safeStr(orderSearch))) ||
        (o.customerEmail && safeStr(o.customerEmail).includes(safeStr(orderSearch))) ||
        (o.shippingPhone && o.shippingPhone.includes(orderSearch))
      return matchesStatus && matchesSearch
    })
  }, [orders, orderStatusFilter, orderSearch])

  const filteredReturns = React.useMemo(() => {
    const q = safeStr(returnSearch)
    return (returnsOrders ?? []).filter((o) => {
      const rs = safeStr(o.returnStatus)
      const ps = safeStr(o.paymentStatus)
      if (returnFilter === 'requested' && rs !== 'requested') return false
      if (returnFilter === 'pickup' && rs !== 'approved' && rs !== 'pickedup') return false
      if (returnFilter === 'payout' && rs !== 'received' && rs !== 'refundinitiated' && ps !== 'refundinitiated') return false
      if (returnFilter === 'completed' && rs !== 'refundcompleted' && ps !== 'refunded' && ps !== 'partiallyrefunded') return false
      if (returnFilter === 'rejected' && rs !== 'rejected') return false
      if (!q) return true
      return (
        safeStr(o.orderNumber).includes(q) ||
        safeStr(o.shippingName).includes(q) ||
        safeStr(o.customerEmail).includes(q) ||
        safeStr(o.returnReason).includes(q) ||
        safeStr(o.refundReference).includes(q)
      )
    })
  }, [returnsOrders, returnFilter, returnSearch])

  const filteredCustomers = React.useMemo(() => {
    return (customers ?? []).filter((c) => {
      if (!customerSearch) return true
      const term = safeStr(customerSearch)
      return (
        safeStr(c.firstName).includes(term) ||
        safeStr(c.lastName).includes(term) ||
        safeStr(c.email).includes(term) ||
        (c.phoneNumber && c.phoneNumber.includes(term))
      )
    })
  }, [customers, customerSearch])

  if (!mounted || (isAuthenticated && roleCheckLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-beige-muted">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-5 h-5 animate-spin text-gold" />
          <span className="font-mono text-sm">
            {isAuthenticated ? 'Verifying Administrator Session...' : 'Loading Nexus Control Center...'}
          </span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background text-beige flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <Shield className="w-12 h-12 text-gold mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-beige">
            {isAuthenticated ? 'Access Denied — Admin Only' : 'NEXUS Control Center'}
          </h1>
          <p className="text-sm text-beige-muted">
            {isAuthenticated
              ? 'Your current session does not hold verified Administrator privileges on the server.'
              : 'You must be signed in with an administrative account to access the control panel.'}
          </p>
          <div className="bg-surface-2 p-3.5 rounded-xl text-xs text-beige-muted text-left border border-border">
            <span className="text-gold font-mono font-semibold">Protected Access (DB Role Enforced):</span>
            <br />
            {isAuthenticated
              ? 'Client-side role claims cannot elevate permissions. Sign in with an authorized Administrator account to continue.'
              : 'Sign in with an authorized administrator account to manage inventory, orders, and security alerts.'}
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  logout()
                  openAuthModal('login', '/admin')
                }}
              >
                Switch to Admin Account
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => openAuthModal('login', '/admin')}
              >
                Sign In as Admin
              </Button>
            )}
            <Button variant="outline" size="md" className="w-full" asChild>
              <Link href="/">Return to Storefront</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const pendingReturnsBadge =
    returnsSummary.requestedCount + returnsSummary.inPickupCount + returnsSummary.pendingPayoutCount
  const openTicketsBadge = supportTickets.filter((t) => t.status === 'Open' || t.status === 'InReview').length
  const actionableOrdersBadge = orders.filter((o) => {
    const s = safeStr(o.status)
    return s === 'pending' || s === 'paymentpending' || s === 'confirmed' || s === 'processing'
  }).length

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-beige flex">
      {/* ─── SIDEBAR NAVIGATION (LUXURY OBSIDIAN COMMAND SHELL) ─────────────── */}
      <aside className="w-64 border-r border-[#26231F] bg-[#111111] text-[#FAF8F5] flex-col justify-between hidden md:flex sticky top-0 h-screen z-40">
        <div className="overflow-y-auto">
          {/* Brand header */}
          <div className="p-6 border-b border-[#26231F] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-[#C5A059]" />
              <span className="font-serif text-lg font-bold gold-text-gradient tracking-wider">
                NEXUS
              </span>
            </Link>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#C5A059]/15 text-[#D4AF37] border border-[#C5A059]/30">
              EXECUTIVE
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1 text-xs font-medium">
            {[
              { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
              {
                id: 'orders',
                label: 'Orders & Pipeline',
                icon: ShoppingCart,
                count: actionableOrdersBadge || orders.length,
                highlight: actionableOrdersBadge > 0,
              },
              {
                id: 'returns',
                label: 'Returns & Refunds',
                icon: RotateCcw,
                count: pendingReturnsBadge,
                highlight: pendingReturnsBadge > 0,
              },
              { id: 'products', label: 'Catalog & Inventory', icon: Package, count: products.length },
              { id: 'categories', label: 'Collections / Depts', icon: FolderTree, count: categories.length },
              {
                id: 'support',
                label: 'Support Desk',
                icon: MessageSquare,
                count: openTicketsBadge,
                highlight: openTicketsBadge > 0,
              },
              { id: 'coupons', label: 'Promotions & Coupons', icon: Ticket, count: coupons.length },
              { id: 'customers', label: 'Clientele CRM', icon: Users, count: customers.length },
              {
                id: 'security',
                label: 'Security & Alerts',
                icon: ShieldAlert,
                count: unreadAlerts,
                isThreat: unreadAlerts > 0,
              },
              { id: 'settings', label: 'Store Settings', icon: Settings },
            ].map(({ id, label, icon: Icon, count, isThreat, highlight }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#C5A059] text-[#111111] font-bold shadow-md'
                      : isThreat
                      ? 'text-rose-200 bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900/60'
                      : highlight
                      ? 'text-[#FAF8F5] bg-[#1D1B18] border border-[#C5A059]/25 hover:border-[#C5A059]/60'
                      : 'text-[#A8A29E] hover:text-[#FAF8F5] hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isThreat && !isActive ? 'text-rose-400 animate-pulse' : isActive ? 'text-[#111111]' : 'text-[#C5A059]'}`} />
                    <span>{label}</span>
                  </div>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#111111]/15 text-[#111111] font-bold'
                          : isThreat
                          ? 'bg-rose-600 text-white font-bold'
                          : highlight
                          ? 'bg-[#C5A059] text-[#111111] font-bold'
                          : 'bg-white/10 text-[#D6D3D1]'
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
        <div className="p-4 border-t border-[#26231F] space-y-2.5 bg-[#0A0A0A]">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full text-xs border-[#C5A059]/40 text-[#FAF8F5] hover:bg-[#C5A059] hover:text-[#111111]"
          >
            <Link href="/" target="_blank" className="flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              View Storefront
            </Link>
          </Button>
          <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-[#A8A29E]">
            <span className="truncate max-w-[130px]">{user?.email}</span>
            <button
              onClick={() => {
                logout()
                window.location.href = '/'
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar (Desktop & Mobile) */}
        <header className="border-b border-[#E7E5E4] bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 md:hidden">
              <Shield className="w-5 h-5 text-gold" />
              <span className="font-serif font-bold text-beige text-sm">NEXUS</span>
            </div>
            <div className="hidden md:flex items-center gap-2.5 text-xs text-beige-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-beige capitalize">
                {activeTab === 'overview'
                  ? 'Executive Overview'
                  : activeTab === 'orders'
                  ? 'Orders & Step Pipeline'
                  : activeTab === 'returns'
                  ? '7-Day Returns & Refund Settlement'
                  : activeTab}
              </span>
              <span className="text-border">•</span>
              <span className="font-mono text-[11px]">Atelier Fulfillment Desk</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {pendingReturnsBadge > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('returns')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{pendingReturnsBadge} Return Action</span>
              </button>
            )}

            {actionableOrdersBadge > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/10 border border-gold/30 text-beige hover:bg-gold/20 text-xs font-semibold transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-gold" />
                <span>{actionableOrdersBadge} Fulfillment Queue</span>
              </button>
            )}

            {/* Quick Threat Alert Bell */}
            <button
              onClick={() => setActiveTab('security')}
              className={`relative p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs ${
                unreadAlerts > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  : 'bg-surface-2 border-border text-beige-muted hover:text-beige hover:border-gold/40'
              }`}
              title="Security Threats & Suspicious Notifications"
            >
              <Bell className={`w-4 h-4 ${unreadAlerts > 0 ? 'text-rose-600' : 'text-gold'}`} />
              {unreadAlerts > 0 ? (
                <span className="font-bold text-rose-700 font-mono flex items-center gap-1">
                  <span>{unreadAlerts}</span>
                  <span className="hidden sm:inline">Alerts</span>
                </span>
              ) : (
                <span className="hidden sm:inline text-beige-muted font-mono text-[11px]">Secure</span>
              )}
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <Button variant="outline" size="sm" onClick={fetchAllData} className="text-xs px-2.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center gap-2 p-3 overflow-x-auto border-b border-border bg-white text-xs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: `Orders${actionableOrdersBadge ? ` (${actionableOrdersBadge})` : ''}` },
            { id: 'returns', label: `Returns${pendingReturnsBadge ? ` (${pendingReturnsBadge})` : ''}` },
            { id: 'products', label: 'Products' },
            { id: 'categories', label: 'Categories' },
            { id: 'support', label: `Support${openTicketsBadge ? ` (${openTicketsBadge})` : ''}` },
            { id: 'coupons', label: 'Coupons' },
            { id: 'customers', label: 'Clients' },
            { id: 'security', label: unreadAlerts > 0 ? `Alerts (${unreadAlerts})` : 'Security' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#111111] text-white font-semibold'
                  : tab.id === 'returns' && pendingReturnsBadge > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : tab.id === 'security' && unreadAlerts > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-beige-muted bg-surface-2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
          {portalError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800">
              <div className="flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{portalError}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={fetchAllData} className="text-xs">
                  Retry
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openAuthModal('login', '/admin')}
                  className="text-xs"
                >
                  Re-authenticate
                </Button>
              </div>
            </div>
          )}

          {/* ─── TAB 1: EXECUTIVE OVERVIEW ────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Top Executive Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111111] text-[#FAF8F5] rounded-2xl p-6 sm:p-7 border border-[#26231F] shadow-sm">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#C5A059] font-semibold">
                    NEXUS Executive Control Center
                  </span>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
                    Operations, Fulfillment &amp; Refund Ledger
                  </h1>
                  <p className="text-xs text-[#A8A29E] mt-1">
                    Monitor step-by-step order progress, 7-day return pickups, settled refunds, and live revenue health.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('orders')}
                    className="border-[#C5A059]/40 text-[#FAF8F5] hover:bg-[#C5A059] hover:text-[#111111] text-xs"
                  >
                    Manage Orders ({actionableOrdersBadge})
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('returns')}
                    className="bg-[#C5A059] hover:bg-[#D4AF37] text-[#111111] font-bold text-xs"
                  >
                    Returns &amp; Refunds ({pendingReturnsBadge})
                  </Button>
                </div>
              </div>

              {/* 4 KPI Hero Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-beige-muted">
                      Net Settled Revenue
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif text-3xl font-bold text-[#111111]">
                    {formatCurrency(stats?.netRevenue ?? stats?.totalRevenue ?? 0)}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                    <span className="text-emerald-700 font-semibold">
                      Gross: {formatCurrency(stats?.totalRevenue ?? 0)}
                    </span>
                    <span className="text-rose-700 font-medium">
                      Refunded: {formatCurrency(stats?.totalRefunded ?? returnsSummary.totalRefundedAmount ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-beige-muted">
                      Active Order Pipeline
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif text-3xl font-bold text-[#111111]">
                    {actionableOrdersBadge}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60 text-beige-muted">
                    <span>Pending: {stats?.pendingOrders ?? 0} • Conf: {stats?.confirmedOrders ?? 0}</span>
                    <button onClick={() => setActiveTab('orders')} className="text-gold font-bold hover:underline">
                      Open →
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-800">
                      Returns &amp; Payout Desk
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif text-3xl font-bold text-[#111111]">
                    {pendingReturnsBadge}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60">
                    <span className="text-amber-800 font-semibold">
                      Payout Due: {formatCurrency(stats?.pendingRefundsAmount ?? returnsSummary.pendingPayoutAmount ?? 0)}
                    </span>
                    <button onClick={() => setActiveTab('returns')} className="text-gold font-bold hover:underline">
                      Resolve →
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-beige-muted">
                      Catalog &amp; Client Base
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-[#111111]">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-serif text-3xl font-bold text-[#111111]">
                    {stats?.totalProducts ?? products.length}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/60 text-beige-muted">
                    <span>{stats?.lowStockProducts ?? 0} low stock SKUs</span>
                    <span>{stats?.totalCustomers ?? customers.length} clients</span>
                  </div>
                </div>
              </div>

              {/* Interactive Order Lifecycle Pipeline Strip */}
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#111111]">
                      Live Order Fulfillment Pipeline
                    </h2>
                    <p className="text-xs text-beige-muted">
                      Click any stage to filter and process orders step-by-step
                    </p>
                  </div>
                  <span className="text-xs font-mono text-beige-muted">
                    Total Lifetime Orders: <strong className="text-[#111111]">{stats?.totalOrders ?? orders.length}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { id: 'pending', label: '1. Pending', count: stats?.pendingOrders ?? 0, tone: 'bg-amber-50 border-amber-200 text-amber-800', target: 'orders' },
                    { id: 'confirmed', label: '2. Confirmed', count: stats?.confirmedOrders ?? 0, tone: 'bg-gold/10 border-gold/30 text-[#7A5D24]', target: 'orders' },
                    { id: 'processing', label: '3. Packing & QC', count: stats?.processingOrders ?? 0, tone: 'bg-purple-50 border-purple-200 text-purple-800', target: 'orders' },
                    { id: 'shipped', label: '4. Dispatched', count: stats?.shippedOrders ?? 0, tone: 'bg-sky-50 border-sky-200 text-sky-800', target: 'orders' },
                    { id: 'delivered', label: '5. Delivered', count: stats?.deliveredOrders ?? 0, tone: 'bg-emerald-50 border-emerald-200 text-emerald-800', target: 'orders' },
                    { id: 'returns', label: '6. Returns/Refund', count: pendingReturnsBadge, tone: 'bg-rose-50 border-rose-200 text-rose-800', target: 'returns' },
                  ].map((stage) => (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        if (stage.target === 'returns') {
                          setActiveTab('returns')
                        } else {
                          setOrderStatusFilter(stage.id)
                          setActiveTab('orders')
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${stage.tone}`}
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold block opacity-80">
                        {stage.label}
                      </span>
                      <p className="font-serif text-2xl font-bold mt-1">{stage.count}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 7-Day Revenue Trend + Operational Priority Queue */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#111111]">7-Day Order Revenue Velocity</h3>
                      <p className="text-xs text-beige-muted">
                        Today: <strong className="text-[#111111]">{formatCurrency(stats?.revenueToday ?? 0)}</strong> • MTD:{' '}
                        <strong className="text-gold">{formatCurrency(stats?.revenueThisMonth ?? 0)}</strong>
                      </p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-gold" />
                  </div>

                  {(() => {
                    const series = stats?.revenueSeries ?? []
                    const maxRev = Math.max(1, ...series.map((d) => d.revenue))
                    if (series.length === 0) {
                      return (
                        <div className="h-44 flex items-center justify-center text-xs text-beige-muted bg-surface-2/40 rounded-xl">
                          No recent order data in window.
                        </div>
                      )
                    }
                    return (
                      <div className="grid grid-cols-7 gap-2.5 items-end h-48 pt-4">
                        {series.map((point) => {
                          const heightPct = Math.max(8, Math.round((point.revenue / maxRev) * 100))
                          return (
                            <div key={point.dateLabel} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                              <span className="text-[10px] font-mono text-beige-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {formatCurrency(point.revenue)}
                              </span>
                              <div className="w-full max-w-[38px] bg-[#F5F2EB] rounded-t-lg h-32 flex items-end overflow-hidden border border-border/60">
                                <div
                                  className="w-full bg-gradient-to-t from-[#111111] to-[#C5A059] rounded-t-lg transition-all duration-500"
                                  style={{ height: `${heightPct}%` }}
                                  title={`${point.dateLabel}: ${formatCurrency(point.revenue)} (${point.orderCount} orders)`}
                                />
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] font-mono font-semibold text-beige block">
                                  {point.dateLabel}
                                </span>
                                <span className="text-[9px] text-beige-muted">{point.orderCount} ord</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Operational Priority Desk */}
                <div className="lg:col-span-5 bg-white border border-[#E7E5E4] rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#111111]">Immediate Action Queue</h3>

                  <div className="space-y-2.5">
                    {returnsSummary.requestedCount > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                        <div className="text-xs">
                          <p className="font-bold text-amber-900">
                            {returnsSummary.requestedCount} New 7-Day Return Request(s)
                          </p>
                          <p className="text-amber-700 text-[11px]">Approve doorstep pickup or review reason</p>
                        </div>
                        <Button size="sm" variant="primary" onClick={() => setActiveTab('returns')} className="text-xs shrink-0">
                          Review
                        </Button>
                      </div>
                    )}

                    {returnsSummary.pendingPayoutCount > 0 && (
                      <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between gap-3">
                        <div className="text-xs">
                          <p className="font-bold text-purple-900">
                            {returnsSummary.pendingPayoutCount} Return Refund(s) Ready ({formatCurrency(returnsSummary.pendingPayoutAmount)})
                          </p>
                          <p className="text-purple-700 text-[11px]">Settle refund payment &amp; restock items</p>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setReturnFilter('payout')
                            setActiveTab('returns')
                          }}
                          className="text-xs shrink-0"
                        >
                          Pay Refund
                        </Button>
                      </div>
                    )}

                    {actionableOrdersBadge > 0 && (
                      <div className="p-3.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between gap-3">
                        <div className="text-xs">
                          <p className="font-bold text-[#111111]">{actionableOrdersBadge} Orders Awaiting Dispatch Steps</p>
                          <p className="text-beige-muted text-[11px]">Confirm, pack, and assign courier tracking</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setActiveTab('orders')} className="text-xs shrink-0">
                          Advance
                        </Button>
                      </div>
                    )}

                    {openTicketsBadge > 0 && (
                      <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3">
                        <div className="text-xs">
                          <p className="font-bold text-sky-900">{openTicketsBadge} Open Concierge Support Tickets</p>
                          <p className="text-sky-700 text-[11px]">Customer queries awaiting reply</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setActiveTab('support')} className="text-xs shrink-0">
                          Reply
                        </Button>
                      </div>
                    )}

                    {returnsSummary.requestedCount === 0 &&
                      returnsSummary.pendingPayoutCount === 0 &&
                      actionableOrdersBadge === 0 &&
                      openTicketsBadge === 0 && (
                        <div className="p-6 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center text-xs text-emerald-800">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                          All fulfillment steps, return payouts, and support queues are caught up.
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Low Stock & Restock Action Panel */}
              {(() => {
                const lowStockItems = products.filter((p) => (p.stock ?? p.stockQuantity ?? 0) <= 5)
                if (lowStockItems.length === 0) return null
                return (
                  <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h3 className="font-serif text-lg font-bold text-beige">
                          Low Stock Alerts ({lowStockItems.length})
                        </h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="text-xs font-semibold text-gold hover:underline"
                      >
                        Open Inventory →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {lowStockItems.slice(0, 6).map((p) => {
                        const qty = p.stock ?? p.stockQuantity ?? 0
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2/60 border border-border"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-beige truncate">{p.name}</p>
                              <p className={`text-[11px] font-mono font-bold ${qty === 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                                {qty === 0 ? 'Out of stock' : `${qty} units remaining`}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditProduct(p)}
                              className="text-xs py-1 px-2.5 flex-shrink-0"
                            >
                              Restock
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Recent Orders Overview */}
              <div className="bg-white border border-[#E7E5E4] rounded-2xl p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-serif text-xl font-bold text-[#111111]">Recent Orders Feed</h3>
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
                        <th className="py-3 px-4">Pipeline Step</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orders.slice(0, 6).map((ord) => {
                        const stepMeta = getOrderStepInfo(ord.status)
                        return (
                          <tr key={ord.id} className="hover:bg-surface-2/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-gold font-bold">{ord.orderNumber}</td>
                            <td className="py-3.5 px-4 text-beige font-medium">{ord.shippingName ?? 'Client'}</td>
                            <td className="py-3.5 px-4 text-xs font-mono text-beige-muted">{stepMeta.label}</td>
                            <td className="py-3.5 px-4 font-semibold">{formatCurrency(ord.totalAmount ?? ord.total ?? 0)}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge status={ord.status} size="sm" />
                                {ord.returnStatus && String(ord.returnStatus).toLowerCase() !== 'none' && (
                                  <StatusBadge status={ord.returnStatus} size="sm" />
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-beige-muted text-xs">{formatDate(ord.createdAt)}</td>
                            <td className="py-3.5 px-4 text-right">
                              <Button variant="outline" size="sm" onClick={() => handleOpenInspectOrder(ord)} className="text-xs">
                                Steps
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

          {/* ─── TAB 2: PRODUCTS ──────────────────────────────────────────────── */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Catalog Inventory</h1>
                  <p className="text-sm text-beige-muted mt-1">Manage luxury timepieces, apparel, jewelry, and footwear</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setShowBulkAddModal(true)}
                    className="flex items-center gap-2 border-gold/40 text-gold hover:bg-gold/10"
                  >
                    <ListPlus className="w-4 h-4" />
                    Add in Bulk
                  </Button>
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
              </div>

              {/* Search & Cascading Category/Subcategory Filter Toolbar */}
              <div className="bg-surface border border-border rounded-2xl p-4 shadow-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Search Input */}
                  <div className="md:col-span-6 relative">
                    <Search className="w-4 h-4 text-beige-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by title, SKU, tags, or slug..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-9 py-2.5 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                    />
                    {prodSearch && (
                      <button
                        onClick={() => setProdSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-beige-muted hover:text-beige"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Department / Root Category Filter */}
                  <div className="md:col-span-3">
                    <select
                      value={prodDeptFilter}
                      onChange={(e) => {
                        setProdDeptFilter(e.target.value)
                        setProdSubFilter('all')
                      }}
                      className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                    >
                      <option value="all">All Departments ({products.length})</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name} ({getDeptProductCount(c)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory Filter */}
                  <div className="md:col-span-3">
                    <select
                      value={prodSubFilter}
                      onChange={(e) => setProdSubFilter(e.target.value)}
                      className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                    >
                      <option value="all">
                        {prodDeptFilter === 'all'
                          ? 'All Subcategories'
                          : `All ${categories.find((c) => c.slug === prodDeptFilter)?.name ?? ''} Subcategories`}
                      </option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.slug}>
                          {prodDeptFilter === 'all' ? `${sub.parentName} › ${sub.name}` : sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Filter Pills Bar */}
                {(prodSearch || prodDeptFilter !== 'all' || prodSubFilter !== 'all') && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-beige-muted font-mono uppercase tracking-wider flex items-center gap-1">
                        <Filter className="w-3 h-3 text-gold" /> Active Filters:
                      </span>

                      {prodDeptFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-medium">
                          <span>
                            Department: {categories.find((c) => c.slug === prodDeptFilter)?.name ?? prodDeptFilter}
                          </span>
                          <button
                            onClick={() => {
                              setProdDeptFilter('all')
                              setProdSubFilter('all')
                            }}
                            className="hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {prodSubFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-beige text-xs font-medium">
                          <span>
                            Subcategory:{' '}
                            {availableSubcategories.find((s) => s.slug === prodSubFilter)?.name ?? prodSubFilter}
                          </span>
                          <button onClick={() => setProdSubFilter('all')} className="hover:text-gold">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {prodSearch && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-beige text-xs font-medium">
                          <span>Query: &ldquo;{prodSearch}&rdquo;</span>
                          <button onClick={() => setProdSearch('')} className="hover:text-gold">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      <button
                        onClick={() => {
                          setProdSearch('')
                          setProdDeptFilter('all')
                          setProdSubFilter('all')
                        }}
                        className="text-xs text-gold hover:underline flex items-center gap-1 ml-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear All</span>
                      </button>
                    </div>

                    <div className="text-xs text-beige-muted font-mono">
                      Showing <strong className="text-gold">{filteredProducts.length}</strong> of{' '}
                      <strong>{products.length}</strong> products
                    </div>
                  </div>
                )}
              </div>

              {/* Products Table */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/40">
                      <tr>
                        <th className="py-3.5 px-4">Item</th>
                        <th className="py-3.5 px-4">Department & Collection</th>
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
                                  <div className="text-xs text-beige-muted font-mono flex items-center gap-2">
                                    <span>{p.slug}</span>
                                    {p.sku && (
                                      <span className="text-[10px] bg-surface-2 px-1.5 py-0.5 rounded border border-border text-gold">
                                        SKU: {p.sku}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                {p.parentCategoryName && (
                                  <div className="text-[10px] text-beige-muted uppercase tracking-wider font-mono">
                                    {p.parentCategoryName}
                                  </div>
                                )}
                                <div className="text-gold text-xs font-semibold uppercase flex items-center gap-1">
                                  <span>{p.categoryName ?? 'Collection'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-beige">
                              <div>{formatCurrency(p.price)}</div>
                              {p.compareAtPrice && p.compareAtPrice > p.price && (
                                <div className="text-xs text-beige-muted line-through font-normal">
                                  {formatCurrency(p.compareAtPrice)}
                                </div>
                              )}
                            </td>
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
                              <StatusBadge status={p.isActive !== false ? 'active' : 'inactive'} size="sm" />
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

                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-beige-muted">
                            <Package className="w-10 h-10 mx-auto mb-3 opacity-30 text-gold" />
                            <p className="text-sm font-semibold text-beige">No products found</p>
                            <p className="text-xs text-beige-muted mt-1">
                              Try adjusting your search query, department, or subcategory filter.
                            </p>
                            <button
                              onClick={() => {
                                setProdSearch('')
                                setProdDeptFilter('all')
                                setProdSubFilter('all')
                              }}
                              className="mt-4 px-4 py-1.5 bg-surface-2 border border-gold/40 text-gold rounded-xl text-xs font-semibold hover:bg-gold/10 inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Filters</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: CATEGORIES / COLLECTIONS ──────────────────────────────── */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Collections & Departments</h1>
                  <p className="text-sm text-beige-muted mt-1">
                    Manage catalog taxonomy, luxury root departments, subcategories, and item assignments
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setNewCat({ name: '', description: '', imageUrl: '', parentId: '' })
                      setShowAddCategoryModal(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Department / Category
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-beige-muted uppercase tracking-wider font-mono">Root Departments</p>
                    <p className="text-2xl font-bold font-serif text-beige mt-1">{categories.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                    <FolderTree className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-beige-muted uppercase tracking-wider font-mono">Total Subcategories</p>
                    <p className="text-2xl font-bold font-serif text-gold mt-1">
                      {categories.reduce((acc, c) => acc + (c.children?.length ?? 0), 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-beige">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-beige-muted uppercase tracking-wider font-mono">Catalog Products</p>
                    <p className="text-2xl font-bold font-serif text-success mt-1">{products.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center text-success">
                    <Package className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Toolbar: Search & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border p-3.5 rounded-2xl shadow-lg">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-beige-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search collections or subcategories by name or slug..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-9 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                  />
                  {categorySearch && (
                    <button
                      onClick={() => setCategorySearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-beige-muted hover:text-beige"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-surface-2 p-1 rounded-xl border border-border">
                  <button
                    onClick={() => setCategoryViewMode('hierarchy')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      categoryViewMode === 'hierarchy'
                        ? 'bg-gold text-background shadow font-bold'
                        : 'text-beige-muted hover:text-beige'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>Hierarchy Tree</span>
                  </button>
                  <button
                    onClick={() => setCategoryViewMode('flat')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      categoryViewMode === 'flat'
                        ? 'bg-gold text-background shadow font-bold'
                        : 'text-beige-muted hover:text-beige'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>All Cards</span>
                  </button>
                </div>
              </div>

              {/* Hierarchy View */}
              {categoryViewMode === 'hierarchy' && (
                <div className="space-y-6">
                  {(categories ?? [])
                    .filter((root) => {
                      if (!categorySearch.trim()) return true
                      const term = safeStr(categorySearch)
                      const matchRoot =
                        safeStr(root.name).includes(term) || safeStr(root.slug).includes(term)
                      const matchChildren = (root.children ?? []).some(
                        (ch) => safeStr(ch.name).includes(term) || safeStr(ch.slug).includes(term)
                      )
                      return matchRoot || matchChildren
                    })
                    .map((dept) => {
                      const deptProductsCount = getDeptProductCount(dept)
                      const subList = dept.children ?? []
                      const filteredSubs = categorySearch.trim()
                        ? subList.filter(
                            (s) =>
                              safeStr(s.name).includes(safeStr(categorySearch)) ||
                              safeStr(s.slug).includes(safeStr(categorySearch))
                          )
                        : subList

                      return (
                        <div
                          key={dept.id}
                          className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl hover:border-gold/30 transition-all"
                        >
                          {/* Department Banner & Main Info */}
                          <div className="p-6 border-b border-border bg-gradient-to-r from-surface to-surface-2/40">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                              <div className="flex items-start gap-4">
                                <div
                                  onClick={() => setSelectedCategoryDetail(dept)}
                                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-2 overflow-hidden border border-border/80 flex-shrink-0 cursor-pointer group"
                                >
                                  {dept.imageUrl ? (
                                    <Image
                                      src={dept.imageUrl}
                                      alt={dept.name}
                                      fill
                                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                                      sizes="80px"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gold">
                                      <FolderTree className="w-8 h-8" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => setSelectedCategoryDetail(dept)}
                                      className="font-serif text-2xl font-bold text-beige hover:text-gold transition-colors text-left"
                                    >
                                      {dept.name}
                                    </button>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-semibold uppercase">
                                      Root Department
                                    </span>
                                    <span className="text-xs text-beige-muted font-mono">/{dept.slug}</span>
                                  </div>

                                  {dept.description && (
                                    <p className="text-xs text-beige-muted line-clamp-2 max-w-2xl leading-relaxed">
                                      {dept.description}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-beige-muted">
                                    <span className="text-gold font-semibold">
                                      {deptProductsCount} Total Products
                                    </span>
                                    <span>•</span>
                                    <span>{subList.length} Subcategories</span>
                                    <span>•</span>
                                    <span className="text-success flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Active in Storefront
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Department Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => setSelectedCategoryDetail(dept)}
                                  className="flex items-center gap-1.5 text-xs py-2 px-3.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Details & Items</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNewProd((p) => ({ ...p, categoryId: dept.id }))
                                    setShowAddProductModal(true)
                                  }}
                                  className="flex items-center gap-1.5 text-xs py-2 px-3 border-gold/40 text-gold hover:bg-gold/10"
                                >
                                  <PackagePlus className="w-3.5 h-3.5" />
                                  <span>Add Item</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNewCat({ name: '', description: '', imageUrl: '', parentId: dept.id })
                                    setShowAddCategoryModal(true)
                                  }}
                                  className="flex items-center gap-1.5 text-xs py-2 px-3 text-beige hover:text-gold"
                                >
                                  <FolderPlus className="w-3.5 h-3.5" />
                                  <span>+ Subcategory</span>
                                </Button>
                                <button
                                  onClick={() => {
                                    setEditingCategory({
                                      id: dept.id,
                                      name: dept.name,
                                      description: dept.description ?? '',
                                      imageUrl: dept.imageUrl ?? '',
                                      parentId: dept.parentId ?? '',
                                      sortOrder: dept.sortOrder ?? 1,
                                    })
                                    setShowEditCategoryModal(true)
                                  }}
                                  className="p-2 rounded-lg bg-surface-2 border border-border text-beige-muted hover:text-beige hover:border-gold transition-colors"
                                  title="Edit Department"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(dept.id)}
                                  className="p-2 rounded-lg bg-surface-2 border border-border text-beige-muted hover:text-error hover:border-error transition-colors"
                                  title="Delete Department"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Nested Subcategories Grid */}
                          <div className="p-6 bg-surface-2/20">
                            <div className="flex items-center justify-between mb-3.5">
                              <h4 className="text-xs font-bold text-gold uppercase tracking-wider font-mono flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5" />
                                <span>Subcategories in {dept.name} ({subList.length})</span>
                              </h4>
                              <button
                                onClick={() => {
                                  setNewCat({ name: '', description: '', imageUrl: '', parentId: dept.id })
                                  setShowAddCategoryModal(true)
                                }}
                                className="text-xs text-gold hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add Subcategory
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                              {filteredSubs.map((sub) => {
                                const subProducts = products.filter(
                                  (p) =>
                                    p.categoryId === sub.id ||
                                    p.categorySlug === sub.slug ||
                                    (p.categoryName && safeStr(p.categoryName) === safeStr(sub.name))
                                )
                                return (
                                  <div
                                    key={sub.id}
                                    onClick={() => setSelectedCategoryDetail(sub)}
                                    className="group bg-surface border border-border rounded-xl p-3.5 hover:border-gold/60 transition-all cursor-pointer shadow-md hover:shadow-xl flex flex-col justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="relative w-10 h-10 rounded-lg bg-surface-2 overflow-hidden border border-border/80 flex-shrink-0">
                                        {sub.imageUrl ? (
                                          <Image
                                            src={sub.imageUrl}
                                            alt={sub.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                                            sizes="40px"
                                          />
                                        ) : (
                                          <div className="absolute inset-0 flex items-center justify-center text-beige-muted">
                                            <Tag className="w-4 h-4" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-semibold text-xs text-beige group-hover:text-gold transition-colors line-clamp-1">
                                          {sub.name}
                                        </h5>
                                        <p className="text-[10px] text-beige-muted font-mono truncate">
                                          /{sub.slug}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/60 text-[11px]">
                                      <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold font-mono font-medium text-[10px]">
                                        {subProducts.length} items
                                      </span>
                                      <span className="text-gold font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                        <span>Details</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}

                              {/* Quick Add Subcategory Card */}
                              <button
                                onClick={() => {
                                  setNewCat({ name: '', description: '', imageUrl: '', parentId: dept.id })
                                  setShowAddCategoryModal(true)
                                }}
                                className="border border-dashed border-border hover:border-gold/60 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 text-beige-muted hover:text-gold transition-colors min-h-[90px]"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-semibold">New Subcategory</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Flat Card View */}
              {categoryViewMode === 'flat' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {flatCategories
                    .filter((cat) => {
                      if (!categorySearch.trim()) return true
                      const term = safeStr(categorySearch)
                      return (
                        safeStr(cat.name).includes(term) ||
                        safeStr(cat.slug).includes(term) ||
                        (cat.parentName && safeStr(cat.parentName).includes(term))
                      )
                    })
                    .map((cat) => {
                      const count = products.filter(
                        (p) =>
                          p.categoryId === cat.id ||
                          p.categorySlug === cat.slug ||
                          (p.categoryName && safeStr(p.categoryName) === safeStr(cat.name))
                      ).length

                      return (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategoryDetail(cat)}
                          className="group bg-surface border border-border rounded-2xl p-5 flex flex-col justify-between shadow-xl hover:border-gold/60 transition-all cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center gap-3.5 mb-3">
                              <div className="relative w-12 h-12 rounded-xl bg-surface-2 overflow-hidden border border-border flex-shrink-0">
                                {cat.imageUrl ? (
                                  <Image
                                    src={cat.imageUrl}
                                    alt={cat.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    sizes="48px"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-gold">
                                    <FolderTree className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="font-serif text-lg font-bold text-beige group-hover:text-gold transition-colors">
                                  {cat.name}
                                </h3>
                                <p className="text-xs text-gold font-mono">/{cat.slug}</p>
                              </div>
                            </div>

                            {cat.parentName && (
                              <div className="mb-2">
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-2 text-beige-muted border border-border">
                                  Part of {cat.parentName}
                                </span>
                              </div>
                            )}

                            {cat.description && (
                              <p className="text-xs text-beige-muted line-clamp-2 leading-relaxed">
                                {cat.description}
                              </p>
                            )}
                          </div>

                          <div className="border-t border-border pt-3.5 mt-4 flex items-center justify-between text-xs">
                            <span className="font-mono text-gold font-semibold">{count} items</span>
                            <span className="text-gold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                              <span>View Details & Items</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 4: ORDERS & COURIER FULFILLMENT ─────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-[#111111]">Orders &amp; Fulfillment Pipeline</h1>
                  <p className="text-sm text-beige-muted mt-1">
                    Advance orders step-by-step (`Pending → Confirmed → Packed → Shipped → Out for Delivery → Delivered`) with courier tracking
                  </p>
                </div>
                {pendingReturnsBadge > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('returns')}
                    className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs self-start sm:self-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    View Returns Desk ({pendingReturnsBadge})
                  </Button>
                )}
              </div>

              {/* Status Pills & Search */}
              <div className="flex flex-col gap-3 bg-white border border-[#E7E5E4] rounded-2xl p-4 shadow-sm">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by order number, recipient, email, or phone..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `All (${orders.length})`, dot: 'bg-gold' },
                    { id: 'pending', label: `Pending (${orders.filter((o) => ['pending', 'paymentpending'].includes(safeStr(o.status))).length})`, dot: 'bg-amber-500' },
                    { id: 'confirmed', label: `Confirmed (${orders.filter((o) => safeStr(o.status) === 'confirmed').length})`, dot: 'bg-gold' },
                    { id: 'processing', label: `Packing (${orders.filter((o) => safeStr(o.status) === 'processing').length})`, dot: 'bg-purple-500' },
                    { id: 'shipped', label: `Shipped (${orders.filter((o) => safeStr(o.status) === 'shipped').length})`, dot: 'bg-sky-500' },
                    { id: 'outfordelivery', label: `Out Delivery (${orders.filter((o) => safeStr(o.status) === 'outfordelivery').length})`, dot: 'bg-sky-700' },
                    { id: 'delivered', label: `Delivered (${orders.filter((o) => safeStr(o.status) === 'delivered').length})`, dot: 'bg-emerald-500' },
                    { id: 'returns', label: `Returns & Refunds (${returnsOrders.length})`, dot: 'bg-amber-600' },
                    { id: 'cancelled', label: `Cancelled (${orders.filter((o) => safeStr(o.status) === 'cancelled').length})`, dot: 'bg-rose-500' },
                    { id: 'refunded', label: `Refunded (${orders.filter((o) => safeStr(o.status) === 'refunded').length})`, dot: 'bg-emerald-700' },
                  ].map((tab) => {
                    const isSelected = orderStatusFilter === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setOrderStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-[#111111] text-white shadow-sm'
                            : 'bg-surface-2 border border-border text-beige-muted hover:text-beige hover:border-gold/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#C5A059]' : tab.dot}`} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white border border-[#E7E5E4] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-beige-muted uppercase border-b border-border bg-surface-2/50">
                      <tr>
                        <th className="py-3.5 px-4">Order &amp; Date</th>
                        <th className="py-3.5 px-4">Recipient</th>
                        <th className="py-3.5 px-4">Total &amp; Payment</th>
                        <th className="py-3.5 px-4">Fulfillment Step</th>
                        <th className="py-3.5 px-4">Return / Courier</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredOrders.map((ord) => {
                        const isCanc = safeStr(ord.status) === 'cancelled'
                        const isDeliv = safeStr(ord.status) === 'delivered'
                        const hasReturn = ord.returnStatus && safeStr(ord.returnStatus) !== 'none'
                        const stepMeta = getOrderStepInfo(ord.status)

                        return (
                          <tr
                            key={ord.id}
                            className={`transition-colors ${
                              isCanc
                                ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                : isDeliv
                                ? 'bg-emerald-50/35 hover:bg-emerald-50/60'
                                : 'hover:bg-surface-2/40'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-mono text-gold font-bold">{ord.orderNumber}</div>
                              <div className="text-[11px] text-beige-muted">{formatDate(ord.createdAt)}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-beige">{ord.shippingName}</div>
                              <div className="text-xs text-beige-muted font-mono">{ord.shippingPhone}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-beige">
                                {formatCurrency(ord.totalAmount ?? ord.total ?? 0)}
                              </div>
                              <div className="text-[11px] uppercase text-beige-muted">
                                {ord.paymentMethod} • <span className="text-gold font-semibold">{ord.paymentStatus}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <StatusBadge status={ord.status} size="sm" />
                                <div className="text-[10px] font-mono text-beige-muted">{stepMeta.label}</div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              {hasReturn ? (
                                <div className="space-y-1">
                                  <StatusBadge status={ord.returnStatus!} size="sm" />
                                  {ord.refundReference && (
                                    <div className="text-[10px] font-mono text-emerald-700">{ord.refundReference}</div>
                                  )}
                                </div>
                              ) : ord.trackingNumber ? (
                                <div>
                                  <div className="text-[11px] font-semibold text-beige">{ord.courierName || 'Courier'}</div>
                                  <div className="font-mono text-[11px] text-gold">{ord.trackingNumber}</div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-beige-muted">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                {stepMeta.nextStatus && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={isUpdatingOrder}
                                    onClick={() => {
                                      if (stepMeta.nextStatus === 'shipped') {
                                        handleOpenInspectOrder(ord)
                                        setOrderStatusUpdate('shipped')
                                      } else {
                                        applyOrderStatusUpdate(ord.id, stepMeta.nextStatus!)
                                      }
                                    }}
                                    className="text-[11px] font-semibold py-1 px-2.5 bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111]"
                                  >
                                    {stepMeta.nextLabel} →
                                  </Button>
                                )}
                                {hasReturn && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActiveTab('returns')}
                                    className="text-[11px] py-1 px-2.5 border-amber-300 text-amber-800 hover:bg-amber-50"
                                  >
                                    Return Desk
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenInspectOrder(ord)}
                                  className="text-[11px] font-semibold py-1 px-2.5"
                                >
                                  Manage
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-beige-muted">
                            No orders match this status or search filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB: RETURNS & RETURN PAYMENT SETTLEMENT ────────────────────── */}
          {activeTab === 'returns' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-gold">
                    7-Day Return &amp; Refund Ledger
                  </span>
                  <h1 className="font-serif text-3xl font-bold text-[#111111]">Returns &amp; Refund Settlement</h1>
                  <p className="text-sm text-beige-muted mt-1">
                    Review customer return requests (`Requested → Approved → Picked Up → Warehouse QC → Refund Paid`), restock items, and settle return payments.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAllData} className="self-start sm:self-center text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Returns
                </Button>
              </div>

              {/* Returns KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-mono font-bold text-amber-800">Pending Review</span>
                  <p className="font-serif text-2xl font-bold text-amber-900 mt-1">{returnsSummary.requestedCount}</p>
                </div>
                <div className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-mono font-bold text-sky-800">Pickup In Progress</span>
                  <p className="font-serif text-2xl font-bold text-sky-900 mt-1">{returnsSummary.inPickupCount}</p>
                </div>
                <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-mono font-bold text-purple-800">Ready For Payout</span>
                  <p className="font-serif text-2xl font-bold text-purple-900 mt-1">
                    {returnsSummary.pendingPayoutCount} • {formatCurrency(returnsSummary.pendingPayoutAmount)}
                  </p>
                </div>
                <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-mono font-bold text-emerald-800">Settled Refunds</span>
                  <p className="font-serif text-2xl font-bold text-emerald-900 mt-1">
                    {formatCurrency(returnsSummary.totalRefundedAmount)}
                  </p>
                  <p className="text-[11px] text-emerald-700">{returnsSummary.completedCount} completed</p>
                </div>
              </div>

              {/* Return Filter Pills & Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-[#E7E5E4] rounded-2xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: `All (${returnsOrders.length})` },
                    { id: 'requested', label: `Requested (${returnsSummary.requestedCount})` },
                    { id: 'pickup', label: `In Pickup (${returnsSummary.inPickupCount})` },
                    { id: 'payout', label: `Ready for Payout (${returnsSummary.pendingPayoutCount})` },
                    { id: 'completed', label: `Refunded (${returnsSummary.completedCount})` },
                    { id: 'rejected', label: `Declined (${returnsSummary.rejectedCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setReturnFilter(f.id as any)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        returnFilter === f.id
                          ? 'bg-[#111111] text-white shadow-sm'
                          : 'bg-surface-2 border border-border text-beige-muted hover:text-beige'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-72">
                  <Search className="w-3.5 h-3.5 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={returnSearch}
                    onChange={(e) => setReturnSearch(e.target.value)}
                    placeholder="Search order #, customer, UTR..."
                    className="w-full lg:w-64 bg-surface-2 border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Return Workflow Cards */}
              <div className="space-y-5">
                {filteredReturns.map((ord) => {
                  const draft = getReturnDraft(ord)
                  const updateDraft = (patch: Partial<typeof draft>) =>
                    setReturnDrafts((prev) => ({ ...prev, [ord.id]: { ...draft, ...patch } }))
                  const rsNorm = safeStr(ord.returnStatus || 'none')
                  const psNorm = safeStr(ord.paymentStatus)
                  const isCompleted = rsNorm === 'refundcompleted' || psNorm === 'refunded' || psNorm === 'partiallyrefunded'
                  const isRejected = rsNorm === 'rejected'
                  const isCod = safeStr(ord.paymentMethod).includes('cash')
                  const busy = processingReturnId === ord.id
                  const stepIdx =
                    rsNorm === 'refundcompleted'
                      ? 4
                      : rsNorm === 'received' || rsNorm === 'refundinitiated' || psNorm === 'refundinitiated'
                      ? 3
                      : rsNorm === 'pickedup'
                      ? 2
                      : rsNorm === 'approved'
                      ? 1
                      : rsNorm === 'requested'
                      ? 0
                      : -1

                  return (
                    <div
                      key={ord.id}
                      className="bg-white border border-[#E7E5E4] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
                    >
                      {/* Top row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-base font-bold text-gold">{ord.orderNumber}</span>
                          <StatusBadge status={ord.returnStatus ?? ord.paymentStatus} size="sm" />
                          <StatusBadge status={ord.paymentStatus} size="sm" />
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-2 border border-border text-beige-muted uppercase">
                            {isCod ? 'COD Order' : 'Razorpay Online'}
                          </span>
                        </div>
                        <div className="text-right text-xs text-beige-muted">
                          Requested:{' '}
                          <strong className="text-beige">
                            {formatDate(ord.returnRequestedAt ?? ord.updatedAt ?? ord.createdAt)}
                          </strong>
                        </div>
                      </div>

                      {/* 5-step Return Progress Strip */}
                      {stepIdx >= 0 && (
                        <div className="grid grid-cols-5 gap-2 text-center">
                          {[
                            { label: '1. Requested', idx: 0 },
                            { label: '2. Approved', idx: 1 },
                            { label: '3. Picked Up', idx: 2 },
                            { label: '4. QC Passed', idx: 3 },
                            { label: '5. Refund Settled', idx: 4 },
                          ].map((st) => (
                            <div key={st.label} className="space-y-1">
                              <div className={`h-2 rounded-full ${stepIdx >= st.idx ? 'bg-[#C5A059]' : 'bg-surface-2 border border-border'}`} />
                              <span className={`block text-[10px] font-semibold ${stepIdx >= st.idx ? 'text-[#111111]' : 'text-beige-muted'}`}>
                                {st.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Grid: Details vs Payout / Action Desk */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <div className="lg:col-span-6 space-y-3 text-xs">
                          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-border space-y-1">
                            <p className="font-bold text-beige">
                              Customer: {ord.customerName ?? ord.shippingName} ({ord.customerEmail ?? ord.shippingPhone})
                            </p>
                            <p className="text-beige-muted">
                              <strong className="text-beige">Reason:</strong> {ord.returnReason || 'Return / Cancellation Refund'}
                            </p>
                            {ord.returnCustomerNotes && (
                              <p className="text-beige-muted">
                                <strong className="text-beige">Customer Note:</strong> {ord.returnCustomerNotes}
                              </p>
                            )}
                            {ord.customerRefundAccount && (
                              <p className="text-emerald-800 font-mono font-semibold pt-1">
                                Customer Payout Account: {ord.customerRefundAccount}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold uppercase text-beige-muted">
                              Items in Order ({ord.items?.length ?? 0})
                            </span>
                            {ord.items?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-white"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-beige truncate">{item.productName}</p>
                                  <p className="text-[11px] text-beige-muted">
                                    Qty {item.quantity} {item.variantName ? `• ${item.variantName}` : ''}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-beige shrink-0">
                                  {formatCurrency(item.totalPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Admin Step & Refund Settlement Box */}
                        <div className="lg:col-span-6 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl p-4 sm:p-5 space-y-3.5 text-xs">
                          {isCompleted ? (
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Refund Payment Settled ({formatCurrency(ord.refundAmount ?? ord.totalAmount ?? 0)})
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-3 rounded-xl border border-emerald-200">
                                <div>
                                  <span className="text-beige-muted block">Method</span>
                                  <strong className="text-beige">{ord.refundMethod ?? 'Settled'}</strong>
                                </div>
                                <div>
                                  <span className="text-beige-muted block">UTR / Reference ID</span>
                                  <strong className="font-mono text-emerald-700">{ord.refundReference ?? 'Recorded'}</strong>
                                </div>
                                <div>
                                  <span className="text-beige-muted block">Settled On</span>
                                  <strong className="text-beige">{ord.refundedAt ? formatDate(ord.refundedAt) : 'Completed'}</strong>
                                </div>
                                <div>
                                  <span className="text-beige-muted block">Inventory Restocked</span>
                                  <strong className="text-beige">{ord.returnInventoryRestocked ? 'Yes' : 'Pre-ship / No'}</strong>
                                </div>
                              </div>
                              {ord.returnAdminNotes && (
                                <p className="text-[11px] text-beige-muted">Note: {ord.returnAdminNotes}</p>
                              )}
                            </div>
                          ) : isRejected ? (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                              <p className="font-bold">Return Request Declined</p>
                              <p className="text-[11px]">Reason: {ord.returnAdminNotes}</p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="font-bold uppercase tracking-wider text-gold">
                                  Concierge Return &amp; Refund Actions
                                </span>
                                <span className="font-mono font-bold text-beige">
                                  Order Total: {formatCurrency(ord.totalAmount ?? ord.total ?? 0)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                    Pickup Tracking ID
                                  </label>
                                  <input
                                    type="text"
                                    value={draft.pickupTracking}
                                    onChange={(e) => updateDraft({ pickupTracking: e.target.value })}
                                    placeholder="e.g. REV-PKP-4821"
                                    className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 font-mono text-beige focus:outline-none focus:border-gold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                    Admin Note / QC Decision
                                  </label>
                                  <input
                                    type="text"
                                    value={draft.adminNotes}
                                    onChange={(e) => updateDraft({ adminNotes: e.target.value })}
                                    placeholder="Pickup scheduled / QC intact / reason..."
                                    className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 text-beige focus:outline-none focus:border-gold"
                                  />
                                </div>
                              </div>

                              {/* Step transition buttons */}
                              <div className="flex flex-wrap gap-2">
                                {rsNorm === 'requested' && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="primary"
                                      disabled={busy}
                                      onClick={() => handleReturnStepAction(ord, 'Approve')}
                                      className="text-xs bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111]"
                                    >
                                      1. Approve Pickup
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      onClick={() => handleReturnStepAction(ord, 'Reject')}
                                      className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                                    >
                                      Decline Return
                                    </Button>
                                  </>
                                )}
                                {rsNorm === 'approved' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="primary"
                                    disabled={busy}
                                    onClick={() => handleReturnStepAction(ord, 'MarkPickedUp')}
                                    className="text-xs"
                                  >
                                    2. Confirm Picked Up
                                  </Button>
                                )}
                                {(rsNorm === 'approved' || rsNorm === 'pickedup') && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => handleReturnStepAction(ord, 'MarkReceived')}
                                    className="text-xs border-purple-300 text-purple-800 hover:bg-purple-50"
                                  >
                                    3. Pass Warehouse QC &amp; Receive
                                  </Button>
                                )}
                              </div>

                              {/* Refund Payment Panel */}
                              {(rsNorm === 'approved' ||
                                rsNorm === 'pickedup' ||
                                rsNorm === 'received' ||
                                rsNorm === 'refundinitiated' ||
                                psNorm === 'refundinitiated') && (
                                <div className="border-t border-border pt-3 space-y-2.5">
                                  <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                                    Settle Return Refund Payment
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                        Refund Amount (₹)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        max={ord.totalAmount ?? ord.total ?? 999999}
                                        value={draft.refundAmount}
                                        onChange={(e) => updateDraft({ refundAmount: e.target.value })}
                                        className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 font-mono text-beige focus:outline-none focus:border-gold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                        Settlement Method
                                      </label>
                                      <select
                                        value={draft.refundMethod}
                                        onChange={(e) => updateDraft({ refundMethod: e.target.value })}
                                        className="w-full bg-white border border-border rounded-lg px-2 py-1.5 text-beige focus:outline-none focus:border-gold"
                                      >
                                        <option value="RazorpayOriginalSource">Razorpay Original Source</option>
                                        <option value="UpiTransfer">UPI Instant Transfer</option>
                                        <option value="BankTransfer">Bank NEFT / IMPS</option>
                                        <option value="StoreCredit">Store Credit</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                        UTR / Txn Ref (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={draft.refundReference}
                                        onChange={(e) => updateDraft({ refundReference: e.target.value })}
                                        placeholder="Auto-generated if blank"
                                        className="w-full bg-white border border-border rounded-lg px-2.5 py-1.5 font-mono text-beige focus:outline-none focus:border-gold"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <label className="inline-flex items-center gap-2 text-[11px] text-beige cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={draft.restockInventory}
                                        disabled={ord.returnInventoryRestocked || safeStr(ord.status) === 'cancelled'}
                                        onChange={(e) => updateDraft({ restockInventory: e.target.checked })}
                                        className="rounded border-border text-gold focus:ring-gold"
                                      />
                                      <span>
                                        {ord.returnInventoryRestocked || safeStr(ord.status) === 'cancelled'
                                          ? 'Inventory already restocked'
                                          : 'Restock returned items back to catalog'}
                                      </span>
                                    </label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="primary"
                                      disabled={busy}
                                      onClick={() => handleProcessReturnRefund(ord)}
                                      className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      {busy ? 'Processing...' : `Complete Refund (₹${draft.refundAmount || '0'})`}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {filteredReturns.length === 0 && (
                  <div className="text-center py-12 bg-white border border-[#E7E5E4] rounded-2xl">
                    <RotateCcw className="w-12 h-12 text-gold/40 mx-auto mb-3" />
                    <h3 className="font-serif text-lg font-bold text-beige">No Return Requests Found</h3>
                    <p className="text-xs text-beige-muted mt-1">
                      7-day customer return requests and prepaid cancellation refunds will appear here for step-by-step approval and settlement.
                    </p>
                  </div>
                )}
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
                {coupons.map((coupon) => {
                  const isPct =
                    Number(coupon.discountType) === 0 ||
                    String(coupon.discountType).toLowerCase() === 'percentage'
                  const redeemed = coupon.usedCount ?? coupon.timesUsed ?? 0
                  return (
                    <div
                      key={coupon.id}
                      className={`bg-surface border rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-opacity ${
                        coupon.isActive ? 'border-gold/30' : 'border-border opacity-70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Ticket className="w-6 h-6 text-gold" />
                            <StatusBadge
                              status={coupon.isActive ? 'active' : 'inactive'}
                              label={coupon.isActive ? 'Active' : 'Paused'}
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleCoupon(coupon)}
                              className="text-xs px-2 py-1 rounded-lg border border-border text-beige-muted hover:text-beige hover:border-gold transition-colors"
                            >
                              {coupon.isActive ? 'Pause' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon.id)}
                              className="text-beige-muted hover:text-error transition-colors"
                              aria-label={`Delete coupon ${coupon.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <span className="font-mono text-xl font-bold text-gold tracking-widest bg-gold/10 px-3 py-1 rounded-lg border border-gold/20 inline-block">
                          {coupon.code}
                        </span>
                        <p className="text-sm font-semibold text-beige mt-3">
                          {isPct ? `${coupon.discountValue}% OFF` : `${formatCurrency(coupon.discountValue)} FLAT OFF`}
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
                        {coupon.maxDiscountAmount ? (
                          <div className="flex justify-between">
                            <span>Max Discount:</span>
                            <span className="text-beige">{formatCurrency(coupon.maxDiscountAmount)}</span>
                          </div>
                        ) : null}
                        <div className="flex justify-between">
                          <span>Times Redeemed:</span>
                          <span className="text-gold font-bold">
                            {redeemed}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                          </span>
                        </div>
                        {coupon.expiresAt && (
                          <div className="flex justify-between">
                            <span>Expires:</span>
                            <span className="text-beige">{formatDate(coupon.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
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
                        <th className="py-3.5 px-4 text-center">Orders Placed</th>
                        <th className="py-3.5 px-4">Lifetime Spend</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Joined Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
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
                          <td className="py-3.5 px-4">
                            <StatusBadge
                              status={c.isActive !== false ? 'active' : 'inactive'}
                              label={c.isActive !== false ? 'Active' : 'Suspended'}
                              size="sm"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-xs text-beige-muted">{formatDate(c.createdAt)}</td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserSecurity(c.id)}
                              className={`text-xs py-1 px-2.5 ${
                                c.isActive !== false
                                  ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                                  : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              {c.isActive !== false ? 'Suspend' : 'Activate'}
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

          {/* ─── TAB: SUSPICIOUS ACTIVITY & SECURITY THREATS ───────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif text-3xl font-bold text-beige">Threat Surveillance & Security</h1>
                    {unreadAlerts > 0 && (
                      <Badge variant="error" className="animate-pulse text-xs font-mono">
                        {unreadAlerts} ACTIVE THREATS
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-beige-muted mt-1">
                    Surveillance engine monitoring high-value transactions, rapid checkout velocity, brute-force probes, and cart limit violations.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAllData}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-scan Engine
                  </Button>
                </div>
              </div>

              {/* Verified Security Seal */}
              <SecurityBadge variant="admin" posture={securityPosture} />

              {/* Threat KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-surface border border-rose-200 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-rose-700">Active Unresolved</span>
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-rose-800">{unreadAlerts}</p>
                  <p className="text-xs text-rose-600 mt-1">Requires administrative review</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-beige-muted">High-Value Monitored</span>
                    <DollarSign className="w-5 h-5 text-gold" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {orders.filter((o) => (o.totalAmount ?? o.total ?? 0) >= 50000).length}
                  </p>
                  <p className="text-xs text-gold mt-1">Orders ≥ ₹50,000 threshold</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-beige-muted">Depleted Stock Alerts</span>
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {products.filter((p) => (p.stock ?? p.stockQuantity ?? 0) <= 2).length}
                  </p>
                  <p className="text-xs text-beige-muted mt-1">Stock depleted to ≤ 2 units</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-beige-muted">Hoarding / Probes</span>
                    <AlertTriangle className="w-5 h-5 text-sky-600" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {alerts.filter((a) => /hoarding|velocity|brute|suspicious|cart/i.test(a.category)).length}
                  </p>
                  <p className="text-xs text-beige-muted mt-1">Blocked limit violations</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: `All Alerts (${alerts.length})` },
                  { id: 'unresolved', label: `Unresolved (${unreadAlerts})` },
                  { id: 'critical', label: `Critical Severity (${alerts.filter((a) => a.severity === 'Critical').length})` },
                  { id: 'resolved', label: `Archived & Resolved (${alerts.filter((a) => a.isResolved).length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSecurityFilter(f.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      securityFilter === f.id
                        ? 'bg-gold text-background font-bold shadow-md shadow-gold/20'
                        : 'bg-surface border border-border text-beige-muted hover:text-beige hover:border-gold/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Alerts Feed */}
              <div className="space-y-4">
                {alerts
                  .filter((a) => {
                    if (securityFilter === 'unresolved') return !a.isResolved
                    if (securityFilter === 'critical') return a.severity === 'Critical'
                    if (securityFilter === 'resolved') return a.isResolved
                    return true
                  })
                  .map((alert) => {
                    const isCrit = alert.severity === 'Critical'
                    const isHigh = alert.severity === 'High'
                    const isWarn = alert.severity === 'Warning'

                    const borderCol = alert.isResolved
                      ? 'border-border/60 bg-surface/60 opacity-80'
                      : isCrit
                      ? 'border-rose-300 bg-rose-50/70'
                      : isHigh
                      ? 'border-amber-300 bg-amber-50/70'
                      : isWarn
                      ? 'border-yellow-300 bg-yellow-50/60'
                      : 'border-border bg-surface'

                    return (
                      <div
                        key={alert.id}
                        className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-xl space-y-4 ${borderCol}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                                isCrit
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                  : isHigh
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : isWarn
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                  : 'bg-sky-100 text-sky-700 border border-sky-300'
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-xs text-gold uppercase tracking-wider font-semibold font-mono">
                              {alert.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-beige-muted">
                            <span className="font-mono">{formatDate(alert.timestamp)}</span>
                            {alert.isResolved ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> Action Required
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-serif text-lg font-bold text-beige">{alert.title}</h3>
                          <p className="text-sm text-beige-muted mt-1 leading-relaxed">{alert.description}</p>
                        </div>

                        {/* Meta bar */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-surface-2/60 p-3 rounded-xl border border-border">
                          {alert.ipAddress && (
                            <div>
                              <span className="text-beige-muted">Source IP: </span>
                              <span className="text-gold font-bold">{alert.ipAddress}</span>
                            </div>
                          )}
                          {alert.referenceId && (
                            <div>
                              <span className="text-beige-muted">Reference: </span>
                              <span className="text-beige font-semibold">{alert.referenceId}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-beige-muted">Incident Code: </span>
                            <span className="text-beige/70">{alert.id}</span>
                          </div>
                        </div>

                        {/* Resolution & Actions */}
                        {alert.isResolved ? (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                            <span>
                              <strong>Resolution Notes:</strong> {alert.actionTaken ?? 'Reviewed and verified safe.'}
                            </span>
                            <span className="text-[11px] text-emerald-700 font-mono">Archived in Security Audit Log</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                            {alert.referenceId && alert.referenceId.startsWith('USER-') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserSecurity(alert.referenceId!.replace('USER-', ''))}
                                className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                              >
                                Suspend / Block Account
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveAlert(alert.id, 'Investigated and cleared by admin')}
                              className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Safe & Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                {alerts.length === 0 && (
                  <div className="text-center py-12 bg-surface border border-border rounded-2xl">
                    <Shield className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="font-serif text-lg font-bold text-beige">Zero Security Threats Detected</h3>
                    <p className="text-xs text-beige-muted mt-1">All gateway transactions and inventory are running smoothly.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB: SUPPORT TICKETS & PRODUCT ISSUES ──────────────────────── */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-beige">Support Tickets &amp; Resolution Desk</h1>
                  <p className="text-sm text-beige-muted mt-1">
                    Review customer product queries, order issues, and send direct support resolutions.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAllData} className="flex items-center gap-1.5 self-start sm:self-center">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Queue
                </Button>
              </div>

              {/* Support KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface border border-amber-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-semibold text-amber-700">Open Tickets</span>
                  <p className="font-serif text-2xl font-bold text-amber-800 mt-1">
                    {supportTickets.filter((t) => t.status === 'Open').length}
                  </p>
                </div>
                <div className="bg-surface border border-sky-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-semibold text-sky-700">In Review</span>
                  <p className="font-serif text-2xl font-bold text-sky-800 mt-1">
                    {supportTickets.filter((t) => t.status === 'InReview').length}
                  </p>
                </div>
                <div className="bg-surface border border-emerald-200 rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-semibold text-emerald-700">Resolved / Closed</span>
                  <p className="font-serif text-2xl font-bold text-emerald-800 mt-1">
                    {supportTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length}
                  </p>
                </div>
                <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
                  <span className="text-[11px] uppercase font-semibold text-beige-muted">High / Urgent</span>
                  <p className="font-serif text-2xl font-bold text-rose-700 mt-1">
                    {supportTickets.filter((t) => t.priority === 'High' || t.priority === 'Urgent').length}
                  </p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: `All (${supportTickets.length})` },
                    { id: 'Open', label: `Open (${supportTickets.filter((t) => t.status === 'Open').length})` },
                    { id: 'InReview', label: `In Review (${supportTickets.filter((t) => t.status === 'InReview').length})` },
                    { id: 'Resolved', label: `Resolved (${supportTickets.filter((t) => t.status === 'Resolved').length})` },
                    { id: 'Closed', label: `Closed (${supportTickets.filter((t) => t.status === 'Closed').length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTicketStatusFilter(f.id as any)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        ticketStatusFilter === f.id
                          ? 'bg-gold text-background font-bold shadow-md shadow-gold/20'
                          : 'bg-surface border border-border text-beige-muted hover:text-beige'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-72">
                  <Search className="w-3.5 h-3.5 text-beige-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder="Search ticket #, product, customer..."
                    className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-beige focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Ticket List */}
              <div className="space-y-4">
                {supportTickets
                  .filter((t) => {
                    if (ticketStatusFilter !== 'all' && t.status !== ticketStatusFilter) return false
                    const q = safeStr(ticketSearch)
                    if (!q) return true
                    return (
                      safeStr(t.ticketNumber).includes(q) ||
                      safeStr(t.subject).includes(q) ||
                      safeStr(t.issueType).includes(q) ||
                      safeStr(t.productName).includes(q) ||
                      safeStr(t.orderNumber).includes(q) ||
                      safeStr(t.customerName).includes(q) ||
                      safeStr(t.customerEmail).includes(q)
                    )
                  })
                  .map((tkt) => {
                    const draft = ticketDrafts[tkt.id] ?? {
                      status: tkt.status,
                      priority: tkt.priority,
                      adminResponse: tkt.adminResponse ?? '',
                    }
                    const statusBadge =
                      tkt.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : tkt.status === 'InReview'
                        ? 'bg-sky-100 text-sky-800 border-sky-200'
                        : tkt.status === 'Closed'
                        ? 'bg-surface-2 text-beige-muted border-border'
                        : 'bg-amber-100 text-amber-800 border-amber-200'

                    return (
                      <div
                        key={tkt.id}
                        className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-md space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-sm font-bold text-gold">{tkt.ticketNumber}</span>
                            <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                              {tkt.status === 'InReview' ? 'In Review' : tkt.status}
                            </span>
                            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-surface-2 border border-border text-beige-muted">
                              {tkt.priority} Priority
                            </span>
                          </div>
                          <div className="text-xs text-beige-muted font-mono">
                            Submitted {formatDate(tkt.createdAt)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                          <div className="lg:col-span-2 space-y-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <span>
                                <strong className="text-beige">Customer:</strong> {tkt.customerName} ({tkt.customerEmail})
                              </span>
                              {tkt.orderNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const linked = orders.find((o) => o.orderNumber === tkt.orderNumber)
                                    if (linked) {
                                      handleOpenInspectOrder(linked)
                                    } else {
                                      setOrderSearch(tkt.orderNumber!)
                                      setActiveTab('orders')
                                    }
                                  }}
                                  className="font-mono text-gold font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                  Order: {tkt.orderNumber} <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {tkt.productName && (
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2/70 border border-border">
                                {isValidImageUrl(tkt.productImageUrl) && (
                                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-surface flex-shrink-0 border border-border">
                                    <Image
                                      src={tkt.productImageUrl!}
                                      alt={tkt.productName}
                                      fill
                                      className="object-cover"
                                      sizes="44px"
                                    />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-beige truncate">{tkt.productName}</p>
                                  <p className="text-[11px] text-beige-muted">
                                    {tkt.category} • <span className="text-gold font-semibold">{tkt.issueType}</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {!tkt.productName && (
                              <p className="text-xs text-beige-muted">
                                <strong>Category:</strong> {tkt.category} • <strong className="text-gold">{tkt.issueType}</strong>
                              </p>
                            )}

                            <div className="bg-surface-2/40 border border-border rounded-xl p-3.5 space-y-1">
                              <h3 className="text-sm font-bold text-beige">{tkt.subject}</h3>
                              <p className="text-xs text-beige-muted leading-relaxed whitespace-pre-wrap">{tkt.message}</p>
                            </div>
                          </div>

                          {/* Support Resolution Controls */}
                          <div className="bg-surface-2/60 border border-border rounded-xl p-4 space-y-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-gold block">
                              Support Review &amp; Solve
                            </span>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                  Status
                                </label>
                                <select
                                  value={draft.status}
                                  onChange={(e) =>
                                    setTicketDrafts((prev) => ({
                                      ...prev,
                                      [tkt.id]: { ...draft, status: e.target.value },
                                    }))
                                  }
                                  className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-beige focus:outline-none focus:border-gold"
                                >
                                  <option value="Open">Open</option>
                                  <option value="InReview">In Review</option>
                                  <option value="Resolved">Resolved</option>
                                  <option value="Closed">Closed</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                  Priority
                                </label>
                                <select
                                  value={draft.priority}
                                  onChange={(e) =>
                                    setTicketDrafts((prev) => ({
                                      ...prev,
                                      [tkt.id]: { ...draft, priority: e.target.value },
                                    }))
                                  }
                                  className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-beige focus:outline-none focus:border-gold"
                                >
                                  <option value="Low">Low</option>
                                  <option value="Normal">Normal</option>
                                  <option value="High">High</option>
                                  <option value="Urgent">Urgent</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold uppercase text-beige-muted block mb-1">
                                Resolution / Reply to Customer
                              </label>
                              <textarea
                                rows={3}
                                value={draft.adminResponse}
                                onChange={(e) =>
                                  setTicketDrafts((prev) => ({
                                    ...prev,
                                    [tkt.id]: { ...draft, adminResponse: e.target.value },
                                  }))
                                }
                                placeholder="Write solution steps, replacement / refund note, or answer..."
                                className="w-full bg-surface border border-border rounded-lg px-2.5 py-2 text-xs text-beige focus:outline-none focus:border-gold resize-none"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={savingTicketId === tkt.id}
                                onClick={() => handleUpdateSupportTicket(tkt.id)}
                                className="flex-1 text-xs"
                              >
                                {savingTicketId === tkt.id ? 'Saving...' : 'Save Review'}
                              </Button>
                              {tkt.status !== 'Resolved' && (
                                <Button
                                  type="button"
                                  variant="primary"
                                  size="sm"
                                  disabled={savingTicketId === tkt.id}
                                  onClick={() => handleUpdateSupportTicket(tkt.id, 'Resolved')}
                                  className="flex-1 text-xs"
                                >
                                  Mark Resolved
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                {supportTickets.length === 0 && (
                  <div className="text-center py-12 bg-surface border border-border rounded-2xl">
                    <MessageSquare className="w-12 h-12 text-gold/40 mx-auto mb-3" />
                    <h3 className="font-serif text-lg font-bold text-beige">No Support Tickets Yet</h3>
                    <p className="text-xs text-beige-muted mt-1">
                      Customer queries and product issue reports raised from /account will appear here for review.
                    </p>
                  </div>
                )}
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
                    Atelier & Registered Location
                  </label>
                  <div className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige text-xs space-y-1">
                    <p className="font-bold text-gold">2 Maruti Chock, Rajkot, Gujarat, 360005, India</p>
                    <p className="text-beige-muted">Official Storefront, Warehouse & Concierge Dispatch Center</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-beige-muted uppercase mb-1">
                      Support & Executive Email
                    </label>
                    <input
                      type="text"
                      value="nexustech1003@gmail.com"
                      disabled
                      className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-beige-muted uppercase mb-1">
                      Helpline / WhatsApp Concierge
                    </label>
                    <input
                      type="text"
                      value="+91 12345 67890"
                      disabled
                      className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      GSTIN Registration
                    </label>
                    <input
                      type="text"
                      value="24AAACN1234F1Z5"
                      disabled
                      className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-beige-muted uppercase mb-1">
                    Complimentary White-Glove Threshold
                  </label>
                  <input
                    type="text"
                    value="₹5,000 (Free courier delivery on orders above ₹5,000)"
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
                    value="Available on all domestic orders across India"
                    disabled
                    className="w-full bg-surface-2 border border-border rounded-xl p-3 text-beige text-xs"
                  />
                </div>

                <div className="p-4 bg-surface-2 rounded-xl border border-border text-xs text-beige-muted">
                  <p className="font-semibold text-gold mb-1">NEXUS Platform Version</p>
                  <p>Release 2.5.0 — High-Concurrency Luxury E-Commerce Architecture with Active Threat Surveillance</p>
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
                    Collection / Subcategory
                  </label>
                  <select
                    value={newProd.categoryId}
                    onChange={(e) => setNewProd({ ...newProd, categoryId: e.target.value })}
                    className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                    required
                  >
                    {categories.map((c) => (
                      <optgroup key={c.id} label={c.name} className="bg-surface font-semibold text-gold">
                        <option value={c.id} className="text-beige font-normal">
                          {c.name} (Entire Department)
                        </option>
                        {c.children &&
                          c.children.map((sub) => (
                            <option key={sub.id} value={sub.id} className="text-beige font-normal">
                              &nbsp;&nbsp;&nbsp;↳ {sub.name}
                            </option>
                          ))}
                      </optgroup>
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

              {isValidImageUrl(newProd.imageUrl) && (
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

      {/* ─── MODAL: BULK ADD PRODUCTS ───────────────────────────────────────── */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-gold/50 rounded-2xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <ListPlus className="w-6 h-6 text-gold" />
                <div>
                  <h3 className="font-serif text-xl font-bold text-beige">Bulk Ingestion & Fast Publishing</h3>
                  <p className="text-xs text-beige-muted">Add multiple pieces directly into any department or subcategory</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Category Selector & Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-2/40 p-4 rounded-xl border border-border">
              <div>
                <label className="block text-xs font-semibold uppercase text-gold tracking-wider mb-1.5">
                  Target Destination Category / Subcategory
                </label>
                <select
                  value={bulkTargetCategoryId}
                  onChange={(e) => setBulkTargetCategoryId(e.target.value)}
                  className="w-full bg-surface border border-border text-beige text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                >
                  {categories.map((c) => (
                    <optgroup key={c.id} label={c.name} className="bg-surface font-semibold text-gold">
                      <option value={c.id} className="text-beige font-normal">
                        {c.name} (Entire Department)
                      </option>
                      {c.children &&
                        c.children.map((sub) => (
                          <option key={sub.id} value={sub.id} className="text-beige font-normal">
                            &nbsp;&nbsp;&nbsp;↳ {sub.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-beige-muted tracking-wider mb-1.5">
                  Quick Starter Templates
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadBulkTemplate('mens-tees')}
                    className="px-2.5 py-1.5 bg-surface border border-border hover:border-gold/50 rounded-lg text-xs font-medium text-beige transition-all"
                  >
                    Load Men's Tees (3)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadBulkTemplate('womens-dresses')}
                    className="px-2.5 py-1.5 bg-surface border border-border hover:border-gold/50 rounded-lg text-xs font-medium text-beige transition-all"
                  >
                    Load Women's Couture (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadBulkTemplate('footwear')}
                    className="px-2.5 py-1.5 bg-surface border border-border hover:border-gold/50 rounded-lg text-xs font-medium text-beige transition-all"
                  >
                    Load Footwear (2)
                  </button>
                </div>
              </div>
            </div>

            {/* Ingestion Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode('table')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bulkMode === 'table'
                      ? 'bg-gold text-background font-bold shadow-md shadow-gold/20'
                      : 'bg-surface border border-border text-beige-muted hover:text-beige'
                  }`}
                >
                  Interactive Grid Editor ({bulkRows.length} Rows)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('paste')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bulkMode === 'paste'
                      ? 'bg-gold text-background font-bold shadow-md shadow-gold/20'
                      : 'bg-surface border border-border text-beige-muted hover:text-beige'
                  }`}
                >
                  Fast CSV / Pipe Delimited Paste
                </button>
              </div>

              {bulkMode === 'table' && (
                <Button variant="outline" size="sm" onClick={handleAddBulkRow} className="text-xs flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </Button>
              )}
            </div>

            {/* Mode 1: Interactive Table */}
            {bulkMode === 'table' && (
              <div className="border border-border rounded-xl overflow-hidden bg-surface">
                <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead className="bg-surface-2 text-beige-muted uppercase text-[10px] sticky top-0 z-10 border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3 w-48">Title *</th>
                        <th className="py-2.5 px-3 w-28">Price (₹) *</th>
                        <th className="py-2.5 px-3 w-28">Compare (₹)</th>
                        <th className="py-2.5 px-3 w-20">Stock</th>
                        <th className="py-2.5 px-3 w-32">SKU</th>
                        <th className="py-2.5 px-3 w-44">Image URL</th>
                        <th className="py-2.5 px-3 w-32">Tags</th>
                        <th className="py-2.5 px-3 text-right w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bulkRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-2/30">
                          <td className="py-2 px-3 font-mono text-beige-muted">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.name}
                              placeholder="e.g. Supima Cotton Polo"
                              onChange={(e) => {
                                const val = e.target.value
                                setBulkRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, name: val } : r))
                                )
                              }}
                              className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige focus:outline-none focus:border-gold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={row.price}
                              placeholder="2499"
                              onChange={(e) => {
                                const val = e.target.value
                                setBulkRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, price: val } : r))
                                )
                              }}
                              className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige font-mono focus:outline-none focus:border-gold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={row.compareAtPrice}
                              placeholder="3499"
                              onChange={(e) => {
                                const val = e.target.value
                                setBulkRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, compareAtPrice: val } : r))
                                )
                              }}
                              className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige font-mono focus:outline-none focus:border-gold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              value={row.stock}
                              placeholder="15"
                              onChange={(e) => {
                                const val = e.target.value
                                setBulkRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, stock: val } : r))
                                )
                              }}
                              className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige font-mono focus:outline-none focus:border-gold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.sku}
                              placeholder="NX-01"
                              onChange={(e) => {
                                const val = e.target.value
                                setBulkRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, sku: val } : r))
                                )
                              }}
                              className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige font-mono focus:outline-none focus:border-gold"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={row.imageUrl}
                                placeholder="https://..."
                                onChange={(e) => {
                                  const val = e.target.value
                                  setBulkRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, imageUrl: val } : r))
                                  )
                                }}
                                className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige focus:outline-none focus:border-gold truncate"
                              />
                              {isValidImageUrl(row.imageUrl) && (
                                <div className="relative w-7 h-7 rounded overflow-hidden flex-shrink-0 border border-border">
                                  <Image src={row.imageUrl} alt="" fill className="object-cover" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.tags}
                              placeholder="men, polo"
                              onChange={(e) => {
                                const val = e.target.value
                                setBulkRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, tags: val } : r))
                                )
                              }}
                              className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-beige focus:outline-none focus:border-gold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleDuplicateBulkRow(idx)}
                                title="Duplicate Row"
                                className="p-1 text-beige-muted hover:text-gold"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveBulkRow(idx)}
                                title="Remove Row"
                                disabled={bulkRows.length <= 1}
                                className="p-1 text-beige-muted hover:text-error disabled:opacity-30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mode 2: Paste mode */}
            {bulkMode === 'paste' && (
              <div className="space-y-3">
                <p className="text-xs text-beige-muted">
                  Paste rows using format:{' '}
                  <span className="font-mono text-gold">
                    Title | Price | ComparePrice | Stock | SKU | ImageUrl | Tags
                  </span>
                </p>
                <textarea
                  rows={8}
                  placeholder={`Nexus Ribbed Tee | 2499 | 3499 | 20 | NX-M-01 | https://images.unsplash.com/... | men, t-shirt
Nexus Linen Shirt | 3499 | 4999 | 15 | NX-M-02 | https://images.unsplash.com/... | men, linen`}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl p-3 text-xs text-beige font-mono placeholder:text-beige-muted/40 focus:outline-none focus:border-gold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleParseBulkPaste}
                  className="text-xs"
                >
                  Parse into Grid Table
                </Button>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="text-xs text-beige-muted">
                Ready to publish:{' '}
                <span className="text-gold font-bold">
                  {bulkRows.filter((r) => r.name.trim() && parseFloat(r.price) > 0).length} valid items
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowBulkAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleCreateBulkProducts}
                  isLoading={isSubmittingBulk}
                  className="flex items-center gap-2"
                >
                  <ListPlus className="w-4 h-4" />
                  Publish All to Category
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULL EDIT PRODUCT ───────────────────────────────────────── */}
      {showEditProductModal && selectedProductToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-xl font-bold text-beige truncate">
                Edit Product: {selectedProductToEdit.name}
              </h3>
              <button
                onClick={() => setShowEditProductModal(false)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Title"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                    Collection / Subcategory
                  </label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                    className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                    required
                  >
                    {categories.map((c) => (
                      <optgroup key={c.id} label={c.name} className="bg-surface font-semibold text-gold">
                        <option value={c.id} className="text-beige font-normal">
                          {c.name} (Entire Department)
                        </option>
                        {c.children &&
                          c.children.map((sub) => (
                            <option key={sub.id} value={sub.id} className="text-beige font-normal">
                              &nbsp;&nbsp;&nbsp;↳ {sub.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Price (₹)"
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  required
                />
                <Input
                  label="Compare At Price (₹)"
                  type="number"
                  step="0.01"
                  value={editForm.compareAtPrice}
                  onChange={(e) => setEditForm({ ...editForm, compareAtPrice: e.target.value })}
                />
                <Input
                  label="Stock Inventory"
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SKU Code"
                  value={editForm.sku}
                  onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                />
                <Input
                  label="Tags (comma-separated)"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                />
              </div>

              <Input
                label="Primary Image URL"
                placeholder="https://images.unsplash.com/..."
                value={editForm.imageUrl}
                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
              />

              {isValidImageUrl(editForm.imageUrl) && (
                <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                    <Image src={editForm.imageUrl} alt="Preview" fill className="object-cover" />
                  </div>
                  <span className="text-xs text-success font-medium">Primary image preview</span>
                </div>
              )}

              <Input
                label="Short Tagline"
                value={editForm.shortDescription}
                onChange={(e) => setEditForm({ ...editForm, shortDescription: e.target.value })}
              />

              <div>
                <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                  Full Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-surface-2 border border-border rounded-xl p-3 text-sm text-beige placeholder:text-beige-muted/50 focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    className="accent-gold w-4 h-4"
                  />
                  <span className="text-sm text-beige">Featured on Homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="accent-gold w-4 h-4"
                  />
                  <span className="text-sm text-beige">Active in Storefront</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditProductModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isUpdatingProd}>
                  Save Changes
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
              <div>
                <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                  Parent Department (Optional)
                </label>
                <select
                  value={newCat.parentId}
                  onChange={(e) => setNewCat({ ...newCat, parentId: e.target.value })}
                  className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="">None (Top-Level Root Department)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
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

      {/* ─── MODAL: EDIT CATEGORY ────────────────────────────────────────────── */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-beige">Edit Collection / Category</h3>
              <button
                onClick={() => {
                  setShowEditCategoryModal(false)
                  setEditingCategory(null)
                }}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <Input
                label="Category Name"
                placeholder="e.g. Swiss Chronographs"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-xs font-medium text-beige mb-1.5 uppercase tracking-wider">
                  Parent Department (Optional)
                </label>
                <select
                  value={editingCategory.parentId}
                  onChange={(e) => setEditingCategory({ ...editingCategory, parentId: e.target.value })}
                  className="w-full bg-surface-2 border border-border text-beige text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-gold cursor-pointer"
                >
                  <option value="">None (Top-Level Root Department)</option>
                  {categories
                    .filter((c) => c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <Input
                label="Description"
                placeholder="Artisanal chronographs crafted in Geneva"
                value={editingCategory.description}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
              />
              <Input
                label="Banner Image URL"
                placeholder="https://images.unsplash.com/..."
                value={editingCategory.imageUrl}
                onChange={(e) => setEditingCategory({ ...editingCategory, imageUrl: e.target.value })}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEditCategoryModal(false)
                    setEditingCategory(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingCat}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SLIDE-OVER DRAWER: CATEGORY DETAILS & ITEMS ─────────────────────── */}
      {selectedCategoryDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Scrim */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedCategoryDetail(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-surface border-l border-gold/40 shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Drawer Header */}
                <div className="p-6 border-b border-border bg-surface-2/40 flex items-center justify-between sticky top-0 z-20 backdrop-blur">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-beige-muted font-mono uppercase tracking-wider">
                      <FolderTree className="w-3.5 h-3.5 text-gold" />
                      {selectedCategoryDetail.parentId ? (
                        <span>
                          {categories.find((c) => c.id === selectedCategoryDetail.parentId)?.name ?? 'Department'} ›{' '}
                          <strong className="text-gold">{selectedCategoryDetail.name}</strong>
                        </span>
                      ) : (
                        <span>
                          Root Department › <strong className="text-gold">{selectedCategoryDetail.name}</strong>
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-beige mt-1">
                      {selectedCategoryDetail.name}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedCategoryDetail(null)}
                    className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-beige-muted hover:text-beige hover:border-gold transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="p-6 space-y-6">
                  {/* Category Hero Banner */}
                  <div className="relative rounded-2xl overflow-hidden border border-border h-48 bg-surface-2 shadow-lg">
                    {selectedCategoryDetail.imageUrl ? (
                      <Image
                        src={selectedCategoryDetail.imageUrl}
                        alt={selectedCategoryDetail.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 600px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-beige-muted/40">
                        <FolderTree className="w-12 h-12 text-gold" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-gold/25 border border-gold/50 text-gold text-xs font-mono font-bold uppercase tracking-wider mb-1">
                          {selectedCategoryDetail.parentId ? 'Subcategory' : 'Root Department'}
                        </span>
                        <h3 className="font-serif text-xl font-bold text-white leading-snug">
                          {selectedCategoryDetail.name}
                        </h3>
                        <p className="text-xs text-gold/90 font-mono">/{selectedCategoryDetail.slug}</p>
                      </div>

                      <div className="bg-surface/90 backdrop-blur px-3 py-1.5 rounded-xl border border-border text-center">
                        <span className="text-xs font-mono text-beige-muted block">Live Items</span>
                        <span className="text-base font-bold font-serif text-gold">
                          {
                            products.filter(
                              (p) =>
                                p.categoryId === selectedCategoryDetail.id ||
                                p.categorySlug === selectedCategoryDetail.slug ||
                                (p.categoryName &&
                                  safeStr(p.categoryName) === safeStr(selectedCategoryDetail.name)) ||
                                p.parentCategoryId === selectedCategoryDetail.id
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedCategoryDetail.description && (
                    <div className="bg-surface-2/40 border border-border rounded-xl p-4">
                      <p className="text-xs font-mono text-beige-muted uppercase tracking-wider mb-1">
                        Collection Description
                      </p>
                      <p className="text-xs text-beige leading-relaxed">{selectedCategoryDetail.description}</p>
                    </div>
                  )}

                  {/* Primary Action Buttons Bar */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        setNewProd((p) => ({ ...p, categoryId: selectedCategoryDetail.id }))
                        setShowAddProductModal(true)
                      }}
                      className="flex items-center gap-2 flex-1 justify-center shadow-lg"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Add Product to this Category</span>
                    </Button>

                    {!selectedCategoryDetail.parentId && (
                      <Button
                        variant="outline"
                        size="md"
                        onClick={() => {
                          setNewCat({
                            name: '',
                            description: '',
                            imageUrl: '',
                            parentId: selectedCategoryDetail.id,
                          })
                          setShowAddCategoryModal(true)
                        }}
                        className="flex items-center gap-2 border-gold/40 text-gold hover:bg-gold/10"
                      >
                        <FolderPlus className="w-4 h-4" />
                        <span>Add Subcategory</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setEditingCategory({
                          id: selectedCategoryDetail.id,
                          name: selectedCategoryDetail.name,
                          description: selectedCategoryDetail.description ?? '',
                          imageUrl: selectedCategoryDetail.imageUrl ?? '',
                          parentId: selectedCategoryDetail.parentId ?? '',
                          sortOrder: selectedCategoryDetail.sortOrder ?? 1,
                        })
                        setShowEditCategoryModal(true)
                      }}
                      className="flex items-center gap-1.5 text-beige hover:text-gold"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </Button>

                    <Link
                      href={`/products?category=${selectedCategoryDetail.slug}`}
                      target="_blank"
                      className="px-3 py-2 rounded-xl border border-border text-xs font-semibold text-beige-muted hover:text-beige hover:border-gold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Storefront</span>
                    </Link>
                  </div>

                  {/* Subcategories inside this Root Category */}
                  {!selectedCategoryDetail.parentId &&
                    selectedCategoryDetail.children &&
                    selectedCategoryDetail.children.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gold uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Subcategories ({selectedCategoryDetail.children.length})</span>
                          </h4>
                          <button
                            onClick={() => {
                              setNewCat({
                                name: '',
                                description: '',
                                imageUrl: '',
                                parentId: selectedCategoryDetail.id,
                              })
                              setShowAddCategoryModal(true)
                            }}
                            className="text-xs text-gold hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> New Subcategory
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {selectedCategoryDetail.children.map((sub) => {
                            const subCount = products.filter(
                              (p) =>
                                p.categoryId === sub.id ||
                                p.categorySlug === sub.slug ||
                                (p.categoryName && safeStr(p.categoryName) === safeStr(sub.name))
                            ).length
                            return (
                              <div
                                key={sub.id}
                                onClick={() => setSelectedCategoryDetail(sub)}
                                className="bg-surface-2/60 border border-border rounded-xl p-3 flex items-center justify-between hover:border-gold/50 cursor-pointer transition-colors"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-beige hover:text-gold">{sub.name}</p>
                                  <p className="text-[10px] text-beige-muted font-mono">/{sub.slug}</p>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold/15 text-gold font-medium">
                                  {subCount}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  {/* Assigned Products in this Category */}
                  {(() => {
                    const catItems = products.filter((p) => {
                      const childIds = new Set((selectedCategoryDetail.children ?? []).map((c) => c.id))
                      const childSlugs = new Set(
                        (selectedCategoryDetail.children ?? []).map((c) => safeStr(c.slug))
                      )
                      const isDirect =
                        p.categoryId === selectedCategoryDetail.id ||
                        p.categorySlug === selectedCategoryDetail.slug ||
                        (p.categoryName &&
                          safeStr(p.categoryName) === safeStr(selectedCategoryDetail.name))
                      const isChild =
                        (p.categoryId && childIds.has(p.categoryId)) ||
                        (p.categorySlug && childSlugs.has(safeStr(p.categorySlug))) ||
                        p.parentCategoryId === selectedCategoryDetail.id ||
                        p.parentCategorySlug === selectedCategoryDetail.slug ||
                        (p.parentCategoryName &&
                          safeStr(p.parentCategoryName) === safeStr(selectedCategoryDetail.name))

                      return isDirect || isChild
                    })

                    return (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gold uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            <span>Catalog Items in this Collection ({catItems.length})</span>
                          </h4>
                          <button
                            onClick={() => {
                              setNewProd((p) => ({ ...p, categoryId: selectedCategoryDetail.id }))
                              setShowAddProductModal(true)
                            }}
                            className="text-xs text-gold hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Item
                          </button>
                        </div>

                        {catItems.length === 0 ? (
                          <div className="bg-surface-2/30 border border-dashed border-border rounded-xl p-8 text-center space-y-3">
                            <Package className="w-8 h-8 mx-auto text-gold/40" />
                            <p className="text-xs text-beige-muted">No products assigned to this category yet.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewProd((p) => ({ ...p, categoryId: selectedCategoryDetail.id }))
                                setShowAddProductModal(true)
                              }}
                              className="text-xs border-gold/40 text-gold hover:bg-gold/10"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Add First Product
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
                            {catItems.map((prod) => {
                              const img = prod.primaryImageUrl ?? prod.primaryImage
                              return (
                                <div
                                  key={prod.id}
                                  className="p-3 flex items-center justify-between hover:bg-surface-2/40 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="relative w-11 h-11 rounded-lg bg-surface-2 overflow-hidden border border-border flex-shrink-0">
                                      {img ? (
                                        <Image
                                          src={img}
                                          alt={prod.name}
                                          fill
                                          className="object-cover"
                                          sizes="44px"
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-beige-muted">
                                          <Package className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-semibold text-beige line-clamp-1">
                                        {prod.name}
                                      </h5>
                                      <div className="flex items-center gap-2 text-[10px] text-beige-muted font-mono">
                                        <span>{formatCurrency(prod.price)}</span>
                                        <span>•</span>
                                        <span className="text-gold">{prod.categoryName}</span>
                                        {prod.sku && (
                                          <>
                                            <span>•</span>
                                            <span>SKU: {prod.sku}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenEditProduct(prod)}
                                      className="text-[11px] py-1 px-2.5 h-auto"
                                    >
                                      Edit
                                    </Button>
                                    <Link
                                      href={`/products/${prod.slug}`}
                                      target="_blank"
                                      className="p-1.5 rounded-lg border border-border text-beige-muted hover:text-beige hover:border-gold transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border bg-surface-2/60 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategoryDetail(null)}
                  className="text-xs"
                >
                  Close Drawer
                </Button>
                <button
                  onClick={() => handleDeleteCategory(selectedCategoryDetail.id)}
                  className="text-xs text-error hover:underline flex items-center gap-1 px-2 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Category</span>
                </button>
              </div>
            </div>
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

              <Input
                label="Description (Optional)"
                placeholder="e.g. Festive 20% privilege discount"
                value={newCoupon.description}
                onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
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

              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Min Order (₹)"
                  type="number"
                  value={newCoupon.minOrderValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: e.target.value })}
                />
                <Input
                  label="Max Discount (₹)"
                  type="number"
                  value={newCoupon.maxDiscountAmount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscountAmount: e.target.value })}
                />
                <Input
                  label="Usage Limit"
                  type="number"
                  value={newCoupon.usageLimit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                />
              </div>

              <Input
                label="Valid For (Days)"
                type="number"
                value={newCoupon.expiresInDays}
                onChange={(e) => setNewCoupon({ ...newCoupon, expiresInDays: e.target.value })}
              />

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
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setInspectOrder(null)}
        >
          <div
            className="bg-surface border border-gold/40 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up my-4 sm:my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-xl font-bold text-beige flex items-center gap-2">
                    Order <span className="font-mono text-gold">{inspectOrder.orderNumber}</span>
                  </h3>
                  <StatusBadge status={inspectOrder.status} size="sm" />
                </div>
                <p className="text-xs text-beige-muted mt-0.5">Placed on {formatDate(inspectOrder.createdAt)}</p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Feedback Banner */}
            {inspectOrder.status?.toString().toLowerCase() === 'cancelled' && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-rose-900">Order Cancelled</p>
                  <p className="text-rose-700 mt-0.5">This order has been cancelled. No shipment or fulfillment action is required.</p>
                </div>
              </div>
            )}
            {inspectOrder.status?.toString().toLowerCase() === 'delivered' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900">Order Completed & Delivered</p>
                  <p className="text-emerald-700 mt-0.5">Customer has received package. Transaction is marked complete.</p>
                </div>
              </div>
            )}

            {/* Visual Order Pipeline Stepper */}
            {(() => {
              const curStep = getOrderStepInfo(inspectOrder.status)
              const validTargets = getValidNextStatuses(inspectOrder.status)
              const isTerminal = ['cancelled', 'refunded', 'delivered'].includes(safeStr(inspectOrder.status))
              const steps = [
                { id: 'pending', label: 'Placed', time: inspectOrder.createdAt },
                { id: 'confirmed', label: 'Confirmed', time: inspectOrder.confirmedAt },
                { id: 'processing', label: 'Packed', time: inspectOrder.processingAt },
                { id: 'shipped', label: 'Shipped', time: inspectOrder.shippedAt },
                { id: 'outfordelivery', label: 'Out Delivery', time: inspectOrder.outForDeliveryAt },
                { id: 'delivered', label: 'Delivered', time: inspectOrder.deliveredAt },
              ]
              return (
                <>
                  {curStep.step >= 0 ? (
                    <div className="bg-surface-2/60 border border-border rounded-xl p-4 overflow-x-auto">
                      <div className="grid grid-cols-6 gap-2 min-w-[460px]">
                        {steps.map((st, idx) => {
                          const done = idx <= curStep.step
                          const isCurrent = idx === curStep.step
                          return (
                            <div key={st.id} className="space-y-1.5 text-center">
                              <div className={`h-2 rounded-full transition-all ${done ? 'bg-[#C5A059]' : 'bg-border'}`} />
                              <span
                                className={`block text-[10px] uppercase font-bold ${
                                  isCurrent ? 'text-[#111111]' : done ? 'text-gold' : 'text-beige-muted'
                                }`}
                              >
                                {st.label}
                              </span>
                              {st.time && (
                                <span className="block text-[9px] font-mono text-beige-muted">
                                  {new Date(st.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Guided Step-by-Step Updater */}
                  <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase text-gold tracking-wider">
                        Guided Step Progression &amp; Courier Dispatch
                      </h4>
                      {curStep.nextStatus && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={isUpdatingOrder}
                          onClick={() => {
                            setOrderStatusUpdate(curStep.nextStatus!)
                            applyOrderStatusUpdate(inspectOrder.id, curStep.nextStatus!, {
                              courierName: orderCourierUpdate,
                              trackingNumber: orderTrackingUpdate,
                            })
                          }}
                          className="text-xs bg-[#111111] hover:bg-[#C5A059] text-white hover:text-[#111111]"
                        >
                          Quick Advance: {curStep.nextLabel} →
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-beige-muted mb-1 uppercase">Target Step</label>
                        <select
                          value={orderStatusUpdate}
                          disabled={isTerminal}
                          onChange={(e) => setOrderStatusUpdate(e.target.value)}
                          className="w-full bg-surface border border-border text-beige text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold cursor-pointer disabled:opacity-60"
                        >
                          {validTargets.map((st) => (
                            <option key={st} value={st}>
                              {st === 'pending'
                                ? 'Pending'
                                : st === 'paymentpending'
                                ? 'Payment Pending'
                                : st === 'confirmed'
                                ? 'Confirmed'
                                : st === 'processing'
                                ? 'Packed & Processing'
                                : st === 'shipped'
                                ? 'Shipped / Dispatched'
                                : st === 'outfordelivery'
                                ? 'Out for Delivery'
                                : st === 'delivered'
                                ? 'Delivered'
                                : st === 'cancelled'
                                ? 'Cancelled (Pre-Ship Only)'
                                : 'Refunded'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-beige-muted mb-1 uppercase">Courier Partner</label>
                        <select
                          value={orderCourierUpdate}
                          onChange={(e) => setOrderCourierUpdate(e.target.value)}
                          className="w-full bg-surface border border-border text-beige text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold"
                        >
                          <option value="NEXUS White-Glove">NEXUS White-Glove</option>
                          <option value="BlueDart Express">BlueDart Express</option>
                          <option value="Delhivery Air">Delhivery Air</option>
                          <option value="DTDC Premium">DTDC Premium</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-beige-muted mb-1 uppercase">Tracking ID</label>
                        <input
                          type="text"
                          placeholder="e.g. BLUEDART-84920"
                          value={orderTrackingUpdate}
                          onChange={(e) => setOrderTrackingUpdate(e.target.value)}
                          className="w-full bg-surface border border-border text-beige text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold font-mono"
                        />
                      </div>
                    </div>

                    {orderStatusUpdate === 'cancelled' && (
                      <div>
                        <label className="block text-[11px] text-beige-muted mb-1 uppercase">Cancellation Reason</label>
                        <input
                          type="text"
                          placeholder="Reason for pre-shipment cancellation..."
                          value={orderCancelReason}
                          onChange={(e) => setOrderCancelReason(e.target.value)}
                          className="w-full bg-surface border border-border text-beige text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-gold"
                        />
                      </div>
                    )}

                    {inspectOrder.returnStatus && safeStr(inspectOrder.returnStatus) !== 'none' && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
                        <span>
                          Return Workflow Active: <strong>{inspectOrder.returnStatus}</strong>
                          {inspectOrder.refundReference ? ` • Ref ${inspectOrder.refundReference}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setInspectOrder(null)
                            setActiveTab('returns')
                          }}
                          className="font-bold text-gold hover:underline shrink-0"
                        >
                          Open Returns Desk →
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInvoiceModal(true)}
                        className="text-xs font-semibold flex items-center gap-1.5 border-gold/40 text-gold hover:bg-gold/10"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Official Tax Invoice
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveOrderStatus}
                        isLoading={isUpdatingOrder}
                        disabled={isTerminal && orderTrackingUpdate === (inspectOrder.trackingNumber ?? '')}
                        className="text-xs font-semibold"
                      >
                        Save Step &amp; Tracking
                      </Button>
                    </div>
                  </div>
                </>
              )
            })()}

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

      {/* ─── MODAL: PRINTABLE TAX INVOICE ───────────────────────────────── */}
      {showInvoiceModal && inspectOrder && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            className="bg-surface border border-gold/40 rounded-2xl max-w-3xl w-full shadow-2xl animate-slide-up my-4 sm:my-8 text-beige overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Header / Actions toolbar */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 sm:px-8 py-4">
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Order</span>
                </Button>
                <div className="flex items-center gap-2 pl-1">
                  <FileText className="w-4 h-4 text-gold" />
                  <h3 className="font-serif text-base sm:text-lg font-bold text-beige">Official GST Tax Invoice</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoice(inspectOrder)}
                  className="flex items-center gap-1.5 text-xs font-semibold border-gold/50 text-beige hover:border-gold"
                >
                  <Download className="w-3.5 h-3.5 text-gold" />
                  <span>Download Invoice</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handlePrintInvoice(inspectOrder)}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  aria-label="Close tax invoice"
                  className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">

            {/* Invoice Printable Body */}
            <div className="space-y-6 text-sm bg-surface-2/40 print:bg-transparent p-6 rounded-2xl border border-border print:border-none">
              {/* Brand & Store Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border/80 pb-6">
                <div>
                  <h1 className="font-serif text-2xl font-bold tracking-wider gold-text-gradient print:text-black">
                    NEXUS LUXURY ATELIER
                  </h1>
                  <p className="text-xs text-beige-muted mt-1 print:text-gray-600">
                    High-End Couture, Horology & Fine Living
                  </p>
                  <div className="text-xs text-beige/80 mt-2 space-y-0.5 print:text-gray-700">
                    <p className="font-medium">2 Maruti Chock, Rajkot, Gujarat, 360005, India</p>
                    <p>Email: nexustech1003@gmail.com | Helpline: +91 12345 67890</p>
                    <p className="font-mono text-[11px] text-gold print:text-black font-semibold">
                      GSTIN: 24AAACN1234F1Z5 • CIN: U74999GJ2026PTC109842
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <div className="inline-block bg-gold/15 text-gold border border-gold/30 px-3 py-1 rounded text-xs font-bold uppercase font-mono print:border-black print:text-black">
                    Tax Invoice / Bill of Supply
                  </div>
                  <div className="text-xs mt-2 space-y-0.5 font-mono print:text-gray-700">
                    <p>
                      Invoice #: <span className="font-bold text-beige print:text-black">INV-{inspectOrder.orderNumber}</span>
                    </p>
                    <p>Date: {formatDate(inspectOrder.createdAt)}</p>
                    <p>Place of Supply: Gujarat (State Code: 24)</p>
                  </div>
                </div>
              </div>

              {/* Bill To & Ship To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-surface rounded-xl border border-border print:border-gray-300">
                  <p className="font-semibold text-gold uppercase tracking-wider text-[11px] mb-1 print:text-black">
                    Billed & Shipped To
                  </p>
                  <p className="text-sm font-bold text-beige print:text-black">{inspectOrder.shippingName}</p>
                  <p className="text-beige-muted print:text-gray-600 mt-1 leading-relaxed">
                    {inspectOrder.shippingAddressLine1}
                    {inspectOrder.shippingAddressLine2 ? `, ${inspectOrder.shippingAddressLine2}` : ''}
                    <br />
                    {inspectOrder.shippingCity}, {inspectOrder.shippingState} - {inspectOrder.shippingPinCode}
                  </p>
                  <p className="text-beige font-mono mt-1 print:text-black">Mobile: {inspectOrder.shippingPhone}</p>
                </div>

                <div className="p-4 bg-surface rounded-xl border border-border print:border-gray-300 space-y-1.5">
                  <p className="font-semibold text-gold uppercase tracking-wider text-[11px] mb-1 print:text-black">
                    Payment & Logistics Info
                  </p>
                  <div className="flex justify-between">
                    <span className="text-beige-muted print:text-gray-600">Payment Mode:</span>
                    <span className="font-bold text-beige uppercase print:text-black">{inspectOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-beige-muted print:text-gray-600">Payment Status:</span>
                    <span className="font-bold text-emerald-700 print:text-black uppercase">{inspectOrder.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-beige-muted print:text-gray-600">Courier Tracking:</span>
                    <span className="font-mono text-gold print:text-black font-semibold">
                      {inspectOrder.trackingNumber || 'Pending Courier Dispatch'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-border rounded-xl print:border-gray-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 text-beige-muted uppercase text-[10px] border-b border-border print:bg-gray-100 print:text-black print:border-gray-300">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">HSN Code</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">GST (18%)</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border print:divide-gray-200">
                    {inspectOrder.items?.map((item, idx) => {
                      const netRate = item.unitPrice / 1.18
                      const gstPerItem = item.unitPrice - netRate
                      return (
                        <tr key={item.id} className="text-beige print:text-black">
                          <td className="py-2.5 px-3 font-mono text-beige-muted print:text-gray-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium">
                            {item.productName}
                            {(item.product?.slug || (item as any).productSlug) && (
                              <span className="block text-[10px] text-beige-muted font-mono print:text-gray-500">
                                SKU: {item.product?.slug || (item as any).productSlug}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-beige-muted print:text-gray-600">
                            6205 / 9102
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(netRate)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-beige-muted print:text-gray-600">
                            {formatCurrency(gstPerItem * item.quantity)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-beige-muted print:text-gray-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-beige print:text-black">
                      {formatCurrency(((inspectOrder.totalAmount ?? inspectOrder.total ?? 0) / 1.18))}
                    </span>
                  </div>
                  <div className="flex justify-between text-beige-muted print:text-gray-600">
                    <span>CGST (9.0%):</span>
                    <span className="font-mono text-beige print:text-black">
                      {formatCurrency(((inspectOrder.totalAmount ?? inspectOrder.total ?? 0) * 0.09) / 1.18)}
                    </span>
                  </div>
                  <div className="flex justify-between text-beige-muted print:text-gray-600">
                    <span>SGST (9.0%):</span>
                    <span className="font-mono text-beige print:text-black">
                      {formatCurrency(((inspectOrder.totalAmount ?? inspectOrder.total ?? 0) * 0.09) / 1.18)}
                    </span>
                  </div>
                  <div className="flex justify-between text-beige-muted print:text-gray-600">
                    <span>Doorstep Delivery Charges:</span>
                    <span className="font-semibold text-emerald-700 print:text-black uppercase">
                      {(inspectOrder.shippingCost ?? 0) === 0
                        ? 'FREE'
                        : formatCurrency(inspectOrder.shippingCost ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-beige-muted print:text-gray-600">
                    <span>Platform Fee:</span>
                    <span className="font-mono text-beige print:text-black">
                      {formatCurrency(inspectOrder.platformFee ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-gold print:text-black print:border-gray-400">
                    <span>Total Invoice Value:</span>
                    <span className="font-serif text-base">
                      {formatCurrency(inspectOrder.totalAmount ?? inspectOrder.total ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom declaration */}
              <div className="border-t border-border pt-4 text-[11px] text-beige-muted print:text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-3">
                <p>
                  This is a computer generated tax invoice issued by NEXUS E-Commerce Retail Pvt. Ltd. No physical signature required.
                </p>
                <div className="text-right font-serif text-xs font-semibold text-beige print:text-black">
                  For NEXUS LUXURY ATELIER
                </div>
              </div>
            </div>

            {/* Bottom Back & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInvoiceModal(false)}
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Order Details</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadInvoice(inspectOrder)}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-gold" />
                  <span>Download Invoice</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handlePrintInvoice(inspectOrder)}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </Button>
              </div>
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
    <>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-beige-muted">Loading Control Center...</div>}>
        <AdminContent />
      </Suspense>
      <AuthModal />
      <Toaster position="top-right" />
    </>
  )
}
