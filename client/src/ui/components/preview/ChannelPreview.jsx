import React, { useMemo } from 'react'
import { FONT_BODY, FONT_DISPLAY, PLATFORM_BRAND } from '../../theme/tokens'

const SUPPORTED = ['telegram', 'whatsapp', 'discord', 'instagram', 'facebook', 'linkedin', 'newsletter']

const PLACEHOLDER_COPY =
  'Aquí verás el mensaje exactamente como aparecerá en el canal. Empieza a escribir el copy para previsualizarlo.'

const normalizePlatform = (p) => {
  const v = String(p || '').trim().toLowerCase()
  return SUPPORTED.includes(v) ? v : 'telegram'
}

const cleanUrl = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')

const initials = (name) =>
  String(name || 'Canal')
    .replace(/[@#+]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('') || 'C'

const hhmm = (date) => {
  const d = date instanceof Date ? date : new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatSubs = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M suscriptores`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K suscriptores`
  return `${v} suscriptores`
}

const Avatar = ({ src, name, size = 36, bg = '#7C3AED' }) => {
  if (src) {
    return (
      <img src={src} alt={name || 'avatar'}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, fontFamily: FONT_DISPLAY,
      flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

const LinkPreviewCard = ({ url, title, accent = '#2aabee', tone = 'light' }) => {
  if (!url) return null
  const host = cleanUrl(url).split('/')[0]
  const bg = tone === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
  const border = tone === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
  const sub = tone === 'light' ? '#5b6770' : 'rgba(255,255,255,0.55)'
  return (
    <div style={{ marginTop: 8, borderLeft: `3px solid ${accent}`, background: bg, border: `1px solid ${border}`, borderLeftWidth: 3, borderRadius: 8, padding: '8px 10px', fontSize: 12, lineHeight: 1.4 }}>
      <div style={{ color: accent, fontWeight: 700, marginBottom: 2 }}>{title || host}</div>
      <div style={{ color: sub, wordBreak: 'break-all', fontSize: 11 }}>{cleanUrl(url)}</div>
    </div>
  )
}

/* ─── Media gallery ─────────────────────────────────────────────────────── */

const MediaGallery = ({ media = [], format, tone = 'dark', radius = 10 }) => {
  if (!media?.length) return null
  const isCarousel = media.length > 1
  const isStory = format === 'story' || format === 'reel'
  const aspect = isStory ? '9/16' : isCarousel ? '1/1' : '4/3'
  const first = media[0]
  const renderItem = (m, i) => {
    if (m.type === 'image') {
      return <img key={i} src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    }
    if (m.type === 'video') {
      return (
        <div key={i} style={{ width: '100%', height: '100%', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {m.url && <video src={m.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>▶</div>
        </div>
      )
    }
    return (
      <div key={i} style={{ width: '100%', height: '100%', background: tone === 'dark' ? '#1d2a35' : '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
        <span style={{ fontSize: 24 }}>📄</span>
        <span style={{ fontSize: 11, color: tone === 'dark' ? 'rgba(255,255,255,0.65)' : '#374151', textAlign: 'center' }}>
          {m.caption || 'Documento'}
        </span>
      </div>
    )
  }
  return (
    <div style={{ marginTop: 6, marginBottom: 6, position: 'relative', borderRadius: radius, overflow: 'hidden', aspectRatio: aspect, background: tone === 'dark' ? '#0d1620' : '#f3f4f6' }}>
      {renderItem(first, 0)}
      {isCarousel && (
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY }}>
          1/{media.length}
        </div>
      )}
      {(format === 'reel' || format === 'story' || format === 'status') && (
        <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 700 }}>
          {format === 'reel' ? 'REEL' : 'STORY'}
        </div>
      )}
    </div>
  )
}

const InlineButtonsGrid = ({ buttons = [] }) => {
  if (!buttons?.length) return null
  return (
    <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: buttons.length >= 2 ? '1fr 1fr' : '1fr', gap: 4 }}>
      {buttons.map((b, i) => (
        <div key={i} style={{
          padding: '8px 10px', textAlign: 'center', borderRadius: 6,
          background: 'rgba(42,171,238,0.12)', color: '#5cb6f0',
          fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
          border: '1px solid rgba(42,171,238,0.2)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {b.label || 'Botón sin texto'}
        </div>
      ))}
    </div>
  )
}

const DiscordEmbedCard = ({ embed, displayUrl }) => {
  if (!embed) return null
  const color = embed.color || '#7C3AED'
  return (
    <div style={{ marginTop: 8, display: 'flex', borderRadius: 6, overflow: 'hidden', background: '#2b2d31' }}>
      <div style={{ width: 4, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {embed.title && <div style={{ color: '#00a8fc', fontWeight: 600, fontSize: 13 }}>{embed.title}</div>}
        {embed.description && <div style={{ color: '#dbdee1', fontSize: 12.5, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{embed.description}</div>}
        {embed.image && <img src={embed.image} alt="" style={{ width: '100%', borderRadius: 4, marginTop: 4 }} />}
        {displayUrl && !embed.description?.includes(displayUrl) && (
          <div style={{ color: '#949ba4', fontSize: 11, marginTop: 2 }}>{cleanUrl(displayUrl)}</div>
        )}
      </div>
      {embed.thumbnail && <img src={embed.thumbnail} alt="" style={{ width: 72, height: 72, objectFit: 'cover', margin: 10, borderRadius: 4 }} />}
    </div>
  )
}

function TelegramPreview(props) {
  const { channelName, channelHandle, channelAvatar, subscribers, content, displayUrl, ctaLabel, format, media, buttons } = props
  const isPlaceholder = !content
  const text = content || PLACEHOLDER_COPY
  const hideLink = (buttons && buttons.length > 0) || format === 'text_image_buttons'
  return (
    <div style={{ background: '#0e1621', borderRadius: 16, overflow: 'hidden', fontFamily: FONT_BODY, color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#17212b', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Avatar src={channelAvatar} name={channelName} bg="#2aabee" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{channelName || 'Tu canal'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{subscribers ? formatSubs(subscribers) : channelHandle || 'canal'}</div>
        </div>
      </div>
      <div style={{ padding: '14px 12px 12px', background: 'linear-gradient(180deg, #1a2733 0%, #18222c 100%)', minHeight: 140 }}>
        <div style={{
          background: '#182533',
          color: isPlaceholder ? 'rgba(255,255,255,0.4)' : '#fff',
          borderRadius: '14px 14px 14px 4px',
          padding: '10px 12px 8px',
          maxWidth: '92%',
          fontSize: 13.5, lineHeight: 1.55,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}>
          <MediaGallery media={media} format={format} tone="dark" />
          <div>{text}</div>
          {!hideLink && <LinkPreviewCard url={displayUrl} title={ctaLabel} accent="#2aabee" tone="dark" />}
          <InlineButtonsGrid buttons={buttons} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6, color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>
            <span>👁 1</span>
            <span>{hhmm()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WhatsappPreview(props) {
  const { channelName, channelHandle, channelAvatar, subscribers, content, displayUrl, ctaLabel, format, media } = props
  const isPlaceholder = !content
  const text = content || PLACEHOLDER_COPY
  return (
    <div style={{ background: '#0b141a', borderRadius: 16, overflow: 'hidden', fontFamily: FONT_BODY, color: '#fff', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1f2c33' }}>
        <Avatar src={channelAvatar} name={channelName} bg="#25d366" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{channelName || 'Tu canal'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{subscribers ? formatSubs(subscribers) : channelHandle || 'canal'}</div>
        </div>
      </div>
      <div style={{ padding: '14px 12px 12px', minHeight: 140, backgroundColor: '#0b141a', backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        <div style={{
          background: '#005c4b',
          color: isPlaceholder ? 'rgba(255,255,255,0.55)' : '#fff',
          borderRadius: '10px 10px 10px 2px',
          padding: '8px 10px 6px',
          maxWidth: '92%',
          fontSize: 13.5, lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: '0 1px 1px rgba(0,0,0,0.25)',
        }}>
          <MediaGallery media={media} format={format} tone="dark" />
          <div>{text}</div>
          <LinkPreviewCard url={displayUrl} title={ctaLabel} accent="#53bdeb" tone="dark" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4, color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>
            <span>{hhmm()}</span>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="#53bdeb" strokeWidth="2"><polyline points="2 9 6 13 14 5" /><polyline points="6 9 10 13 17 5" /></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscordPreview(props) {
  const { channelName, channelHandle, channelAvatar, content, displayUrl, ctaLabel, format, media, embed } = props
  const isPlaceholder = !content
  const text = content || PLACEHOLDER_COPY
  return (
    <div style={{ background: '#313338', borderRadius: 16, overflow: 'hidden', fontFamily: FONT_BODY, color: '#dcddde', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#2b2d31', borderBottom: '1px solid rgba(0,0,0,0.25)' }}>
        <span style={{ color: '#80848e', fontSize: 18, fontWeight: 600 }}>#</span>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{channelHandle || channelName || 'anuncios'}</div>
      </div>
      <div style={{ padding: '12px 14px 14px', minHeight: 140 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar src={channelAvatar} name={channelName} bg="#5865f2" size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{channelName || 'Tu canal'}</span>
              <span style={{ background: '#5865f2', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3 }}>BOT</span>
              <span style={{ fontSize: 11, color: '#949ba4' }}>hoy a las {hhmm()}</span>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: isPlaceholder ? '#949ba4' : '#dbdee1', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>
            <MediaGallery media={media} format={format} tone="dark" />
            {embed ? <DiscordEmbedCard embed={embed} displayUrl={displayUrl} /> : <LinkPreviewCard url={displayUrl} title={ctaLabel} accent="#00a8fc" tone="dark" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function GenericPreview(props) {
  const { platform, channelName, channelHandle, channelAvatar, subscribers, content, displayUrl, ctaLabel, format, media, subject } = props
  const brand = PLATFORM_BRAND[platform] || PLATFORM_BRAND.telegram
  const isPlaceholder = !content
  const text = content || PLACEHOLDER_COPY
  const isStory = format === 'story' || format === 'reel'
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', fontFamily: FONT_BODY, color: 'var(--text)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <Avatar src={channelAvatar} name={channelName} bg={brand.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{channelName || 'Tu canal'}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {brand.label}{subscribers ? ` · ${formatSubs(subscribers)}` : channelHandle ? ` · ${channelHandle}` : ''}
          </div>
        </div>
      </div>
      {platform === 'newsletter' && subject && (
        <div style={{ padding: '10px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Asunto</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{subject}</div>
        </div>
      )}
      <div style={{ padding: isStory ? 0 : '14px 16px 16px', minHeight: 120 }}>
        {isStory
          ? <MediaGallery media={media} format={format} radius={0} />
          : <MediaGallery media={media} format={format} radius={10} tone="light" />}
        {!isStory && (
          <div style={{ fontSize: 14, lineHeight: 1.6, color: isPlaceholder ? 'var(--muted)' : 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: media?.length ? 10 : 0 }}>
            {text}
          </div>
        )}
        {!isStory && <LinkPreviewCard url={displayUrl} title={ctaLabel} accent={brand.color} tone="light" />}
      </div>
    </div>
  )
}

export default function ChannelPreview({
  platform, channelName, channelHandle, channelAvatar, subscribers,
  content, targetUrl, trackingUrl, ctaLabel,
  format, media, buttons, embed, subject,
  showLabel = true,
}) {
  const p = useMemo(() => normalizePlatform(platform), [platform])
  const brand = PLATFORM_BRAND[p] || PLATFORM_BRAND.telegram
  const displayUrl = trackingUrl || targetUrl

  const shared = { channelName, channelHandle, channelAvatar, subscribers, content, displayUrl, ctaLabel, format, media, buttons, embed, subject }

  const inner =
    p === 'telegram' ? <TelegramPreview {...shared} /> :
    p === 'whatsapp' ? <WhatsappPreview {...shared} /> :
    p === 'discord'  ? <DiscordPreview  {...shared} /> :
    <GenericPreview platform={p} {...shared} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {showLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: brand.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_DISPLAY }}>
            Vista previa · {brand.label}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}
      {inner}
    </div>
  )
}

export { SUPPORTED as SUPPORTED_PREVIEW_PLATFORMS }
