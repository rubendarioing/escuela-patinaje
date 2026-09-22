import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { InstagramIcon, FacebookIcon } from '@/components/common/SocialIcons'
import { siteConfig, getWhatsAppUrl } from '@/lib/siteConfig'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-600">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-900">{siteConfig.name}</p>
            <p className="mt-1">Escuela de patinaje en Zipaquirá.</p>
          </div>

          <div>
            <p className="font-semibold text-slate-900">Contacto</p>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block hover:text-sky-700"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="mt-1 flex items-center gap-1 hover:text-sky-700"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {siteConfig.contactEmail}
            </a>
          </div>

          <div>
            <p className="font-semibold text-slate-900">Síguenos</p>
            <div className="mt-2 flex gap-3">
              {siteConfig.social.instagram ? (
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-5 w-5 hover:text-sky-700" />
                </a>
              ) : (
                <InstagramIcon
                  className="h-5 w-5 text-slate-300"
                  aria-label="Instagram (próximamente)"
                />
              )}
              {siteConfig.social.facebook ? (
                <a
                  href={siteConfig.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="h-5 w-5 hover:text-sky-700" />
                </a>
              ) : (
                <FacebookIcon
                  className="h-5 w-5 text-slate-300"
                  aria-label="Facebook (próximamente)"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t pt-4 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>
            © {year} {siteConfig.name}. Todos los derechos reservados.
          </span>
          <Link to="/privacidad" className="hover:text-sky-700">
            Política de privacidad
          </Link>
        </div>
      </div>
    </footer>
  )
}
