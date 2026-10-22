'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ShieldCheck, ArrowRight, ShoppingBag, MapPin, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import { CouponSection } from '@/components/cart/CouponSection'
import type { Address } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { cart, clearCart, fetchCart, appliedCoupon } = useCartStore()
  const { open: openAuthModal } = useAuthModalStore()

  const [loading, setLoading] = React.useState(false)
  const [savedAddresses, setSavedAddresses] = React.useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | 'new'>('new')
  const [useNewAddress, setUseNewAddress] = React.useState(false)

  const [newAddress, setNewAddress] = React.useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phone ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pinCode: '',
  })
  const [paymentMethod, setPaymentMethod] = React.useState<'cod' | 'razorpay'>('cod')

  // Load cart and saved addresses
  React.useEffect(() => {
    if (!isAuthenticated) return
    fetchCart()
    const loadAddresses = async () => {
      try {
        const { data } = await api.get<Address[]>('/api/addresses')
        if (data && data.length > 0) {
          setSavedAddresses(data)
          const defaultAddr = data.find((a) => a.isDefault) ?? data[0]
          setSelectedAddressId(defaultAddr.id)
          setUseNewAddress(false)
        } else {
          setUseNewAddress(true)
          setSelectedAddressId('new')
        }
      } catch {
        setUseNewAddress(true)
        setSelectedAddressId('new')
      }
    }
    loadAddresses()
  }, [isAuthenticated, fetchCart])

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h1 className="font-serif text-3xl font-bold text-beige mb-3">Checkout</h1>
        <p className="text-beige-muted mb-8">Please sign in to proceed with your luxury order.</p>
        <Button variant="primary" size="lg" onClick={() => openAuthModal('login', '/checkout')}>
          Sign In to NEXUS
        </Button>
      </div>
    )
  }

  const items = cart?.items ?? []
  const subtotal = cart?.subtotal ?? (cart as any)?.subTotal ?? 0
  const discount = appliedCoupon?.discountAmount ?? (cart as any)?.discountAmount ?? 0
  const total = Math.max(0, subtotal - discount)

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-gold/40 mx-auto mb-4" />
        <h1 className="font-serif text-3xl font-bold text-beige mb-3">Your Cart is Empty</h1>
        <p className="text-beige-muted mb-8">Add exquisite products from our collections before checking out.</p>
        <Button variant="primary" size="md" asChild>
          <Link href="/products">Browse Catalog</Link>
        </Button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let finalAddressId: string | null = (selectedAddressId && selectedAddressId !== 'new') ? selectedAddressId : null
      let shippingAddressPayload: any = null

      if (useNewAddress || selectedAddressId === 'new' || !finalAddressId) {
        if (!newAddress.fullName || !newAddress.phone || !newAddress.line1 || !newAddress.city || !newAddress.pinCode) {
          toast.error('Please fill in all required shipping address fields.')
          setLoading(false)
          return
        }

        shippingAddressPayload = {
          fullName: newAddress.fullName.trim(),
          phoneNumber: newAddress.phone.trim(),
          addressLine1: newAddress.line1.trim(),
          addressLine2: newAddress.line2?.trim() || null,
          city: newAddress.city.trim(),
          state: newAddress.state.trim() || 'State',
          pinCode: newAddress.pinCode.trim(),
          country: 'India',
          addressType: 'Home',
          isDefault: savedAddresses.length === 0,
        }

        try {
          const addrRes = await api.post('/api/addresses', shippingAddressPayload)
          if (addrRes.data?.id) {
            finalAddressId = addrRes.data.id
          }
        } catch {
          // Will be auto-created by backend with shippingAddress payload
        }
      }

      // Prepare items payload so DB cart and guest cart are 100% synchronized
      const itemsPayload = items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        quantity: i.quantity || 1,
      }))

      // 2. Place order with COD or Online
      const orderRes = await api.post('/api/orders', {
        addressId: finalAddressId || null,
        paymentMethod: paymentMethod === 'cod' ? 'CashOnDelivery' : 'Razorpay',
        couponCode: appliedCoupon?.code ?? cart?.couponCode ?? null,
        items: itemsPayload,
        shippingAddress: shippingAddressPayload,
      })

      await clearCart()
      toast.success('Order placed successfully! 🎉', {
        duration: 5000,
      })
      router.push(`/account?orderSuccess=${orderRes.data.orderNumber ?? orderRes.data.id}`)
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string; detail?: string; title?: string } }; message?: string }
      const msg = apiErr.response?.data?.message || apiErr.response?.data?.detail || apiErr.response?.data?.title || (err as Error)?.message || 'Failed to place order'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige mb-8">Secure Checkout</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Shipping details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-xl font-semibold text-beige flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gold" />
                Delivery Address
              </h2>
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseNewAddress(!useNewAddress)}
                  className="text-xs text-gold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {useNewAddress ? 'Select Saved Address' : 'Deliver to New Address'}
                </button>
              )}
            </div>

            {/* Existing Saved Addresses */}
            {!useNewAddress && savedAddresses.length > 0 && (
              <div className="space-y-3">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id
                  return (
                    <label
                      key={addr.id}
                      className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? 'border-gold bg-gold/10' : 'border-border bg-surface-2 hover:border-gold/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="selectedAddress"
                          value={addr.id}
                          checked={isSelected}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="accent-gold mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-beige text-sm">{addr.fullName}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] uppercase font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-beige-muted mt-1 leading-relaxed">
                            {addr.addressLine1}
                            {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}, {addr.state} - {addr.pinCode ?? addr.postalCode}
                          </p>
                          <p className="text-xs text-gold/80 mt-1 font-mono">
                            Phone: {addr.phoneNumber ?? addr.phone}
                          </p>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            {/* New Address Form */}
            {(useNewAddress || savedAddresses.length === 0) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="Recipient's Name"
                    value={newAddress.fullName}
                    onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                    required
                  />
                  <Input
                    label="Contact Phone"
                    placeholder="+91 98765 43210"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Street Address / House No."
                  placeholder="Flat, House no., Building, Street"
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                  required
                />

                <Input
                  label="Apartment, Landmark, Area (Optional)"
                  placeholder="Near City Landmark"
                  value={newAddress.line2}
                  onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    placeholder="Mumbai"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    required
                  />
                  <Input
                    label="State"
                    placeholder="Maharashtra"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    required
                  />
                  <Input
                    label="PIN Code"
                    placeholder="400001"
                    value={newAddress.pinCode}
                    onChange={(e) => setNewAddress({ ...newAddress, pinCode: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Selection */}
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-serif text-xl font-semibold text-beige">
                Payment Method
              </h2>
              <span className="text-xs text-gold font-mono font-medium flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-success" />
                100% Encrypted & Safe
              </span>
            </div>

            <div className="space-y-3">
              {/* Cash On Delivery (COD) - Active & Primary */}
              <label
                className={`flex items-start sm:items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-gold bg-gold/10 shadow-md shadow-gold/5'
                    : 'border-border bg-surface-2 hover:border-gold/30'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-gold w-4 h-4 mt-0.5 sm:mt-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-beige">Cash on Delivery (COD)</p>
                      <span className="text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shadow-emerald-500/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                        Available across India
                      </span>
                    </div>
                    <p className="text-xs text-beige-muted mt-0.5">
                      Pay with Cash or UPI QR to the delivery associate upon white-glove doorstep arrival.
                    </p>
                  </div>
                </div>
                <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${paymentMethod === 'cod' ? 'text-gold' : 'text-transparent'}`} />
              </label>

              {/* Online Payment (UPI / Cards / Net Banking) - Currently Unavailable */}
              <div
                className="flex items-start sm:items-center justify-between p-4 rounded-xl border border-border/60 bg-surface-2/40 opacity-70 cursor-not-allowed select-none"
                onClick={() => toast('Online payment gateway is temporarily undergoing banking maintenance. Please use Cash on Delivery (COD).', { icon: '⚠️' })}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    disabled
                    checked={false}
                    className="w-4 h-4 mt-0.5 sm:mt-0 cursor-not-allowed opacity-50"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-beige-muted">Prepaid Online (UPI / Cards / Net Banking)</p>
                      <span className="text-[10px] uppercase font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Currently Unavailable
                      </span>
                    </div>
                    <p className="text-xs text-beige-muted/70 mt-0.5">
                      Online gateway undergoing routine maintenance. Please select Cash on Delivery above to place your order.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Wire / EMI - Currently Unavailable */}
              <div
                className="flex items-start sm:items-center justify-between p-4 rounded-xl border border-border/40 bg-surface-2/20 opacity-50 cursor-not-allowed select-none"
                onClick={() => toast('Direct Bank Transfer is currently unavailable. Please place your order using Cash on Delivery (COD).', { icon: '⚠️' })}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <input
                    type="radio"
                    disabled
                    checked={false}
                    className="w-4 h-4 mt-0.5 sm:mt-0 cursor-not-allowed opacity-50"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-beige-muted/80">Direct Bank Wire / EMI</p>
                      <span className="text-[10px] uppercase font-bold bg-border text-beige-muted px-2 py-0.5 rounded-full">
                        Currently Unavailable
                      </span>
                    </div>
                    <p className="text-xs text-beige-muted/60 mt-0.5">
                      Direct wire transfers are reserved for corporate accounts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Column */}
        <div>
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-5 sticky top-24">
            <h3 className="font-serif text-lg font-semibold text-beige">Order Summary</h3>

            <div className="divide-y divide-border text-sm max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-beige truncate max-w-[170px] text-xs">
                      {item.product?.name ?? item.productName ?? 'Product'}
                    </span>
                    <span className="text-beige-muted text-xs">× {item.quantity}</span>
                  </div>
                  <span className="font-medium text-beige text-xs flex-shrink-0">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            {/* Coupons & Promo Codes */}
            <CouponSection compact />

            <div className="h-px bg-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-beige-muted">
                <span>Subtotal</span>
                <span className="text-beige font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-beige-muted">
                <span>Doorstep Delivery</span>
                <span className="text-success font-medium">FREE</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-border">
                <span className="font-semibold text-beige">Total Payable</span>
                <span className="font-serif text-2xl font-bold gold-text-gradient">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              isLoading={loading}
            >
              Place Order
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-[11px] text-beige-muted/60 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gold" />
              256-bit Encrypted Checkout • Guarantee of Authenticity
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
