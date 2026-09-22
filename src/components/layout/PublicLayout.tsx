import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/common/WhatsAppButton'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
