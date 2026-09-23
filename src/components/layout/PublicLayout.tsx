import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'
import { LoadingState } from '@/components/common/LoadingState'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-sky-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>

      <Header />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
