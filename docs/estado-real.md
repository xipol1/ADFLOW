# Estado real del repositorio — Actualizado 30 Marzo 2026

## Resumen ejecutivo

ADFLOW es un marketplace de publicidad en comunidades reales (WhatsApp, Telegram, Discord, Instagram, Newsletter, Facebook). El proyecto tiene un **backend completo funcional**, **frontend React con dashboards por rol**, **sistema de pagos Stripe**, **tracking avanzado de links**, **verificacion de canales**, **reviews**, **analytics** y **documentacion Swagger**.

**URL produccion:** https://adflow-unified.vercel.app
**Swagger docs:** https://adflow-unified.vercel.app/api/docs/

---

## 1) Estado de controladores

| Controlador | Estado | Endpoints |
|---|---|---|
| `authController` | ✅ Completo | Login, registro, perfil, refresh token, cambiar password, verificar email |
| `canalController` | ✅ Completo | CRUD canales creator, actualizar campos extendidos |
| `channelsController` | ✅ Completo | Listado publico, detalle, busqueda, disponibilidad |
| `campaignController` | ✅ Completo | Ciclo completo DRAFT->PAID->PUBLISHED->COMPLETED, chat |
| `transaccionController` | ✅ Completo | Checkout Stripe, PaymentIntent, webhooks, retiros |
| `trackingController` | ✅ Completo | Links trackeables, verificacion canales, conversion URLs |
| `reviewController` | ✅ Completo | CRUD reviews, respuestas, helpful/report, agregados |
| `analyticsController` | ✅ Completo | Analytics creator/advertiser/canal/campana, export CSV |
| `disputeController` | ✅ Completo | Crear, mensajes, resolver |
| `notificationController` | ✅ Completo | CRUD notificaciones, marcar leidas |
| `autoBuyController` | ✅ Completo | CRUD reglas, trigger |
| `estadisticaController` | ✅ Completo | Stats generales + analytics avanzados |
| `pushController` | ✅ Completo | Subscribe/unsubscribe push notifications |
| `fileController` | ⚠️ Funcional local | Upload/download funciona pero archivos se pierden en Vercel |
| `anuncioController` | ⚠️ Basico | CRUD basico, flujo de aprobacion parcial |
| `scoringController` | ✅ Completo | Calculo score 5 factores |

## 2) Estado de modelos (18 modelos)

| Modelo | Estado | Descripcion |
|---|---|---|
| `Usuario` | ✅ | Auth, roles, sesiones, push subscriptions |
| `Canal` | ✅ | Canales con credenciales, stats, verificacion |
| `Campaign` | ✅ | Ciclo de vida completo con Stripe y tracking |
| `Transaccion` | ✅ | Pagos, reembolsos, comisiones, retiros |
| `TrackingLink` | ✅ | Links cortos con analytics ricos (device, country, UTM) |
| `Review` | ✅ | Reviews con 5 categorias, respuestas, moderacion |
| `Dispute` | ✅ | Disputas con mensajes y resolucion |
| `AutoBuyRule` | ✅ | Reglas de compra automatica |
| `UserList` | ✅ | Listas de favoritos |
| `Notificacion` | ✅ | Notificaciones con prioridad y expiracion |
| `CampaignMessage` | ✅ | Chat de campana |
| `ChannelMetrics` | ✅ | Metricas de rendimiento |
| `Retiro` | ✅ | Solicitudes de retiro |
| `Archivo` | ✅ | Metadata de archivos |
| `Anuncio` | ✅ | Gestion de anuncios |
| `Partner` | ✅ | Integraciones externas |
| `PartnerAuditLog` | ✅ | Auditoria de partners |
| `Estadistica` | ✅ | Snapshots de estadisticas |

## 3) Estado de rutas (17 archivos)

| Ruta | Estado | Operativa |
|---|---|---|
| `/api/auth/*` | ✅ | Si |
| `/api/canales/*` | ✅ | Si |
| `/api/channels/*` | ✅ | Si |
| `/api/campaigns/*` | ✅ | Si |
| `/api/transacciones/*` | ✅ | Si |
| `/api/tracking/*` | ✅ | Si |
| `/api/reviews/*` | ✅ | Si |
| `/api/estadisticas/*` | ✅ | Si |
| `/api/disputes/*` | ✅ | Si |
| `/api/lists/*` | ✅ | Si |
| `/api/autobuy/*` | ✅ | Si |
| `/api/notifications/*` | ✅ | Si |
| `/api/files/*` | ⚠️ | Si (efimero en Vercel) |
| `/api/anuncios/*` | ⚠️ | Parcial |
| `/api/partners/*` | ✅ | Si |
| `/t/:code` | ✅ | Si (tracking redirect) |
| `/r/:campaignId` | ✅ | Si (campaign redirect) |

## 4) Estado del frontend (28+ paginas)

| Pagina | Estado | Datos reales |
|---|---|---|
| Landing page | ✅ | Canales del marketplace |
| Marketplace | ✅ | Busqueda y filtros reales |
| Login / Register | ✅ | Auth JWT real |
| **Creator Dashboard** | | |
| - Overview | ✅ | KPIs desde API |
| - Channels | ✅ | CRUD canales reales |
| - Register Channel | ✅ | 5 pasos con verificacion |
| - Requests | ✅ | Campanas recibidas |
| - Earnings | ✅ | Ganancias y retiros |
| - Disputes | ✅ | Disputas reales |
| - Settings | ✅ | Configuracion cuenta |
| **Advertiser Dashboard** | | |
| - Overview | ✅ | KPIs desde API |
| - Explore | ✅ | Marketplace filtrado |
| - Ads/Campaigns | ✅ | Pipeline campanas |
| - AutoBuy | ✅ | Gestion reglas |
| - Finances | ✅ | Wallet y transacciones |
| - Disputes | ✅ | Disputas reales |
| - Settings | ✅ | Configuracion cuenta |
| **Admin Dashboard** | ⚠️ | UI basica, backend parcial |

## 5) Integraciones de plataformas

| Plataforma | Modulo | Estado API | Credenciales |
|---|---|---|---|
| Telegram | ✅ Completo | Bot API, publish ads | ❌ Sin TELEGRAM_BOT_TOKEN |
| Discord | ✅ Completo | Guild API, embeds | ❌ Sin DISCORD_BOT_TOKEN |
| WhatsApp | ✅ Completo | Graph API, interactive | ❌ Sin WHATSAPP_BUSINESS_API_TOKEN |
| Instagram | ✅ Completo | Graph API, insights | ❌ Sin INSTAGRAM_ACCESS_TOKEN |
| Facebook | ✅ Completo | Page API, insights | ❌ Sin META_APP_ID |
| Newsletter | ✅ Completo | Estimacion + verificacion | N/A |

**Nota:** Los modulos estan completos con fallback a estimacion cuando las credenciales no estan disponibles.

## 6) Servicios de infraestructura

| Servicio | Estado | Nota |
|---|---|---|
| Stripe pagos | ✅ Codigo completo | ⚠️ Sin STRIPE_SECRET_KEY en prod (simula pagos) |
| Email transaccional | ✅ 14 templates HTML | ⚠️ Sin SMTP configurado (emails no se envian) |
| Push notifications | ✅ Codigo completo | ⚠️ Sin VAPID keys (push no funciona) |
| Socket.io realtime | ✅ Funcional local | ❌ No funciona en Vercel serverless |
| File uploads | ✅ Funcional local | ⚠️ Efimero en Vercel (necesita cloud storage) |
| Cron jobs | ✅ Funcional local | ❌ No ejecuta en Vercel serverless |
| Swagger docs | ✅ 48 endpoints | Accesible en /api/docs/ |

## 7) Limitaciones conocidas de Vercel Serverless

| Funcionalidad | Problema | Solucion recomendada |
|---|---|---|
| **Socket.io** | Sin conexiones persistentes | Migrar a Vercel + Pusher/Ably, o usar polling |
| **Cron jobs** | setInterval no persiste | Usar Vercel Cron Functions o cron externo |
| **File uploads** | /tmp es efimero | Usar S3/Cloudinary/Vercel Blob |
| **Push notifications** | Necesita VAPID keys | Generar con `web-push generate-vapid-keys` |

## 8) Variables de entorno necesarias para produccion completa

### Configuradas actualmente
- ✅ `MONGODB_URI`
- ✅ `JWT_SECRET` / `JWT_REFRESH_SECRET`
- ✅ `FRONTEND_URL`
- ✅ `NODE_ENV`
- ✅ `PLATFORM_COMMISSION_RATE`

### Pendientes de configurar
- ❌ `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- ❌ `EMAIL_PROVIDER` / `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS`
- ❌ `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL`
- ❌ `TELEGRAM_BOT_TOKEN`
- ❌ `DISCORD_BOT_TOKEN` / `DISCORD_CLIENT_ID`
- ❌ `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_CLIENT_ID`
- ❌ `WHATSAPP_BUSINESS_API_TOKEN` / `META_APP_ID`

## 9) Tests

| Suite | Tests | Estado |
|---|---|---|
| smoke.test.js | 6 | ✅ Pasan |
| auth.integration.test.js | 16 | ✅ Creados |
| channels.integration.test.js | 15 | ✅ Creados |
| campaigns.integration.test.js | 14 | ✅ Creados |
| tracking.integration.test.js | 13 | ✅ Creados |
| disputes.integration.test.js | 12 | ✅ Creados |
| reviews.integration.test.js | 14 | ✅ Creados |
| lists-autobuy.integration.test.js | 16 | ✅ Creados |
| notifications.integration.test.js | 12 | ✅ Creados |
| **Total** | **118+** | |
