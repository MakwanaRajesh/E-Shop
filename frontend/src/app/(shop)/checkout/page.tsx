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
import type { Address } from '@/types'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { cart, clearCart, fetchCart } = useCartStore()
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
  const total = cart?.total ?? subtotal

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
      let finalAddressId: string | null = selectedAddressId !== 'new' ? selectedAddressId : null
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

      // 2. Place order with both String & Int friendly PaymentMethod
      const orderRes = await api.post('/api/orders', {
        addressId: finalAddressId,
        paymentMethod: paymentMethod === 'cod' ? 'CashOnDelivery' : 'Razorpay',
        couponCode: cart?.couponCode ?? null,
        items: itemsPayload,
        shippingAddress: shippingAddressPayload,
      })

      await clearCart()
      toast.success('Order placed successfully! 🎉', {
        duration: 5000,
      })
      router.push(`/account?orderSuccess=${orderRes.data.orderNumber ?? orderRes.data.id}`)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to place order'
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
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="font-serif text-xl font-semibold text-beige border-b border-border pb-3">
              Payment Method
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod' ? 'border-gold bg-gold/10' : 'border-border bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-gold w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-beige">Cash on Delivery (COD)</p>
                    <p className="text-xs text-beige-muted">Pay comfortably in cash upon luxury doorstep delivery</p>
                  </div>
                </div>
                <CheckCircle2 className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-gold' : 'text-transparent'}`} />
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'razorpay' ? 'border-gold bg-gold/10' : 'border-border bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="accent-gold w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-beige">Prepaid Online Payment (UPI / Cards / Netbanking)</p>
                    <p className="text-xs text-beige-muted">Secured online payment with instant order confirmation</p>
                  </div>
                </div>
                <CheckCircle2 className={`w-5 h-5 ${paymentMethod === 'razorpay' ? 'text-gold' : 'text-transparent'}`} />
              </label>
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

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-beige-muted">
                <span>Subtotal</span>
                <span className="text-beige">{formatCurrency(subtotal)}</span>
              </div>
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
