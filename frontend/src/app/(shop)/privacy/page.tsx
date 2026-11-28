import Link from 'next/link'
import { ShieldCheck, Lock, Eye, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-surface border border-border rounded-3xl p-7 sm:p-10 space-y-4 shadow-sm">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-widest text-gold bg-gold/10 border border-gold/25 px-3 py-1 rounded-full">
          <Lock className="w-3.5 h-3.5" />
          Privacy &amp; Data Protection
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-beige">Privacy Policy</h1>
        <p className="text-sm text-beige-muted leading-relaxed">
          At NEXUS Luxury Store, protecting your personal information and purchase privacy is fundamental to our service. This policy explains how we collect, use, and safeguard your information.
        </p>
      </div>

      <div className="space-y-5">
        {[
          {
            icon: Eye,
            title: '1. Information We Collect',
            body: 'We collect only the details required to fulfill your orders and support requests cleanly: your name, email address, delivery address, phone number, order history, wishlist, and any product support tickets or verified reviews you choose to submit.',
          },
          {
            icon: ShieldCheck,
            title: '2. Payment & Session Security',
            body: 'All authentication sessions use signed tokens, passwords are stored exclusively as cryptographic hashes, and online transactions are processed over encrypted HTTPS channels. NEXUS never stores raw card details or UPI PINs.',
          },
          {
            icon: Lock,
            title: '3. Data Usage & Third Parties',
            body: 'Your delivery address and contact phone are shared strictly with authorized courier partners to complete doorstep fulfillment. We never sell, rent, or trade customer personal data to third-party advertisers.',
          },
          {
            icon: Mail,
            title: '4. Your Rights & Support',
            body: 'You can view or update your profile details, delivery addresses, saved wishlist, and support history anytime from My Account, or contact our concierge desk at nexustech1003@gmail.com for assistance.',
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
          <Link href="/products">Explore Catalog</Link>
        </Button>
        <Button variant="outline" size="md" asChild>
          <Link href="/account">Open Concierge &amp; Support</Link>
        </Button>
      </div>
    </div>
  )
}
