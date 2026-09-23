import { siteConfig } from '@/lib/siteConfig'
import { POLICY_VERSION } from '@/lib/policyVersion'
import { PageContainer } from '@/components/common/PageContainer'
import { SectionTitle } from '@/components/common/SectionTitle'
import { Seo } from '@/components/common/Seo'

export function PrivacyPage() {
  return (
    <PageContainer>
      <Seo
        title="Política de privacidad"
        description="Política de tratamiento de datos personales de Prados Skate."
        noIndex
      />
      <SectionTitle title="Política de privacidad" level="h1" />

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Borrador pendiente de revisión legal.</p>
        <p className="mt-1">
          Este texto es un punto de partida generado para el desarrollo del sitio. Antes de
          publicarlo en producción debe ser revisado y aprobado por la escuela y, si aplica, por un
          abogado. En particular, falta confirmar quién es el responsable legal del tratamiento de
          datos y su información de contacto.
        </p>
      </div>

      <p className="text-sm text-slate-500">
        Versión: {POLICY_VERSION} · Última actualización: 22 de septiembre de 2026
      </p>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Responsable del tratamiento</h2>
        <p className="mt-2 text-slate-600">
          [Pendiente: nombre o razón social del responsable legal de {siteConfig.name}, número de
          identificación y datos de contacto para ejercer derechos de protección de datos.]
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Finalidad del tratamiento</h2>
        <p className="mt-2 text-slate-600">
          Los datos personales recolectados a través del formulario de preinscripción y del panel
          administrativo se usan para: gestionar la inscripción del deportista, contactar a su
          acudiente, organizar los horarios y programas de la escuela, y responder consultas
          enviadas por los canales de contacto.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Datos que se recopilan</h2>
        <p className="mt-2 text-slate-600">
          Del deportista: nombre, apellido y fecha de nacimiento. Del acudiente o representante
          legal: nombre, apellido, teléfono, WhatsApp y correo electrónico. No se solicitan datos
          sensibles a través del formulario público.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">
          Tratamiento de datos de menores de edad
        </h2>
        <p className="mt-2 text-slate-600">
          Cuando el deportista es menor de edad, sus datos son suministrados y autorizados por su
          padre, madre o representante legal, quien acepta expresamente esta política al enviar el
          formulario de preinscripción.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Derechos del titular</h2>
        <p className="mt-2 text-slate-600">
          El titular de los datos, o su representante legal, puede solicitar en cualquier momento
          conocer, actualizar, rectificar o suprimir su información, así como revocar la
          autorización otorgada, escribiendo a los medios de contacto indicados abajo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Medios de contacto</h2>
        <p className="mt-2 text-slate-600">
          Correo: {siteConfig.contactEmail}. WhatsApp disponible en la página de{' '}
          <a href="/contacto" className="text-sky-700 underline">
            Contacto
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Autorización y vigencia</h2>
        <p className="mt-2 text-slate-600">
          Al marcar la casilla de aceptación en el formulario de preinscripción, el acudiente
          autoriza el tratamiento de los datos descritos en esta política, en la versión vigente al
          momento del envío ({POLICY_VERSION}).
        </p>
      </section>
    </PageContainer>
  )
}
