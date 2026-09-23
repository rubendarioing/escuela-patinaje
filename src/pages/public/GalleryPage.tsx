import { useEffect, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { galleryItems } from '@/features/gallery/gallery.data'

export function GalleryPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = galleryItems.find((item) => item.id === selectedId) ?? null
  const dialogRef = useFocusTrap<HTMLDivElement>(selected !== null)

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  return (
    <PageContainer>
      <SectionTitle title="Galería" subtitle="Momentos de nuestras clases." level="h1" />
      <p className="text-xs text-slate-600">
        Fotos de ejemplo. Se reemplazan por imágenes reales en el paso 37.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {galleryItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className={`flex aspect-square items-center justify-center rounded-lg p-2 text-center text-xs text-slate-600 ${item.color}`}
          >
            {item.alt}
          </button>
        ))}
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={dialogRef}
            className={`flex aspect-square w-full max-w-md items-center justify-center rounded-lg p-6 text-center text-slate-700 ${selected.color}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p>{selected.alt}</p>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mt-4 text-sm text-slate-500 underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
