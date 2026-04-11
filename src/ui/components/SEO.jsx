import { Helmet } from 'react-helmet-async'

const SITE = 'https://www.channelad.io'
const SITE_NAME = 'Channelad'
const DEFAULT_DESC = 'Marketplace de publicidad en comunidades reales de WhatsApp, Telegram y Discord. Pagos protegidos y metricas en tiempo real.'
const DEFAULT_IMAGE = `${SITE}/og-default.png`
const AUTHOR = 'Rafa Ferrer'

export default function SEO({
  title, description, path = '', noIndex = false,
  type = 'website', image, date, dateModified, lang = 'es',
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Publicidad en comunidades que escuchan`
  const desc = description || DEFAULT_DESC
  const url = `${SITE}${path}`
  const imageUrl = image || DEFAULT_IMAGE
  const isArticle = type === 'article'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="author" content={AUTHOR} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={lang === 'en' ? 'en_US' : 'es_ES'} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {isArticle && date && <meta property="article:published_time" content={date} />}
      {isArticle && (dateModified || date) && <meta property="article:modified_time" content={dateModified || date} />}
      {isArticle && <meta property="article:author" content={AUTHOR} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={imageUrl} />

      {noIndex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  )
}
