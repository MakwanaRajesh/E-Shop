import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'NEXUS — Luxury & Premium Goods',
    template: '%s | NEXUS',
  },
  description:
    'Discover curated luxury products at NEXUS. Shop the finest selection of premium watches, accessories, and fragrances with secure payments.',
  keywords: ['nexus', 'luxury', 'e-commerce', 'premium', 'shopping', 'online store'],
  metadataBase: new URL('http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans bg-background text-beige antialiased`}>
        {children}
      </body>
    </html>
  )
}
