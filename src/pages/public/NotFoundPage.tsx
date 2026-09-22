import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/common/PageContainer'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotFoundPage() {
  return (
    <PageContainer>
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold text-slate-900">404</h1>
        <p className="mt-2 text-slate-600">La página que buscas no existe.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/" className={cn(buttonVariants({ variant: 'default' }))}>
            Ir al inicio
          </Link>
          <Link to="/horarios" className={cn(buttonVariants({ variant: 'outline' }))}>
            Ver horarios
          </Link>
        </div>
      </section>
    </PageContainer>
  )
}
