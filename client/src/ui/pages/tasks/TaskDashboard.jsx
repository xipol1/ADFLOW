import React, { useState, useMemo } from 'react'
import {
  ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, AlertTriangle,
  Server, Shield, Layout, Users, Zap, Globe, Rocket, TrendingUp,
  CreditCard, Mail, Bell, Bot, MessageSquare, Image, Database,
  BarChart3, FileText, Lock, Eye, Calendar, GitCompare, Palette,
  Code2, Search, Layers, Star, Target, Repeat, DollarSign, Filter
} from 'lucide-react'

/* ── Palette (matches project tokens) ────────────────────────── */
const A  = '#8b5cf6'
const AG = (o) => `rgba(139,92,246,${o})`

/* ── Task data ───────────────────────────────────────────────── */
const SPRINTS = [
  {
    id: 's6',
    title: 'Sprint 6 — Produccion Real',
    description: 'Configuracion de servicios externos, soluciones serverless, admin panel, UX y seguridad',
    icon: Rocket,
    accent: A,
    categories: [
      {
        id: 'c61',
        title: '6.1 Configuracion de servicios externos',
        icon: Server,
        description: 'Activar todos los servicios third-party necesarios para produccion',
        tasks: [
          { id: 't1', title: 'Configurar Stripe en modo live', status: 'pending', priority: 'critical',
            icon: CreditCard,
            description: 'Activar STRIPE_SECRET_KEY y webhook secret en Vercel env vars. Crear webhook endpoint en dashboard de Stripe apuntando a /api/transacciones/webhook. Verificar flujo completo de checkout, escrow y payout.',
            files: ['controllers/transaccionController.js', 'config/config.js', '.env.example'] },
          { id: 't2', title: 'Configurar SMTP para emails', status: 'pending', priority: 'critical',
            icon: Mail,
            description: 'Elegir proveedor (SendGrid recomendado por free tier). Configurar EMAIL_PROVIDER, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS en Vercel. Verificar envio de email de verificacion y password reset. Los 14 templates HTML ya estan listos.',
            files: ['services/emailService.js', 'templates/'] },
          { id: 't3', title: 'Generar VAPID keys para push', status: 'pending', priority: 'medium',
            icon: Bell,
            description: 'Ejecutar npx web-push generate-vapid-keys. Configurar VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_EMAIL en Vercel. Actualizar el service worker del frontend con la public key.',
            files: ['controllers/pushController.js', 'public/sw.js'] },
          { id: 't4', title: 'Crear bot de Telegram', status: 'pending', priority: 'medium',
            icon: Bot,
            description: 'Crear bot con @BotFather en Telegram. Obtener TELEGRAM_BOT_TOKEN. Configurar en Vercel env. El modulo platformConnectors.js ya tiene la integracion completa con Bot API para verificar canales y publicar anuncios.',
            files: ['lib/platformConnectors.js'] },
          { id: 't5', title: 'Crear app de Discord', status: 'pending', priority: 'medium',
            icon: MessageSquare,
            description: 'Crear aplicacion en Discord Developer Portal. Configurar DISCORD_BOT_TOKEN y DISCORD_CLIENT_ID. Invitar bot a servidor de pruebas. La integracion Guild API para embeds ya esta implementada.',
            files: ['lib/platformConnectors.js'] },
          { id: 't6', title: 'Configurar WhatsApp Business API', status: 'pending', priority: 'low',
            icon: MessageSquare,
            description: 'Requiere Meta Business account verificado. Configurar META_APP_ID, META_APP_SECRET y WHATSAPP_BUSINESS_API_TOKEN. Mas complejo por requisitos de Meta. Considerar dejarlo para fase posterior.',
            files: ['lib/platformConnectors.js'] },
          { id: 't7', title: 'Configurar Instagram Graph API', status: 'pending', priority: 'low',
            icon: Image,
            description: 'Requiere app de Meta con permisos instagram_basic e instagram_manage_insights. Configurar INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET. Necesita app review de Meta.',
            files: ['lib/platformConnectors.js'] },
        ]
      },
      {
        id: 'c62',
        title: '6.2 Soluciones para limitaciones serverless',
        icon: Zap,
        description: 'Resolver las 4 limitaciones principales de Vercel serverless',
        tasks: [
          { id: 't8', title: 'Migrar cron jobs a Vercel Cron', status: 'pending', priority: 'critical',
            icon: Clock,
            description: 'Crear api/cron/campaigns.js como endpoint invocable por Vercel Cron. Migrar logica de lib/campaignCron.js (expiracion, auto-complete, escrow release). Configurar schedule en vercel.json. Los cron actuales usan setInterval que no persiste en serverless.',
            files: ['lib/campaignCron.js', 'vercel.json', 'api/cron/'] },
          { id: 't9', title: 'Migrar file storage a cloud', status: 'pending', priority: 'high',
            icon: Database,
            description: 'Los uploads van a /tmp que es efimero en Vercel. Opciones: Vercel Blob (mas simple), S3 (mas control), Cloudinary (optimizacion imagenes). Reemplazar multer disk storage por upload directo a cloud. Actualizar fileController para devolver URLs persistentes.',
            files: ['controllers/fileController.js', 'services/fileService.js', 'middleware/'] },
          { id: 't10', title: 'Reemplazar Socket.io por alternativa serverless', status: 'pending', priority: 'high',
            icon: Zap,
            description: 'Socket.io requiere conexiones persistentes que Vercel serverless no soporta. Opciones: A) Pusher/Ably (websocket managed, ~$0 free tier) B) Server-Sent Events con polling C) Polling cada 30s desde frontend. Recomendado: Pusher por simplicidad y free tier.',
            files: ['server.js', 'services/notificationService.js', 'src/hooks/'] },
          { id: 't11', title: 'Generar set completo de iconos PWA', status: 'pending', priority: 'low',
            icon: Palette,
            description: 'El manifest.json necesita iconos en multiples tamanos (72, 96, 128, 144, 152, 192, 384, 512). Generar desde logo SVG con herramienta como pwa-asset-generator. Actualizar public/manifest.json.',
            files: ['public/manifest.json', 'public/icons/'] },
        ]
      },
      {
        id: 'c63',
        title: '6.3 Panel de administracion',
        icon: Layout,
        description: 'Dashboard completo para administrar la plataforma',
        tasks: [
          { id: 't12', title: 'Dashboard admin con metricas', status: 'pending', priority: 'high',
            icon: BarChart3,
            description: 'Pagina principal del admin con KPIs: total usuarios, canales activos, campanas en curso, revenue total, comisiones generadas. Graficos de tendencia mensual. El endpoint /api/estadisticas/advanced ya provee los datos necesarios.',
            files: ['src/ui/pages/dashboard/AdminDashboard.jsx', 'controllers/estadisticaController.js'] },
          { id: 't13', title: 'Moderacion de canales', status: 'pending', priority: 'high',
            icon: Shield,
            description: 'Vista de todos los canales con filtro por estado (pending, verified, suspended). Acciones: aprobar, rechazar con motivo, suspender. El backend ya soporta estos estados en el modelo Canal.',
            files: ['src/ui/pages/dashboard/AdminDashboard.jsx', 'controllers/canalController.js', 'models/Canal.js'] },
          { id: 't14', title: 'Gestion de usuarios', status: 'pending', priority: 'medium',
            icon: Users,
            description: 'Listado de usuarios con busqueda y filtros por rol. Ver detalle, editar datos basicos, banear/desbanear. El modelo Usuario ya tiene campo banned pero no hay UI para gestionarlo.',
            files: ['models/Usuario.js', 'controllers/authController.js'] },
          { id: 't15', title: 'Moderacion de reviews', status: 'pending', priority: 'medium',
            icon: Star,
            description: 'Vista de reviews reportadas (flagged). Acciones: aprobar, eliminar, contactar usuario. El sistema de report ya existe en reviewController con el endpoint /api/reviews/:id/report.',
            files: ['controllers/reviewController.js', 'models/Review.js'] },
          { id: 't16', title: 'Visor de disputas admin', status: 'pending', priority: 'medium',
            icon: AlertTriangle,
            description: 'Vista dedicada para admin con todas las disputas abiertas. Herramientas de resolucion: resolver a favor de creator/advertiser, reembolso parcial. El backend ya lo soporta pero el frontend admin es basico.',
            files: ['src/ui/pages/dashboard/DisputesPage.jsx', 'controllers/disputeController.js'] },
          { id: 't17', title: 'Logs de auditoria', status: 'pending', priority: 'low',
            icon: FileText,
            description: 'Vista de actividad de la plataforma: logins, pagos, moderaciones, cambios de configuracion. El modelo PartnerAuditLog existe pero falta un audit log general para acciones admin.',
            files: ['models/PartnerAuditLog.js'] },
        ]
      },
      {
        id: 'c64',
        title: '6.4 Mejoras de UX',
        icon: Eye,
        description: 'Mejorar la experiencia de usuario en areas clave',
        tasks: [
          { id: 't18', title: 'Onboarding guiado', status: 'pending', priority: 'high',
            icon: Rocket,
            description: 'Flujo paso a paso para nuevos creators (registrar canal, verificar, crear perfil) y advertisers (explorar marketplace, crear primera campana). Modal o wizard en el primer login detectando perfil incompleto.',
            files: ['src/ui/pages/dashboard/'] },
          { id: 't19', title: 'Notificaciones in-app dropdown', status: 'pending', priority: 'medium',
            icon: Bell,
            description: 'Icono de campana en navbar con badge de count. Dropdown con ultimas notificaciones, marcar como leidas. El backend ya tiene CRUD completo de notificaciones (/api/notifications). Solo falta el componente UI.',
            files: ['src/ui/navigation/NavBar.jsx', 'services/api.js'] },
          { id: 't20', title: 'Preview de anuncio antes de publicar', status: 'pending', priority: 'medium',
            icon: Eye,
            description: 'Cuando el advertiser crea una campana, mostrar preview de como se vera el anuncio en cada plataforma (Telegram, Discord, etc.) antes de confirmar pago. Mockup visual con el contenido real.',
            files: ['src/ui/pages/dashboard/advertiser/CampaignsPage.jsx'] },
          { id: 't21', title: 'Calendario de disponibilidad', status: 'pending', priority: 'low',
            icon: Calendar,
            description: 'Vista calendario en el perfil de canal mostrando dias disponibles/ocupados. El creator define su disponibilidad y el advertiser puede ver slots libres antes de reservar.',
            files: ['models/Canal.js'] },
          { id: 't22', title: 'Comparador de canales', status: 'pending', priority: 'low',
            icon: GitCompare,
            description: 'Seleccionar 2-4 canales y ver comparacion side-by-side: precio, engagement, alcance, score, reviews. Util para advertisers decidiendo entre canales similares.',
            files: ['src/ui/pages/marketplace/'] },
          { id: 't23', title: 'Dashboard analytics con graficos', status: 'pending', priority: 'medium',
            icon: BarChart3,
            description: 'Graficos interactivos con Chart.js o Recharts para visualizar tendencias de clicks, revenue, engagement a lo largo del tiempo. Los datos ya existen via /api/analytics, falta la visualizacion.',
            files: ['src/ui/pages/dashboard/'] },
        ]
      },
      {
        id: 'c65',
        title: '6.5 Seguridad y compliance',
        icon: Shield,
        description: 'Hardening de seguridad y cumplimiento normativo',
        tasks: [
          { id: 't24', title: 'Encriptar credenciales en DB', status: 'pending', priority: 'critical',
            icon: Lock,
            description: 'Las credenciales de plataformas (tokens de Telegram, Discord, etc.) se guardan en texto plano en MongoDB. Implementar encriptacion AES-256 con key en env var. Encriptar al guardar, desencriptar al leer.',
            files: ['models/Canal.js', 'controllers/canalController.js'] },
          { id: 't25', title: 'Rate limiting granular', status: 'pending', priority: 'medium',
            icon: Shield,
            description: 'El rate limiting actual es global (100 req/15min). Necesita limites por endpoint: auth (5/min), API general (60/min), webhooks (sin limite). Usar express-rate-limit con configuracion por ruta.',
            files: ['app.js', 'middleware/'] },
          { id: 't26', title: 'Audit log de acciones sensibles', status: 'pending', priority: 'medium',
            icon: FileText,
            description: 'Registrar acciones criticas: pagos procesados, disputas resueltas, cuentas baneadas, canales suspendidos. Middleware que intercepte estas rutas y guarde en coleccion AuditLog.',
            files: ['middleware/', 'models/'] },
          { id: 't27', title: 'Terminos de servicio y privacidad', status: 'pending', priority: 'high',
            icon: FileText,
            description: 'Crear paginas legales: TOS y Privacy Policy. Checkbox obligatorio en registro. Campos acceptedTOS y tosVersion en modelo Usuario. Paginas estaticas en el frontend.',
            files: ['models/Usuario.js', 'src/ui/pages/'] },
          { id: 't28', title: 'GDPR: exportar/eliminar datos', status: 'pending', priority: 'medium',
            icon: Users,
            description: 'Endpoint para exportar todos los datos del usuario en JSON (derecho de acceso). Endpoint para eliminar cuenta y datos asociados (derecho al olvido). Anonimizar reviews y transacciones en lugar de borrar.',
            files: ['controllers/authController.js', 'routes/auth.js'] },
          { id: 't29', title: '2FA opcional', status: 'pending', priority: 'low',
            icon: Lock,
            description: 'Autenticacion de dos factores con TOTP (Google Authenticator, Authy). Libreria speakeasy o otplib para generar secretos y verificar codigos. UI para activar/desactivar en settings.',
            files: ['controllers/authController.js', 'src/ui/pages/dashboard/'] },
        ]
      }
    ]
  },
  {
    id: 's7',
    title: 'Sprint 7 — Escalamiento y Premium',
    description: 'Optimizacion de rendimiento, features premium, expansion de plataformas y monetizacion',
    icon: TrendingUp,
    accent: '#f97316',
    categories: [
      {
        id: 'c71',
        title: '7.1 Optimizacion de rendimiento',
        icon: Zap,
        description: 'Mejorar velocidad y eficiencia de la plataforma',
        tasks: [
          { id: 't30', title: 'Code-splitting del frontend', status: 'pending', priority: 'high',
            icon: Code2,
            description: 'Implementar React.lazy() y Suspense para cargar paginas bajo demanda. Reducira el bundle inicial significativamente. Vite ya soporta code-splitting automatico con dynamic imports.',
            files: ['src/routes/AppRoutes.jsx', 'vite.config.js'] },
          { id: 't31', title: 'Redis cache para queries', status: 'pending', priority: 'medium',
            icon: Database,
            description: 'Cache de queries frecuentes: listado marketplace, stats de canales, analytics. Upstash Redis (serverless compatible) con TTL de 5-15 minutos. Invalidar cache en writes.',
            files: ['config/', 'controllers/'] },
          { id: 't32', title: 'CDN para assets estaticos', status: 'pending', priority: 'low',
            icon: Globe,
            description: 'Vercel ya sirve assets desde CDN pero optimizar headers de cache. Configurar immutable cache para hashed assets. Considerar Cloudflare si se necesita mas control.',
            files: ['vercel.json'] },
          { id: 't33', title: 'Indices MongoDB optimizados', status: 'pending', priority: 'medium',
            icon: Search,
            description: 'Analizar queries lentas con MongoDB profiler. Crear indices compuestos para: marketplace search (platform+verified+price), campaigns por estado, tracking por fecha. Los modelos ya definen indices basicos.',
            files: ['models/'] },
          { id: 't34', title: 'Pipeline de compresion de imagenes', status: 'pending', priority: 'low',
            icon: Image,
            description: 'Sharp ya esta instalado. Configurar pipeline automatico: resize a max 1200px, WebP conversion, quality 80%. Aplicar a avatares, logos de canales, y assets de campanas.',
            files: ['services/fileService.js'] },
        ]
      },
      {
        id: 'c72',
        title: '7.2 Funcionalidades premium',
        icon: Star,
        description: 'Features avanzados para usuarios power',
        tasks: [
          { id: 't35', title: 'Campanas programadas', status: 'pending', priority: 'medium',
            icon: Calendar,
            description: 'Permitir al advertiser programar publicacion en fecha/hora especifica. Agregar campo scheduledAt al modelo Campaign. El cron job verificaria campanas pendientes de publicacion.',
            files: ['models/Campaign.js', 'lib/campaignCron.js'] },
          { id: 't36', title: 'A/B testing de anuncios', status: 'pending', priority: 'low',
            icon: GitCompare,
            description: 'Crear 2 variantes de un anuncio, dividir trafico 50/50, medir CTR de cada variante. Requiere extension del modelo Campaign y logica en tracking.',
            files: ['models/Campaign.js', 'controllers/trackingController.js'] },
          { id: 't37', title: 'Remarketing', status: 'pending', priority: 'low',
            icon: Target,
            description: 'Re-target usuarios que clickearon en campanas previas. Requiere tracking de audiencias y matching de usuarios entre campanas del mismo advertiser.',
            files: ['controllers/trackingController.js'] },
          { id: 't38', title: 'Bulk campaigns mejorado', status: 'pending', priority: 'medium',
            icon: Layers,
            description: 'La funcionalidad basica existe pero mejorar: seleccion masiva de canales, aplicar descuento por volumen, dashboard de progreso de bulk campaign.',
            files: ['controllers/campaignController.js'] },
          { id: 't39', title: 'Reportes automaticos semanales', status: 'pending', priority: 'medium',
            icon: Mail,
            description: 'Email semanal con resumen: clicks totales, revenue, campanas completadas, top canales. Cron job semanal que genera y envia el reporte usando emailService.',
            files: ['services/emailService.js', 'lib/campaignCron.js'] },
          { id: 't40', title: 'API publica para advertisers', status: 'pending', priority: 'low',
            icon: Code2,
            description: 'REST API documentada para que advertisers creen campanas programaticamente. Autenticacion con API keys. Rate limiting dedicado. Ya existe Partner API como base.',
            files: ['routes/partnerApi.js'] },
        ]
      },
      {
        id: 'c73',
        title: '7.3 Expansion de plataformas',
        icon: Globe,
        description: 'Agregar soporte para mas plataformas de contenido',
        tasks: [
          { id: 't41', title: 'Twitter/X (API v2)', status: 'pending', priority: 'medium',
            icon: Globe, description: 'Integracion con Twitter API v2 para publicar tweets patrocinados. Verificacion de cuenta y analytics de engagement.', files: ['lib/platformConnectors.js'] },
          { id: 't42', title: 'TikTok Business API', status: 'pending', priority: 'medium',
            icon: Globe, description: 'Soporte para creadores de TikTok. API para verificar cuentas y obtener metricas de engagement.', files: ['lib/platformConnectors.js'] },
          { id: 't43', title: 'YouTube Community posts', status: 'pending', priority: 'low',
            icon: Globe, description: 'Publicar en la pestana Community de canales de YouTube. Usar YouTube Data API v3.', files: ['lib/platformConnectors.js'] },
          { id: 't44', title: 'LinkedIn Company pages', status: 'pending', priority: 'low',
            icon: Globe, description: 'Posts patrocinados en paginas de empresa de LinkedIn. Marketing API.', files: ['lib/platformConnectors.js'] },
          { id: 't45', title: 'Reddit y Twitch', status: 'pending', priority: 'low',
            icon: Globe, description: 'Reddit: posts patrocinados en subreddits. Twitch: integracion con canales de streaming para overlay ads.', files: ['lib/platformConnectors.js'] },
        ]
      },
      {
        id: 'c74',
        title: '7.4 Monetizacion avanzada',
        icon: DollarSign,
        description: 'Nuevas fuentes de revenue para la plataforma',
        tasks: [
          { id: 't46', title: 'Planes de suscripcion', status: 'pending', priority: 'high',
            icon: CreditCard, description: 'Free/Pro/Enterprise con limites diferenciados: canales, campanas/mes, analytics, soporte. Stripe Subscriptions para gestion de planes.', files: ['controllers/transaccionController.js', 'models/Usuario.js'] },
          { id: 't47', title: 'Comision variable por volumen', status: 'pending', priority: 'medium',
            icon: TrendingUp, description: 'Reducir comision del 10% al 7% o 5% para advertisers con alto volumen mensual. Tiers basados en spend acumulado.', files: ['config/config.js'] },
          { id: 't48', title: 'Programa de referidos', status: 'pending', priority: 'medium',
            icon: Users, description: 'Link de referido unico por usuario. Bonus de $X o reduccion de comision por cada usuario referido que complete su primera transaccion.', files: ['models/Usuario.js'] },
          { id: 't49', title: 'Marketplace de templates', status: 'pending', priority: 'low',
            icon: Palette, description: 'Templates pre-disenados de anuncios que advertisers pueden comprar/usar. Revenue adicional para la plataforma y para creators que creen templates.', files: [] },
        ]
      }
    ]
  }
]

/* ── Completed sprints (collapsed summary) ───────────────────── */
const COMPLETED_SPRINTS = [
  { title: 'Sprint 1 — Infraestructura base', items: 7, desc: 'Express, MongoDB, JWT, deploy Vercel' },
  { title: 'Sprint 2 — Marketplace core', items: 10, desc: 'CRUD canales, Stripe, dashboards, scoring' },
  { title: 'Sprint 3 — Automatizacion', items: 7, desc: 'Disputas, AutoBuy, notificaciones, cron' },
  { title: 'Sprint 4 — Tracking', items: 7, desc: 'Links cortos, analytics, verificacion canales' },
  { title: 'Sprint 5 — Features avanzados', items: 7, desc: 'Reviews, Swagger, PWA, 118+ tests, 6 plataformas' },
]

/* ── Priority config ─────────────────────────────────────────── */
const PRIORITY = {
  critical: { label: 'Critico',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
  high:     { label: 'Alto',     color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
  medium:   { label: 'Medio',    color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.25)' },
  low:      { label: 'Bajo',     color: '#64748b', bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.25)' },
}

/* ── Helpers ──────────────────────────────────────────────────── */
function countTasks(sprint) {
  return sprint.categories.reduce((sum, cat) => sum + cat.tasks.length, 0)
}

function countByPriority(sprint, priority) {
  return sprint.categories.reduce(
    (sum, cat) => sum + cat.tasks.filter(t => t.priority === priority).length, 0
  )
}

/* ── Components ──────────────────────────────────────────────── */

function ProgressBar({ value, max, color = A, height = 6 }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: height, height, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: height,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        transition: 'width 0.5s ease'
      }} />
    </div>
  )
}

function PriorityBadge({ priority }) {
  const p = PRIORITY[priority]
  if (!p) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      padding: '2px 8px', borderRadius: 6,
      color: p.color, background: p.bg, border: `1px solid ${p.border}`
    }}>
      {p.label}
    </span>
  )
}

function TaskItem({ task, isExpanded, onToggle }) {
  const Icon = task.icon || Circle
  return (
    <div style={{
      background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
      borderRadius: 12, transition: 'background 0.2s',
      border: isExpanded ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', color: '#f5f5f7',
        }}
      >
        {isExpanded
          ? <ChevronDown size={14} style={{ color: A, flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ color: '#64748b', flexShrink: 0 }} />
        }
        <Icon size={16} style={{ color: task.status === 'done' ? '#22c55e' : '#64748b', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </button>

      {isExpanded && (
        <div style={{ padding: '0 14px 14px 44px', animation: 'fadeIn 0.2s ease' }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#94a3b8', margin: '0 0 10px' }}>
            {task.description}
          </p>
          {task.files && task.files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {task.files.map(f => (
                <span key={f} style={{
                  fontSize: 11, fontFamily: 'monospace', padding: '3px 8px', borderRadius: 6,
                  background: AG(0.1), color: A, border: `1px solid ${AG(0.2)}`
                }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CategorySection({ category, expandedTasks, toggleTask }) {
  const [isOpen, setIsOpen] = useState(true)
  const CatIcon = category.icon || Layers

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: '#f5f5f7'
        }}
      >
        {isOpen
          ? <ChevronDown size={16} style={{ color: A }} />
          : <ChevronRight size={16} style={{ color: '#64748b' }} />
        }
        <CatIcon size={18} style={{ color: A }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{category.title}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{category.description}</div>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#64748b',
          background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8
        }}>
          {category.tasks.length} tareas
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 10px 10px' }}>
          {category.tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SprintSection({ sprint, expandedTasks, toggleTask }) {
  const [isOpen, setIsOpen] = useState(true)
  const Icon = sprint.icon || Rocket
  const totalTasks = countTasks(sprint)
  const criticalCount = countByPriority(sprint, 'critical')
  const highCount = countByPriority(sprint, 'high')

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20, overflow: 'hidden',
    }}>
      {/* Sprint header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '20px 22px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', color: '#f5f5f7'
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${sprint.accent}22, ${sprint.accent}44)`,
          border: `1px solid ${sprint.accent}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Icon size={20} style={{ color: sprint.accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{sprint.title}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{sprint.description}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {criticalCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '3px 8px', borderRadius: 6 }}>
              {criticalCount} criticos
            </span>
          )}
          {highCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.12)', padding: '3px 8px', borderRadius: 6 }}>
              {highCount} altos
            </span>
          )}
          <span style={{
            fontSize: 13, fontWeight: 700, color: sprint.accent,
            background: `${sprint.accent}15`, padding: '4px 12px', borderRadius: 8
          }}>
            {totalTasks} tareas
          </span>
          {isOpen
            ? <ChevronDown size={18} style={{ color: '#64748b' }} />
            : <ChevronRight size={18} style={{ color: '#64748b' }} />
          }
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sprint.categories.map(cat => (
            <CategorySection key={cat.id} category={cat} expandedTasks={expandedTasks} toggleTask={toggleTask} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Filters ─────────────────────────────────────────────────── */

function FilterBar({ filter, setFilter }) {
  const options = [
    { value: 'all', label: 'Todas' },
    { value: 'critical', label: 'Criticas', color: '#ef4444' },
    { value: 'high', label: 'Altas', color: '#f97316' },
    { value: 'medium', label: 'Medias', color: '#eab308' },
    { value: 'low', label: 'Bajas', color: '#64748b' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Filter size={14} style={{ color: '#64748b' }} />
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Prioridad:</span>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => setFilter(o.value)}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8,
            border: filter === o.value ? `1px solid ${o.color || A}` : '1px solid rgba(255,255,255,0.08)',
            background: filter === o.value ? `${o.color || A}15` : 'transparent',
            color: filter === o.value ? (o.color || A) : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────────────── */

export default function TaskDashboard() {
  const [expandedTasks, setExpandedTasks] = useState(new Set())
  const [filter, setFilter] = useState('all')

  const toggleTask = (id) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Apply priority filter
  const filteredSprints = useMemo(() => {
    if (filter === 'all') return SPRINTS
    return SPRINTS.map(sprint => ({
      ...sprint,
      categories: sprint.categories
        .map(cat => ({ ...cat, tasks: cat.tasks.filter(t => t.priority === filter) }))
        .filter(cat => cat.tasks.length > 0)
    })).filter(s => s.categories.length > 0)
  }, [filter])

  const totalPending = SPRINTS.reduce((s, sp) => s + countTasks(sp), 0)
  const totalCompleted = COMPLETED_SPRINTS.reduce((s, sp) => s + sp.items, 0)
  const totalAll = totalPending + totalCompleted
  const pctDone = Math.round((totalCompleted / totalAll) * 100)

  const expandAll = () => {
    const all = new Set()
    SPRINTS.forEach(s => s.categories.forEach(c => c.tasks.forEach(t => all.add(t.id))))
    setExpandedTasks(all)
  }
  const collapseAll = () => setExpandedTasks(new Set())

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#f5f5f7' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        button:hover { opacity: 0.9; }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Header ────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: A, marginBottom: 12,
            background: AG(0.1), padding: '5px 14px', borderRadius: 8,
            border: `1px solid ${AG(0.2)}`
          }}>
            <Rocket size={14} /> ADFLOW Task Board
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '8px 0 6px', letterSpacing: '-0.02em' }}>
            Roadmap de desarrollo
          </h1>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 600 }}>
            Estado completo del proyecto. {totalAll} tareas totales, {totalCompleted} completadas, {totalPending} pendientes.
          </p>
        </div>

        {/* ── Progress overview ─────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
          marginBottom: 28
        }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progreso global</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', marginTop: 6 }}>{pctDone}%</div>
            <ProgressBar value={totalCompleted} max={totalAll} color="#22c55e" height={5} />
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{totalCompleted}/{totalAll} items</div>
          </div>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sprint 6</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: A, marginTop: 6 }}>{countTasks(SPRINTS[0])}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>tareas pendientes (produccion)</div>
          </div>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sprint 7</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316', marginTop: 6 }}>{countTasks(SPRINTS[1])}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>tareas futuras (escalamiento)</div>
          </div>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Criticas</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', marginTop: 6 }}>
              {SPRINTS.reduce((s, sp) => s + countByPriority(sp, 'critical'), 0)}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>tareas de maxima prioridad</div>
          </div>
        </div>

        {/* ── Completed sprints (summary) ──────────────── */}
        <div style={{
          background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>Sprints completados</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>{totalCompleted} items</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COMPLETED_SPRINTS.map(s => (
              <div key={s.title} style={{
                fontSize: 12, padding: '6px 12px', borderRadius: 8,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                color: '#94a3b8'
              }}>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>{s.title}</span>
                <span style={{ margin: '0 6px', color: '#334155' }}>|</span>
                {s.items} items — {s.desc}
              </div>
            ))}
          </div>
        </div>

        {/* ── Toolbar ──────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12, marginBottom: 20
        }}>
          <FilterBar filter={filter} setFilter={setFilter} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={expandAll} style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8'
            }}>
              Expandir todo
            </button>
            <button onClick={collapseAll} style={{
              fontSize: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8'
            }}>
              Colapsar todo
            </button>
          </div>
        </div>

        {/* ── Sprint sections ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filteredSprints.map(sprint => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              expandedTasks={expandedTasks}
              toggleTask={toggleTask}
            />
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────── */}
        <div style={{
          textAlign: 'center', marginTop: 48, padding: '20px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12, color: '#334155'
        }}>
          ADFLOW Task Board — Actualizado 31 Marzo 2026
        </div>
      </div>
    </div>
  )
}
