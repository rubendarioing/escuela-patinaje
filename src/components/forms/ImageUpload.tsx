import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png']
const MAX_SIZE_BYTES = 2 * 1024 * 1024

type ImageUploadProps = {
  label: string
  bucket: 'venues' | 'instructors' | 'programs' | 'gallery'
  folder: string
  value: string | null
  onChange: (url: string | null) => void
}

export function ImageUpload({ label, bucket, folder, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes WebP, JPEG o PNG.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('La imagen no puede superar 2 MB.')
      return
    }

    setIsUploading(true)
    const extension = file.name.split('.').pop() ?? 'webp'
    const path = `${folder}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

    setIsUploading(false)

    if (uploadError) {
      setError('No se pudo subir la imagen. Inténtalo de nuevo.')
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    onChange(data.publicUrl)
  }

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>

      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 h-24 w-24 rounded-md border border-slate-200 object-cover"
        />
      )}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'disabled:opacity-50')}
        >
          {isUploading ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-red-600 hover:underline"
          >
            Quitar
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        onChange={(e) => void handleFileChange(e)}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
