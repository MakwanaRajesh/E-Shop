import Link from 'next/link'
import { FileText, CreditCard, ShieldCheck, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const metadata = {
  title: 'Terms of Service',
}

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-surface border border-border rounded-3xl p-7 sm:p-10 space-y-4 shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-3 py-1 rounded-full">
          <FileText className="w-3.5 h-3.5" />
          Storefront Terms &amp; Guidelines
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige">Terms of Service</h1>
        <p className="text-sm text-beige-muted leading-relaxed">
          By browsing or placing an order with NEXUS Luxury Store, you agree to the transparent ordering, pricing, delivery, and customer review guidelines outlined below.
        </p>
      </div>

      <div className="space-y-5">
        {[
          {
            icon: CreditCard,
            title: '1. Pricing, Platform Fee & Coupons',
            body: 'All catalog prices are displayed in Indian Rupees (INR). Every order includes a flat ₹9 platform fee. Standard delivery is ₹99 for orders below ₹999, while orders ₹999+ and every new customer’s first order enjoy FREE doorstep delivery. Valid promotional codes are validated server-side against minimum spend and active limits at checkout.',
          },
          {
            icon: ShieldCheck,
            title: '2. Orders, Cancellations & Payments',
            body: 'We support Cash on Delivery and verified Razorpay online payments. Pending or confirmed orders can be cancelled directly from My Orders prior to warehouse dispatch; once cancelled, inventory is restored and any eligible pre-payments are refunded.',
          },
          {
            icon: MessageSquare,
            title: '3. Ratings, Reviews & Support Tickets',
            body: 'Ratings and product reviews on NEXUS can be submitted strictly after an order is delivered, keeping feedback authentic and helpful. Customers may raise product-specific or order-linked support tickets anytime through the Concierge tab in My Account.',
          },
        ].map((section) => {
          const Icon = section.icon
          return (
            <section key={section.title} className="bg-surface border border-border rounded-2xl p-6 space-y-2.5 shadow-sm">
              <h2 className="font-serif text-lg font-bold text-beige flex items-center gap-2.5">
                <Icon className="w-5 h-5 text-gold flex-shrink-0" />
                {section.title}
              </h2>
              <p className="text-sm text-beige-muted leading-relaxed">{section.body}</p>
            </section>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button variant="primary" size="md" asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
        <Button variant="outline" size="md" asChild>
          <Link href="/shipping">Shipping Details</Link>
        </Button>
      </div>
    </div>
  )
}
