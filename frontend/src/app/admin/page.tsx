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
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import type { DashboardStats, Order, ProductListItem, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

const safeStr = (s?: string | null) => (s ?? '').toLowerCase().trim()

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
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Navigation state
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'products' | 'categories' | 'orders' | 'security' | 'coupons' | 'customers' | 'settings'
  >('overview')

  // Main data states
  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [orders, setOrders] = React.useState<Order[]>([])
  const [products, setProducts] = React.useState<ProductListItem[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [coupons, setCoupons] = React.useState<CouponDto[]>([])
  const [customers, setCustomers] = React.useState<CustomerDto[]>([])
  const [alerts, setAlerts] = React.useState<SecurityAlertDto[]>([])
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

  const isAdmin = user?.role === 'admin' || (user?.role as unknown as string) === 'Admin'

  // Fetch all admin data
  const fetchAllData = React.useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return
    setLoading(true)
    try {
      const [dashRes, ordRes, prodRes, catRes, coupRes, custRes, alertRes] = await Promise.all([
        api.get<DashboardStats>('/api/admin/dashboard').catch(() => null),
        api.get<any>('/api/admin/orders?pageSize=100').catch(() => null),
        api.get<any>('/api/admin/products?pageSize=100').catch(() => null),
        api.get<Category[]>('/api/categories').catch(() => null),
        api.get<CouponDto[]>('/api/coupons').catch(() => null),
        api.get<any>('/api/admin/customers?pageSize=100').catch(() => null),
        api.get<any>('/api/admin/security/alerts').catch(() => null),
      ])

      if (dashRes?.data) setStats(dashRes.data)

      const ordList = ordRes?.data?.items ?? ordRes?.data?.Items ?? ordRes?.data?.data ?? []
      setOrders(Array.isArray(ordList) ? ordList : [])

      const prodList = prodRes?.data?.items ?? prodRes?.data?.Items ?? prodRes?.data?.data ?? []
      setProducts(Array.isArray(prodList) ? prodList : [])

      if (catRes?.data) {
        setCategories(catRes.data)
        if (catRes.data.length > 0) {
          if (!newProd.categoryId) {
            setNewProd((p) => ({ ...p, categoryId: catRes.data[0].id }))
          }
          if (!bulkTargetCategoryId) {
            // Pick first child category or first category
            const firstChild = catRes.data[0].children?.[0]?.id ?? catRes.data[0].id
            setBulkTargetCategoryId(firstChild)
          }
        }
      }

      if (coupRes?.data) setCoupons(coupRes.data)

      const custList = custRes?.data?.items ?? custRes?.data?.Items ?? custRes?.data?.data ?? []
      setCustomers(Array.isArray(custList) ? custList : [])

      if (alertRes?.data) {
        setAlerts(alertRes.data.alerts ?? alertRes.data.Alerts ?? [])
        setUnreadAlerts(alertRes.data.unreadCount ?? alertRes.data.UnreadCount ?? 0)
      }
    } catch {
      toast.error('Failed to load portal data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, isAdmin, newProd.categoryId, bulkTargetCategoryId])

  React.useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

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
        parentId: newCat.parentId ? newCat.parentId : null,
        sortOrder: categories.length + 1,
      })
      toast.success('Category created!')
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
      const matchesStatus =
        orderStatusFilter === 'all' || safeStr(o.status) === safeStr(orderStatusFilter)
      const matchesSearch =
        !orderSearch ||
        safeStr(o.orderNumber).includes(safeStr(orderSearch)) ||
        (o.shippingName && safeStr(o.shippingName).includes(safeStr(orderSearch))) ||
        (o.shippingPhone && o.shippingPhone.includes(orderSearch))
      return matchesStatus && matchesSearch
    })
  }, [orders, orderStatusFilter, orderSearch])

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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-beige-muted">
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-5 h-5 animate-spin text-gold" />
          <span className="font-mono text-sm">Loading Nexus Control Center...</span>
        </div>
      </div>
    )
  }

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
              {
                id: 'security',
                label: 'Threats & Suspicious',
                icon: ShieldAlert,
                count: unreadAlerts,
                isThreat: unreadAlerts > 0,
              },
              { id: 'coupons', label: 'Promotions & Coupons', icon: Ticket, count: coupons.length },
              { id: 'customers', label: 'Clientele CRM', icon: Users, count: customers.length },
              { id: 'settings', label: 'Store Settings', icon: Settings },
            ].map(({ id, label, icon: Icon, count, isThreat }) => {
              const isActive = activeTab === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gold text-background font-semibold shadow-md shadow-gold/10'
                      : isThreat
                      ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15'
                      : 'text-beige-muted hover:text-beige hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isThreat && !isActive ? 'text-rose-400 animate-pulse' : ''}`} />
                    <span>{label}</span>
                  </div>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-background/20 text-background font-bold'
                          : isThreat
                          ? 'bg-rose-500 text-white font-bold animate-pulse'
                          : 'bg-surface-2 text-beige-muted'
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
        {/* Top Control Bar (Desktop & Mobile) */}
        <header className="border-b border-border bg-surface px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 md:hidden">
              <Shield className="w-5 h-5 text-gold" />
              <span className="font-serif font-bold text-beige text-sm">NEXUS ADMIN</span>
            </div>
            <div className="hidden md:flex items-center gap-2.5 text-xs text-beige-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-beige/80">Nexus Core Engine Active</span>
              <span className="text-border">•</span>
              <span className="text-beige-muted">2 Maruti Chock, Rajkot</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Threat Alert Bell */}
            <button
              onClick={() => setActiveTab('security')}
              className={`relative p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs ${
                unreadAlerts > 0
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-surface-2 border-border text-beige-muted hover:text-beige hover:border-gold/40'
              }`}
              title="Security Threats & Suspicious Notifications"
            >
              <Bell className="w-4 h-4 text-gold" />
              {unreadAlerts > 0 ? (
                <span className="font-bold text-rose-300 font-mono flex items-center gap-1">
                  <span>{unreadAlerts}</span>
                  <span className="hidden sm:inline">Threats</span>
                </span>
              ) : (
                <span className="hidden sm:inline text-beige-muted font-mono text-[11px]">System Normal</span>
              )}
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link href="/" target="_blank" className="flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center gap-2 p-3 overflow-x-auto border-b border-border bg-surface-2 text-xs">
          {['overview', 'products', 'categories', 'orders', 'security', 'coupons', 'customers', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap font-medium ${
                activeTab === tab
                  ? 'bg-gold text-background font-bold'
                  : tab === 'security' && unreadAlerts > 0
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-beige-muted'
              }`}
            >
              {tab === 'security' && unreadAlerts > 0 ? `Threats (${unreadAlerts})` : tab}
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
                        <tr
                          key={ord.id}
                          className={`transition-colors ${
                            ord.status?.toString().toLowerCase() === 'cancelled'
                              ? 'bg-rose-950/10 hover:bg-rose-950/20'
                              : ord.status?.toString().toLowerCase() === 'delivered'
                              ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                              : 'hover:bg-surface-2/50'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono text-gold font-bold">{ord.orderNumber}</td>
                          <td className="py-3.5 px-4 text-beige font-medium">{ord.shippingName ?? 'Client'}</td>
                          <td className="py-3.5 px-4 font-medium">{formatCurrency(ord.totalAmount ?? ord.total ?? 0)}</td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={ord.status} size="sm" />
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

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                  {[
                    { id: 'all', label: 'All Orders', dot: 'bg-gold' },
                    { id: 'delivered', label: 'Delivered', dot: 'bg-emerald-400' },
                    { id: 'shipped', label: 'Shipped', dot: 'bg-sky-400' },
                    { id: 'confirmed', label: 'Confirmed', dot: 'bg-gold' },
                    { id: 'pending', label: 'Pending', dot: 'bg-amber-400' },
                    { id: 'cancelled', label: 'Cancelled', dot: 'bg-rose-500' },
                  ].map((tab) => {
                    const isSelected = orderStatusFilter === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setOrderStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-gold text-background shadow-md shadow-gold/20'
                            : 'bg-surface border border-border text-beige-muted hover:text-beige hover:border-gold/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-background' : tab.dot}`} />
                        {tab.label}
                      </button>
                    )
                  })}
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
                      {filteredOrders.map((ord) => {
                        const isCanc = ord.status?.toString().toLowerCase() === 'cancelled'
                        const isDeliv = ord.status?.toString().toLowerCase() === 'delivered'

                        return (
                          <tr
                            key={ord.id}
                            className={`transition-colors ${
                              isCanc
                                ? 'bg-rose-950/15 hover:bg-rose-950/25 border-l-2 border-l-rose-500'
                                : isDeliv
                                ? 'bg-emerald-950/10 hover:bg-emerald-950/20 border-l-2 border-l-emerald-500'
                                : 'hover:bg-surface-2/40'
                            }`}
                          >
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
                              <StatusBadge status={ord.status} size="sm" />
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
                        )
                      })}
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

              {/* Threat KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-surface border border-rose-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-rose-400">Active Unresolved</span>
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-rose-200">{unreadAlerts}</p>
                  <p className="text-xs text-rose-400/80 mt-1">Requires administrative review</p>
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
                    <Package className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {products.filter((p) => (p.stock ?? p.stockQuantity ?? 0) <= 2).length}
                  </p>
                  <p className="text-xs text-beige-muted mt-1">Stock depleted to ≤ 2 units</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-semibold text-beige-muted">Hoarding / Probes</span>
                    <AlertTriangle className="w-5 h-5 text-sky-400" />
                  </div>
                  <p className="font-serif text-3xl font-bold text-beige">
                    {alerts.filter((a) => a.category.includes('Hoarding') || a.category.includes('Velocity') || a.category.includes('Brute')).length}
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
                      ? 'border-rose-500/50 bg-rose-950/15'
                      : isHigh
                      ? 'border-amber-500/50 bg-amber-950/15'
                      : isWarn
                      ? 'border-yellow-500/40 bg-yellow-950/10'
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
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isHigh
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : isWarn
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
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
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-950/30 px-2 py-0.5 rounded border border-rose-500/30 animate-pulse">
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
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                            <span>
                              <strong>Resolution Notes:</strong> {alert.actionTaken ?? 'Reviewed and verified safe.'}
                            </span>
                            <span className="text-[11px] text-emerald-400 font-mono">Archived in Security Audit Log</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                            {alert.referenceId && alert.referenceId.startsWith('USER-') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserSecurity(alert.referenceId!.replace('USER-', ''))}
                                className="text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                              >
                                Suspend / Block Account
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveAlert(alert.id, 'Investigated and cleared by admin')}
                              className="text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 flex items-center gap-1.5"
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
                    <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h3 className="font-serif text-lg font-bold text-beige">Zero Security Threats Detected</h3>
                    <p className="text-xs text-beige-muted mt-1">All gateway transactions and inventory are running smoothly.</p>
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
                              {row.imageUrl && (
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
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-rose-200">Order Cancelled</p>
                  <p className="text-rose-300/80 mt-0.5">This order has been cancelled. No shipment or fulfillment action is required.</p>
                </div>
              </div>
            )}
            {inspectOrder.status?.toString().toLowerCase() === 'delivered' && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-200">Order Completed & Delivered</p>
                  <p className="text-emerald-300/80 mt-0.5">Customer has received package. Transaction is marked complete.</p>
                </div>
              </div>
            )}

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

      {/* ─── MODAL: PRINTABLE TAX INVOICE ───────────────────────────────── */}
      {showInvoiceModal && inspectOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-gold/40 rounded-2xl max-w-3xl w-full p-6 sm:p-10 space-y-6 shadow-2xl animate-slide-up my-8 text-beige print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
            {/* Header / Actions toolbar */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold" />
                <h3 className="font-serif text-lg font-bold text-beige">Official GST Tax Invoice</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </Button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-beige-muted hover:text-beige"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

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
                    <span className="font-bold text-emerald-400 print:text-black uppercase">{inspectOrder.paymentStatus}</span>
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
                    <span>White-Glove Courier Delivery:</span>
                    <span className="font-semibold text-emerald-400 print:text-black uppercase">Complimentary</span>
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
