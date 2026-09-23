import { Helmet } from 'react-helmet-async'

type SeoProps = {
  title: string
  description: string
  path?: string
  noIndex?: boolean
}

const SITE_NAME = 'Prados Skate'

export function Seo({ title, description, path, noIndex = false }: SeoProps) {
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}${path ?? window.location.pathname}`
      : undefined

  const fullTitle = `${title} · ${SITE_NAME}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {url && <link rel="canonical" href={url} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  )
}
