import { Link } from 'react-router-dom'
import { DesktopNavigation } from '@/components/layout/DesktopNavigation'
import { MobileNavigation } from '@/components/layout/MobileNavigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/programas', label: 'Programas' },
  { to: '/sedes', label: 'Sedes' },
  { to: '/horarios', label: 'Horarios' },
  { to: '/instructores', label: 'Instructores' },
  { to: '/galeria', label: 'Galería' },
  { to: '/preguntas-frecuentes', label: 'Preguntas frecuentes' },
  { to: '/contacto', label: 'Contacto' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-sky-700">
          Prados Skate
        </Link>

        <DesktopNavigation links={links} />

        <div className="flex items-center gap-2">
          <Link
            to="/inscripcion"
            className={cn(buttonVariants({ variant: 'default' }), 'hidden sm:inline-flex')}
          >
            Inscríbete
          </Link>

          <MobileNavigation links={links} />
        </div>
      </div>
    </header>
  )
}
