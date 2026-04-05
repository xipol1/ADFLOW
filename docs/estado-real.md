# Estado real del repositorio — Actualizado 1 Abril 2026

## Resumen ejecutivo

ADFLOW es un marketplace de publicidad en comunidades reales (WhatsApp, Telegram, Discord, Instagram, Newsletter, Facebook). El proyecto tiene un **backend completo funcional** (20 modelos, 18 controladores, 18 rutas, 19 servicios), **frontend React con 28 paginas y dashboards por rol**, **sistema de pagos Stripe**, **tracking avanzado de links**, **verificacion de canales**, **reviews con 5 categorias**, **analytics con export CSV**, **documentacion legal completa** y **documentacion Swagger con 48+ endpoints**.

**URL produccion:** https://adflow-unified.vercel.app
**Swagger docs:** https://adflow-unified.vercel.app/api/docs/

### Metricas del codigo

| Metrica | Valor |
|---------|-------|
| Lineas de codigo backend | ~13,800 |
| Modelos Mongoose | 20 |
| Controladores | 18 |
| Rutas | 18 archivos |
| Servicios | 19 |
| Paginas frontend | 28 |
| Email templates | 14 |
| Tests | 118+ (12 suites) |
| Documentos legales | 5 |
| Dependencias produccion | ~76 |

---

## 1) Estado de controladores (18)

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
| `userListController` | ✅ Completo | CRUD listas de favoritos |
| `channelListController` | ✅ Completo | Listas publicas de canales |

## 2) Estado de modelos (20)

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
| `ChannelList` | ✅ | Listas publicas de canales |
| `Notificacion (v2)` | ✅ | Notificaciones multi-canal |

## 3) Estado de rutas (18 archivos)

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
| `/api/partners/webhooks/*` | ✅ | Si (Stripe webhook) |
| `/t/:code` | ✅ | Si (tracking redirect) |
| `/r/:campaignId` | ✅ | Si (campaign redirect) |

## 4) Estado del frontend (28 paginas)

| Pagina | Estado | Datos reales |
|---|---|---|
| Landing page | ✅ | Canales del marketplace |
| Marketplace | ✅ | Busqueda y filtros reales |
| Login / Register | ✅ | Auth JWT real |
| Verificar email | ✅ | Token verification |
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

## 5) Middleware (7 modulos)

| Middleware | Estado | Funcion |
|---|---|---|
| `auth.js` | ✅ | JWT verification, role authorization, email check, ownership |
| `validarCampos.js` | ✅ | express-validator error handler |
| `rateLimiter.js` | ✅ | Rate limiting con MongoDB store |
| `partnerAuth.js` | ✅ | API key auth + audit logging |
| `partnerRequestContext.js` | ✅ | Request context for partners |
| `partnerIdempotency.js` | ✅ | Idempotency support |
| `notImplemented.js` | ✅ | 501 handler |

## 6) Servicios (19 modulos)

| Servicio | Estado | Funcion |
|---|---|---|
| `authService` | ✅ | JWT generation, email verification |
| `channelService` | ✅ | Channel CRUD, verification |
| `channelScoring` | ✅ | 5-factor scoring algorithm |
| `channelRankingService` | ✅ | Ranking y recomendaciones |
| `channelPricingService` | ✅ | Dynamic CPM pricing |
| `channelPerformanceService` | ✅ | Analytics aggregation |
| `campaignOptimizerService` | ✅ | Campaign optimization suggestions |
| `launchCampaignService` | ✅ | Campaign state machine |
| `notificationService` | ✅ | Multi-channel (DB, Socket.io, email, push) |
| `emailService` | ✅ | Nodemailer + 14 templates HTML |
| `fileService` | ✅ | Multer + Sharp image optimization |
| `webhookService` | ✅ | Stripe webhook handler |
| `partnerIntegrationService` | ✅ | Partner API routing |
| `SocialSyncService` | ✅ | Platform connector stubs |
| `channelListService` | ✅ | List operations |
| `publicationService` | ✅ | Ad publication automation |
| `persistentStore` | ✅ | JSON fallback storage |
| `demoData` | ✅ | Demo data generation |
| `api` | ✅ | Shared API utilities |

## 7) Integraciones de plataformas

| Plataforma | Modulo | Estado API | Credenciales |
|---|---|---|---|
| Telegram | ✅ Completo | Bot API, publish ads | ❌ Sin TELEGRAM_BOT_TOKEN |
| Discord | ✅ Completo | Guild API, embeds | ❌ Sin DISCORD_BOT_TOKEN |
| WhatsApp | ✅ Completo | Graph API, interactive | ❌ Sin WHATSAPP_BUSINESS_API_TOKEN |
| Instagram | ✅ Completo | Graph API, insights | ❌ Sin INSTAGRAM_ACCESS_TOKEN |
| Facebook | ✅ Completo | Page API, insights | ❌ Sin META_APP_ID |
| Newsletter | ✅ Completo | Estimacion + verificacion | N/A |

**Nota:** Los modulos estan completos con fallback a estimacion cuando las credenciales no estan disponibles.

## 8) Servicios de infraestructura

| Servicio | Estado | Nota |
|---|---|---|
| Stripe pagos | ✅ Codigo completo | ⚠️ Sin STRIPE_SECRET_KEY en prod (simula pagos) |
| Email transaccional | ✅ 14 templates HTML | ⚠️ Sin SMTP configurado (emails no se envian) |
| Push notifications | ✅ Codigo completo | ⚠️ Sin VAPID keys (push no funciona) |
| Socket.io realtime | ✅ Funcional local | ❌ No funciona en Vercel serverless |
| File uploads | ✅ Funcional local | ⚠️ Efimero en Vercel (necesita cloud storage) |
| Cron jobs | ✅ Funcional local | ❌ No ejecuta en Vercel serverless |
| Swagger docs | ✅ 48+ endpoints | Accesible en /api/docs/ |
| Documentacion legal | ✅ 5 documentos HTML | Aviso legal, privacidad, cookies, T&C, contratacion |

## 9) Documentacion legal

| Documento | Estado | Archivo |
|---|---|---|
| Aviso legal | ✅ | `docs/legal/aviso-legal.html` |
| Politica de privacidad | ✅ | `docs/legal/politica-privacidad.html` |
| Politica de cookies | ✅ | `docs/legal/politica-cookies.html` |
| Terminos y condiciones | ✅ | `docs/legal/terminos-condiciones.html` |
| Condiciones de contratacion | ✅ | `docs/legal/condiciones-contratacion.html` |

## 10) Limitaciones conocidas de Vercel Serverless

| Funcionalidad | Problema | Solucion recomendada |
|---|---|---|
| **Socket.io** | Sin conexiones persistentes | Migrar a Pusher/Ably, o usar polling |
| **Cron jobs** | setInterval no persiste | Usar Vercel Cron Functions o cron externo |
| **File uploads** | /tmp es efimero | Usar S3/Cloudinary/Vercel Blob |
| **Push notifications** | Necesita VAPID keys | Generar con `web-push generate-vapid-keys` |
| **Max duration** | 30s por request | Usar queues para operaciones largas |

## 11) Variables de entorno necesarias para produccion completa

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

## 12) Tests

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
| marketplace.test.js | - | ✅ Creados |
| integration.persistence.test.js | - | ✅ Creados |
| partner-api.integration.test.js | - | ✅ Creados |
| **Total** | **118+** | **12 suites** |

## 13) Scripts disponibles

| Script | Comando | Descripcion |
|---|---|---|
| Produccion | `npm start` | `node server.js` |
| Desarrollo | `npm run dev` | `nodemon server.js` |
| Frontend dev | `npm run frontend:dev` | Vite dev server (HMR) |
| Full dev | `npm run dev:full` | Backend + frontend en paralelo |
| Build | `npm run build` | Build frontend (Vite -> dist/) |
| Tests | `npm test` | Jest (smoke + integracion) |
| Lint | `npm run lint` | ESLint check |
| Lint fix | `npm run lint:fix` | ESLint auto-fix |
| Migrate roles | `npm run migrate:roles` | Migracion de roles |
| Seed | `node scripts/seed.js` | Datos de demo |
| Partner setup | `node scripts/provision-partner.js` | Crear partner |
| Smoke test | `node scripts/smoke-channels.js` | Smoke test canales |
| Report | `node scripts/generate-report.js` | Generar reporte |

## 14) Resumen de completitud

| Area | Completitud | Nota |
|---|---|---|
| Backend API | 95% | Solo falta admin avanzado |
| Frontend | 90% | Admin dashboard basico |
| Pagos (Stripe) | 100% codigo / 0% config | Sin claves en produccion |
| Email | 100% codigo / 0% config | Sin SMTP en produccion |
| Push notifications | 100% codigo / 0% config | Sin VAPID keys |
| Real-time | 100% local / 0% prod | Socket.io no funciona en serverless |
| Platform connectors | 100% codigo / 0% config | Sin tokens de plataformas |
| Tracking & analytics | 100% | Fully operational |
| Channel verification | 100% | Fully operational |
| Reviews & ratings | 100% | Fully operational |
| Disputes | 100% | Fully operational |
| AutoBuy | 100% | Fully operational |
| Partner API | 100% | Fully operational |
| Documentacion legal | 100% | 5 documentos HTML |
| Tests | 90% | 118+ tests, 12 suites |
| Documentacion tecnica | 95% | Swagger + docs/ |
