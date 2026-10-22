'use client'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { AuthModal } from '@/components/auth/AuthModal'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { Toaster } from 'react-hot-toast'

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 lg:pt-36">{children}</main>
      <Footer />
      <CartDrawer />
      <AuthModal />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#141414',
            color: '#F5F0E8',
            border: '1px solid #2A2820',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#C9A84C', secondary: '#141414' },
          },
          error: {
            iconTheme: { primary: '#E85454', secondary: '#141414' },
          },
        }}
      />
    </>
  )
}
