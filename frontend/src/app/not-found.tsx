import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 bg-background">
      <Compass className="w-16 h-16 text-gold/40 mb-6 animate-pulse" />
      <h1 className="font-serif text-5xl font-bold text-beige mb-3 tracking-wide">404</h1>
      <h2 className="text-xl font-medium text-beige mb-2">Exquisite Page Not Found</h2>
      <p className="text-beige-muted max-w-md mb-8">
        The luxury destination you are looking for may have been moved or is no longer available in our collection.
      </p>
      <Button variant="primary" size="lg" asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  )
}
