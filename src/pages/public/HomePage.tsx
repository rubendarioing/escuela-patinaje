import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVenues } from '@/services/venues.service'
import { getPrograms } from '@/services/programs.service'
import { getInstructors } from '@/services/instructors.service'
import { getSchedules } from '@/services/schedules.service'
import type { Venue } from '@/types/venue'
import type { Program } from '@/types/program'
import type { Instructor } from '@/types/instructor'
import type { Schedule } from '@/types/schedule'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { Seo } from '@/components/common/Seo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getWhatsAppUrl } from '@/lib/siteConfig'
import { VenueCard } from '@/features/venues/VenueCard'
import { ProgramCard } from '@/features/programs/ProgramCard'
import { InstructorCard } from '@/features/instructors/InstructorCard'
import { ScheduleCard } from '@/features/schedules/ScheduleCard'
import { benefits, testimonials } from '@/pages/public/homeContent'

type HomeData = {
  venues: Venue[]
  programs: Program[]
  instructors: Instructor[]
  schedules: Schedule[]
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.all([getVenues(), getPrograms(), getInstructors(), getSchedules()])
      .then(([venues, programs, instructors, schedules]) => {
        if (cancelled) return
        setData({ venues, programs, instructors, schedules })
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudo cargar la información de la escuela.')
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  const handleRetry = () => {
    setError(null)
    setData(null)
    setRetryKey((key) => key + 1)
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />
  }

  if (!data) {
    return <LoadingState label="Cargando escuela…" />
  }

  return (
    <PageContainer>
      <Seo
        title="Inicio"
        description="Escuela de patinaje en Zipaquirá para niños desde los 4 años. Programas, horarios, sedes e inscripción."
      />
      {/* Hero */}
      <section className="grid items-center gap-6 sm:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Aprende a patinar en Prados Skate
          </h1>
          <p className="mt-3 text-slate-600">
            Clases de patinaje en Zipaquirá para niños desde los 4 años y para mayores de 7, en dos
            sedes con horarios entre semana y los sábados.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/horarios" className={cn(buttonVariants({ variant: 'default' }))}>
              Ver horarios
            </Link>
            <Link to="/inscripcion" className={cn(buttonVariants({ variant: 'outline' }))}>
              Inscríbete
            </Link>
            <a
              href={getWhatsAppUrl('Hola, quiero información sobre la escuela de patinaje.')}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'secondary' }))}
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
        <div className="flex h-48 items-center justify-center rounded-lg bg-sky-100 text-sm text-sky-700 sm:h-64">
          Foto de la escuela (próximamente)
        </div>
      </section>

      {/* Beneficios */}
      <section>
        <SectionTitle title="¿Por qué elegirnos?" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{benefit.title}</p>
              <p className="mt-1 text-sm text-slate-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Programas destacados */}
      <section>
        <SectionTitle title="Programas" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.programs.slice(0, 3).map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      </section>

      {/* Horarios destacados */}
      <section>
        <SectionTitle
          title="Próximos horarios"
          subtitle="Consulta todos los horarios y sus cupos."
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.schedules.slice(0, 3).map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} />
          ))}
        </div>
        <Link to="/horarios" className="mt-3 inline-block text-sm text-sky-700 underline">
          Ver todos los horarios
        </Link>
      </section>

      {/* Sedes */}
      <section>
        <SectionTitle title="Nuestras sedes" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {data.venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </section>

      {/* Instructores */}
      <section>
        <SectionTitle title="Instructores" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.instructors.map((instructor) => (
            <InstructorCard key={instructor.id} instructor={instructor} />
          ))}
        </div>
      </section>

      {/* Testimonios */}
      <section>
        <SectionTitle title="Lo que dicen las familias" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.quote} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600">"{testimonial.quote}"</p>
              <p className="mt-2 text-xs font-medium text-slate-500">{testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="rounded-lg bg-sky-700 px-6 py-8 text-center text-white">
        <h2 className="text-2xl font-bold">Agenda tu clase de prueba</h2>
        <p className="mt-2 text-sky-100">Escríbenos y te ayudamos a elegir la sede y el horario.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link to="/inscripcion" className={cn(buttonVariants({ variant: 'secondary' }))}>
            Inscríbete ahora
          </Link>
          <a
            href={getWhatsAppUrl('Hola, quiero agendar una clase de prueba.')}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'bg-transparent text-white')}
          >
            Hablar por WhatsApp
          </a>
        </div>
      </section>
    </PageContainer>
  )
}
