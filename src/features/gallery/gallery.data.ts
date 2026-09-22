// Contenido de ejemplo. Se reemplaza por fotos reales del bucket "gallery" en el paso 37.
export type GalleryItem = {
  id: string
  alt: string
  color: string
}

export const galleryItems: GalleryItem[] = [
  { id: '1', alt: 'Clase de patinaje en la sede Prado', color: 'bg-sky-100' },
  { id: '2', alt: 'Grupo de niños practicando equilibrio', color: 'bg-emerald-100' },
  { id: '3', alt: 'Clase de patinaje en la sede Colsubsidio', color: 'bg-amber-100' },
  { id: '4', alt: 'Deportistas con casco y protecciones', color: 'bg-rose-100' },
  { id: '5', alt: 'Instructor acompañando a un deportista', color: 'bg-violet-100' },
  { id: '6', alt: 'Grupo de mayores de 7 años entrenando', color: 'bg-teal-100' },
]
