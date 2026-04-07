import { Helmet } from 'react-helmet-async'

const SITE = 'https://channelad.io'
const SITE_NAME = 'Channelad'
const DEFAULT_DESC = 'Marketplace de publicidad en comunidades reales de WhatsApp, Telegram y Discord. Pagos protegidos y metricas en tiempo real.'

export default function SEO({ title, description, path = '', noIndex = false }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Publicidad en comunidades que escuchan`
  const desc = description || DEFAULT_DESC
  const url = `${SITE}${path}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_ES" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />

      {noIndex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  )
}
