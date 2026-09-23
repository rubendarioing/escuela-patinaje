import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProgramBySlug, getSchedulesByProgramId } from '@/services/programs.service'
import type { Program } from '@/types/program'
import type { Schedule } from '@/types/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { ScheduleCard } from '@/features/schedules/ScheduleCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ProgramDetailData = {
  program: Program | null
  schedules: Schedule[]
}

const formatAgeRange = (minAge: number | null, maxAge: number | null) => {
  if (minAge != null && maxAge != null) return `${minAge} a ${maxAge} años`
  if (minAge != null) return `Desde ${minAge} años`
  if (maxAge != null) return `Hasta ${maxAge} años`
  return 'Todas las edades'
}

export function ProgramDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<ProgramDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    getProgramBySlug(slug)
      .then(async (program) => {
        if (cancelled) return
        const schedules = program ? await getSchedulesByProgramId(program.id) : []
        if (cancelled) return
        setData({ program, schedules })
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudo cargar el programa.')
      })

    return () => {
      cancelled = true
    }
  }, [slug, retryKey])

  const handleRetry = () => {
    setError(null)
    setData(null)
    setRetryKey((key) => key + 1)
  }

  if (error) return <ErrorState message={error} onRetry={handleRetry} />
  if (!data) return <LoadingState label="Cargando programa…" />

  if (!data.program) {
    return (
      <EmptyState
        title="Programa no encontrado"
        description="Puede que ya no esté disponible."
        action={
          <Link to="/programas" className="text-sm text-sky-700 underline">
            Ver todos los programas
          </Link>
        }
      />
    )
  }

  const { program, schedules } = data

  return (
    <PageContainer>
      <SectionTitle
        title={program.name}
        subtitle={formatAgeRange(program.minAge, program.maxAge)}
        level="h1"
      />

      {program.description && <p className="text-slate-600">{program.description}</p>}

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Horarios disponibles</h2>
        {schedules.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Por ahora no hay horarios activos para este programa.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        )}
      </section>

      <Link
        to={`/inscripcion?programa=${program.slug}`}
        className={cn(buttonVariants({ variant: 'default' }))}
      >
        Inscríbete en este programa
      </Link>
    </PageContainer>
  )
}
