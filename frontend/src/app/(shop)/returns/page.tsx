import Link from 'next/link'
import { RefreshCw, CheckCircle2, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const metadata = {
  title: 'Returns & Refunds',
}

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-surface border border-border rounded-3xl p-7 sm:p-10 space-y-4 shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-3 py-1 rounded-full">
          <RefreshCw className="w-3.5 h-3.5" />
          7-Day Concierge Guarantee
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige">Returns &amp; Refunds</h1>
        <p className="text-sm text-beige-muted leading-relaxed">
          If your piece doesn&apos;t fit as expected or arrives with any defect, NEXUS arranges complimentary doorstep pickup within 7 days of delivery, verification, and a fast refund.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-2 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-beige flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            7-Day Return &amp; Exchange
          </h2>
          <p className="text-xs text-beige-muted leading-relaxed">
            Eligible unworn items with original tags may be returned or exchanged within 7 days of delivery. Open My Orders and click &ldquo;Request 7-Day Return&rdquo; on any delivered order to schedule a doorstep pickup.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 space-y-2 shadow-sm">
          <h2 className="font-serif text-lg font-bold text-beige flex items-center gap-2">
            <Headphones className="w-5 h-5 text-gold" />
            Transparent Refund Settlement
          </h2>
          <p className="text-xs text-beige-muted leading-relaxed">
            Once picked up and quality-verified at our atelier, online payments refund directly to your original payment source while Cash on Delivery orders settle via UPI, bank transfer, or store credit within 24–48 hours with a full transaction reference.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" asChild>
          <Link href="/account">Raise a Return Ticket</Link>
        </Button>
        <Button variant="outline" size="md" asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  )
}
