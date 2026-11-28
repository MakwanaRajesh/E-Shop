import Link from 'next/link'
import { Truck, Clock, MapPin, ShieldCheck, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const metadata = {
  title: 'White-Glove Shipping',
}

export default function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-surface border border-border rounded-3xl p-7 sm:p-10 space-y-4 shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-3 py-1 rounded-full">
          <Truck className="w-3.5 h-3.5" />
          Concierge Fulfillment
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige">White-Glove Shipping</h1>
        <p className="text-sm text-beige-muted leading-relaxed">
          Every NEXUS order is quality-inspected, carefully packed at our Rajkot atelier dispatch center, and delivered straight to your doorstep across India.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-surface border border-gold/40 rounded-2xl p-6 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-gold font-semibold text-xs uppercase tracking-wider">
            <PackageCheck className="w-4 h-4" />
            Free Delivery Eligibility
          </div>
          <p className="font-serif text-xl font-bold text-beige">FREE above ₹999 &amp; 1st Order</p>
          <p className="text-xs text-beige-muted leading-relaxed">
            New customers enjoy complimentary delivery on their very first order regardless of cart value. All orders of ₹999 or more also ship free; orders below ₹999 incur a flat ₹99 delivery charge (plus ₹9 platform fee per order).
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-gold font-semibold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            Delivery Timelines
          </div>
          <p className="font-serif text-xl font-bold text-beige">2–4 Business Days Across India</p>
          <p className="text-xs text-beige-muted leading-relaxed">
            Confirmed orders are dispatched within 24 hours. Courier tracking numbers and milestone updates (`Order Placed`, `Confirmed`, `Dispatched`, `Delivered`) update live in My Orders.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="font-serif text-lg font-bold text-beige flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" />
          Packaging, PIN Verification &amp; Dispatch Center
        </h2>
        <ul className="text-sm text-beige-muted space-y-2 list-disc list-inside leading-relaxed">
          <li>Multi-point garment and accessory inspection before sealing.</li>
          <li>Cash on Delivery supported on serviceable 6-digit Indian PIN codes.</li>
          <li className="flex items-start gap-2 list-none pt-1">
            <MapPin className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
            <span>Atelier &amp; Fulfillment Hub: 2 Maruti Chock, Rajkot, Gujarat, 360005</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" asChild>
          <Link href="/account">Track My Orders</Link>
        </Button>
        <Button variant="outline" size="md" asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    </div>
  )
}
