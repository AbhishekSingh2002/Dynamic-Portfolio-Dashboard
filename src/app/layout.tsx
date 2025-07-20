import type { Metadata } from 'next'
import type { Viewport } from 'next/dist/lib/metadata/types/extra-types'
import { Inter } from 'next/font/google'
import Head from 'next/head'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Viewport configuration for the application
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // themeColor is not a valid property in Viewport type
  // Moving themeColor to metadata and head tags instead
  userScalable: false,
  viewportFit: 'cover',
  // Add theme color meta tags in the head section below
}

export const metadata: Metadata = {
  title: 'Dynamic Portfolio Dashboard',
  description: 'A real-time portfolio tracking dashboard with market data',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Dynamic Portfolio Dashboard',
    description: 'A real-time portfolio tracking dashboard with market data',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a202c" media="(prefers-color-scheme: dark)" />
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200`}>
        {children}
      </body>
    </html>
  )
}
