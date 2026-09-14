'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { useAuthModalStore } from '@/store/authModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { cart, clearCart } = useCartStore()
  const { open: openAuthModal } = useAuthModalStore()

  const [loading, setLoading] = React.useState(false)
  const [address, setAddress] = React.useState({
    fullName: user ? `${user.firstName} ${user.lastName}` : '',
    phone: user?.phone ?? '',
    line1: '',
    city: '',
    state: '',
    pinCode: '',
  })
  const [paymentMethod, setPaymentMethod] = React.useState<'cod' | 'razorpay'>('cod')

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

  if (!cart || cart.items.length === 0) {
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
    if (!address.fullName || !address.phone || !address.line1 || !address.city || !address.pinCode) {
      toast.error('Please complete all shipping address fields.')
      return
    }

    setLoading(true)
    try {
      // 1. Create or save address
      const addrRes = await api.post('/api/addresses', {
        fullName: address.fullName,
        phoneNumber: address.phone,
        addressLine1: address.line1,
        city: address.city,
        state: address.state || 'State',
        pinCode: address.pinCode,
        country: 'India',
        addressType: 'Home',
        isDefault: true,
      })

      // 2. Place order
      const orderRes = await api.post('/api/orders', {
        addressId: addrRes.data.id,
        paymentMethod: paymentMethod === 'cod' ? 0 : 1, // Order Enums: COD=0, Razorpay=1
        couponCode: cart.couponCode ?? null,
      })

      await clearCart()
      toast.success('Order placed successfully!')
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
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="font-serif text-xl font-semibold text-beige border-b border-border pb-3">
              Shipping Destination
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="Lord / Lady Full Name"
                value={address.fullName}
                onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                required
              />
              <Input
                label="Contact Mobile"
                placeholder="+91 98765 43210"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                required
              />
            </div>

            <Input
              label="Street Address / Residence"
              placeholder="Apartment, Suite, Unit, Street"
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                placeholder="Mumbai"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                required
              />
              <Input
                label="State"
                placeholder="Maharashtra"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                required
              />
              <Input
                label="PIN Code"
                placeholder="400001"
                value={address.pinCode}
                onChange={(e) => setAddress({ ...address, pinCode: e.target.value })}
                required
              />
            </div>
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
                    <p className="text-xs text-beige-muted">Pay securely at your doorstep</p>
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
                    <p className="text-sm font-medium text-beige">Online Payment (UPI, Cards, Netbanking)</p>
                    <p className="text-xs text-beige-muted">Instant processing with full buyer protection</p>
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

            <div className="divide-y divide-border text-sm">
              {cart.items.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between gap-2">
                  <span className="text-beige truncate max-w-[180px]">
                    {item.product?.name ?? 'Product'} × {item.quantity}
                  </span>
                  <span className="font-medium text-beige">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-beige-muted">
                <span>Subtotal</span>
                <span className="text-beige">{formatCurrency(cart.subtotal)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatCurrency(cart.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-beige-muted">
                <span>White-Glove Shipping</span>
                <span className="text-success font-medium">COMPLIMENTARY</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-border">
                <span className="font-semibold text-beige">Total Payable</span>
                <span className="font-serif text-2xl font-bold gold-text-gradient">
                  {formatCurrency(cart.total)}
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
              256-bit Encrypted Checkout • Satisfaction Guaranteed
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
