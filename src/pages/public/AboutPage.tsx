import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { aboutValues } from '@/pages/public/aboutContent'

export function AboutPage() {
  return (
    <PageContainer>
      <SectionTitle title="Nosotros" />
      <p className="text-xs text-slate-400">
        Contenido de ejemplo. Se reemplaza por la información real de la escuela antes del
        lanzamiento.
      </p>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Nuestra historia</h2>
        <p className="mt-2 text-slate-600">
          Prados Skate nació en Zipaquirá con el propósito de enseñar patinaje a niños y jóvenes en
          un ambiente cercano y seguro, empezando por el Coliseo del Barrio El Prado y creciendo
          hacia nuevas sedes.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Misión</h2>
          <p className="mt-2 text-slate-600">
            Enseñar patinaje a niños y jóvenes de Zipaquirá, acompañando su desarrollo físico y
            personal en un espacio seguro y divertido.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Visión</h2>
          <p className="mt-2 text-slate-600">
            Ser una escuela de referencia en la región, reconocida por la calidad de sus clases y el
            cuidado de sus deportistas.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Valores</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {aboutValues.map((value) => (
            <div key={value.title} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{value.title}</p>
              <p className="mt-1 text-sm text-slate-600">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Metodología</h2>
        <p className="mt-2 text-slate-600">
          Las clases se organizan por grupos de edad, con ejercicios progresivos de equilibrio,
          frenado y técnica, siempre acompañados por un instructor.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Seguridad</h2>
        <p className="mt-2 text-slate-600">
          Recomendamos el uso de casco y protecciones en cada clase. Los instructores acompañan de
          cerca a los deportistas, en especial a los más pequeños.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Entrenadores</h2>
        <p className="mt-2 text-slate-600">
          Conoce a nuestro equipo de instructores y su experiencia.
        </p>
        <Link to="/instructores" className="mt-2 inline-block text-sm text-sky-700 underline">
          Ver instructores
        </Link>
      </section>

      <section className="rounded-lg bg-sky-700 px-6 py-8 text-center text-white">
        <h2 className="text-2xl font-bold">¿Listo para empezar?</h2>
        <p className="mt-2 text-sky-100">Conoce nuestros horarios o inscríbete directamente.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link to="/horarios" className={cn(buttonVariants({ variant: 'secondary' }))}>
            Ver horarios
          </Link>
          <Link
            to="/inscripcion"
            className={cn(buttonVariants({ variant: 'outline' }), 'bg-transparent text-white')}
          >
            Inscríbete
          </Link>
        </div>
      </section>
    </PageContainer>
  )
}
