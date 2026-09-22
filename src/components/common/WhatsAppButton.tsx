import { MessageCircle } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/siteConfig'

export function WhatsAppButton() {
  return (
    <a
      href={getWhatsAppUrl('Hola, quiero información sobre la escuela de patinaje.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hablar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
    </a>
  )
}
