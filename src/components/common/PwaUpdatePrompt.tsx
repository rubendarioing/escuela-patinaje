import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    updateSWRef.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onRegisterError(error) {
        console.error('Error al registrar el Service Worker:', error)
      },
    })
  }, [])

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-sm text-white sm:inset-x-auto sm:bottom-4 sm:right-4 sm:rounded-lg sm:shadow-lg">
      <span>Hay una nueva versión disponible.</span>
      <button
        type="button"
        onClick={() => updateSWRef.current?.(true)}
        className="rounded-md bg-white px-3 py-1.5 font-medium text-slate-900"
      >
        Actualizar
      </button>
    </div>
  )
}
