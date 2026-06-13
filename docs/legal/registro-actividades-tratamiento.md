# Registro de Actividades de Tratamiento (RAT) — Channelad

> **Documento interno de cumplimiento — GDPR art. 30 / LOPDGDD art. 31.**
> Base fáctica extraída del código (modelos, integraciones y `.env.example`) el 2026-06-05.
> Estado: **borrador de trabajo**. Pendiente de cerrar con el informe legal en curso y de rellenar los datos registrales una vez constituida la sociedad.

---

## 0. Responsable del tratamiento

| Campo | Valor |
|---|---|
| Titular (persona física) | **Rafa Ferrer Castells** — DNI 49232216A |
| Marca / plataforma | **Channelad** (channelad.io) |
| DNI / NIF | 49232216A |
| Domicilio | Ptda. Tapidad Marraix, 204, Finestrat (Alicante) |
| Contacto privacidad | contact@channelad.io |
| DPO / Delegado | *(no designado — ver §5: evaluar si es preceptivo art. 37 GDPR)* |

> **Nota de roles:** Channelad es **RESPONSABLE** del tratamiento de los datos de sus usuarios (creators/admins, anunciantes y leads). Los proveedores técnicos (§3) son **ENCARGADOS**. Las plataformas sociales conectadas por OAuth (Meta/WhatsApp, Telegram, Discord, LinkedIn, Google) actúan como **responsables independientes o corresponsables** según el flujo.

---

## 1. Categorías de interesados

1. **Creators / admins de canal** (titulares de los canales de WhatsApp y otras redes).
2. **Anunciantes** (marcas/empresas que contratan campañas).
3. **Leads / lista de espera** (waitlist de marca fundadora, calculadora).
4. **Audiencia final** (suscriptores de los canales) — tratada de forma **agregada** (recuentos, métricas), sin identificar individuos.
5. **Visitantes web** (tracking de conversiones por click).

---

## 2. Actividades de tratamiento

### 2.1 Gestión de cuentas de usuario (creators y anunciantes)
- **Datos:** email, nombre, apellido, teléfono, contraseña (hash bcrypt), rol, biografía/perfil, ID Google OAuth, secreto 2FA + backup codes, IP y user-agent de las sesiones. *(Modelo `models/Usuario.js`)*
- **Finalidad:** registro, autenticación, prestación del servicio, seguridad.
- **Base jurídica:** ejecución de contrato (art. 6.1.b); interés legítimo en seguridad (art. 6.1.f).
- **Conservación:** mientras la cuenta esté activa + plazos legales (ver 2.6). Sesiones: expiran a 7 días (refresh).
- **Encargados:** MongoDB Atlas (BD).

### 2.2 Facturación y obligaciones fiscales
- **Datos:** NIF, razón social, dirección, CP, ciudad, provincia, país, email de facturación, flag VIES; facturas inmutables (emisor/receptor, líneas, base, IVA, total). *(`Usuario.datosFacturacion`, `models/Factura.js`)*
- **Finalidad:** emisión de facturas, cumplimiento fiscal y contable.
- **Base jurídica:** obligación legal (art. 6.1.c) — RD 1619/2012; LGT.
- **Conservación:** facturas inmutables; **mín. 6 años** (Código de Comercio art. 30) / 4 años (LGT) según el cómputo más exigente.

### 2.3 Pagos, wallet y payouts (modelo advertiser-paid + escrow)
- **Datos:** importes (EUR), `stripePaymentIntentId`, `stripeClientSecret`, `stripeConnectAccountId`, comisión por tier, datos bancarios/PayPal de retirada (IBAN enmascarado/últimos 4). *(`models/Campaign.js`, `Transaccion.js`, `payoutController`)*
- **Finalidad:** cobro al anunciante, retención en garantía hasta verificación de publicación, liquidación al creator (100% de su tarifa; comisión on-top), retiradas.
- **Base jurídica:** ejecución de contrato (art. 6.1.b); obligación legal en KYC/AML.
- **Encargado:** **Stripe** (pagos + Stripe Connect + KYC). Channelad **no** almacena documentos KYC localmente.
- **Conservación:** registros de transacción y payout inmutables; plazos fiscales/contables.

### 2.4 Conexión y verificación de canales
- **Datos sensibles de cuenta:** tokens de bot (Telegram, Discord), tokens OAuth (Meta/Instagram **cifrados** en BD, LinkedIn), `phoneNumberId` y número de WhatsApp Business, **credenciales/sesiones Baileys** (`creds`+`keys` de WhatsApp Web). *(`models/Canal.js`, `models/BaileysSession.js`)*
- **Consentimiento de vinculación WhatsApp:** `consentAcceptedAt`, `consentVersion`, `consentIp`, `consentUserAgent` + entrada en `WhatsAppAuditLog`. OTP de verificación con TTL 15–30 min.
- **Finalidad:** verificar titularidad del canal, publicar campañas, medir audiencia.
- **Base jurídica:** ejecución de contrato (art. 6.1.b); consentimiento para la vinculación (art. 6.1.a).
- **⚠️ Hallazgo de seguridad:** `BaileysSession.creds`/`keys` se guardan en **base64 sin cifrar** (a diferencia de las credenciales de `Canal`, que sí se cifran). Riesgo art. 32 GDPR. *(Ver tarea de seguridad derivada.)*

### 2.5 Datos de audiencia / métricas de canal
- **Datos:** recuentos de suscriptores, JID del newsletter/grupo, metadatos del canal, métricas de post **agregadas** (vistas, reacciones, CTR), nº de participantes de grupo. *(`Canal.botConfig`, `BaileysSession.newsletters[]`, `WhatsAppAuditLog`)*
- **Finalidad:** pricing, scoring, reporting a anunciantes.
- **Base jurídica:** interés legítimo (art. 6.1.f).
- **Conservación:** `WhatsAppAuditLog` con **TTL 365 días**.
- **Nota:** no se capturan datos personales de suscriptores individuales ni el contenido de mensajes → la audiencia **no** es, hoy, dato personal directamente identificable por Channelad.

### 2.6 Marketing, leads y lista de espera
- **Datos:** email, handle, nicho, plataforma, tamaño, token de referido, IP, user-agent, `source` (UTM); **doble opt-in** (`confirmToken`, `confirmedAt`). *(`models/FounderRegistration.js`, `routes/founderWaitlist.js`)*
- **Finalidad:** captación, lista de espera de marca fundadora, comunicaciones comerciales.
- **Base jurídica:** consentimiento (art. 6.1.a) con doble opt-in.
- **Conservación:** hasta baja/retirada del consentimiento.

### 2.7 Tracking de conversiones (visitantes web)
- **Datos:** `clickId`, `uid` (cookie persistente 90 días), IP, user-agent, referer, valor/tipo de conversión. *(`models/Conversion.js`, `TrackingFingerprint` TTL 90 días)*
- **Finalidad:** atribución de campañas, medición de ROI.
- **Base jurídica:** consentimiento de cookies (art. 22.2 LSSI) + interés legítimo para la atribución.
- **Conservación:** fingerprints 90 días; conversiones, indefinido (auditoría) — *revisar minimización.*

### 2.8 Notificaciones y comunicaciones transaccionales
- **Datos:** email; suscripciones push (endpoint + claves p256dh/auth). *(`services/emailService.js`, `Usuario.pushSubscriptions`)*
- **Base jurídica:** ejecución de contrato / consentimiento (push).
- **Encargados:** proveedor SMTP (Gmail/SendGrid/Mailgun vía Nodemailer); servicio de push del navegador (FCM/APNs).

---

## 3. Encargados del tratamiento (subprocesadores) — requieren DPA art. 28

| Encargado | Tratamiento | Datos | Ubicación / transferencia |
|---|---|---|---|
| **Stripe** | Pagos, Stripe Connect, KYC | Email, datos fiscales, importes, IDs de pago, cuenta bancaria | EE. UU. → **DPF + SCCs** |
| **MongoDB Atlas** | Base de datos | Todos los modelos | UE (Frankfurt/Irlanda) si así se aprovisiona |
| **Cloudflare R2** | Almacenamiento de media de campañas | Imágenes/vídeos/documentos | Confirmar región/SCCs |
| **Proveedor SMTP** (Gmail / SendGrid / Mailgun) | Email transaccional | Email + contenido | EE. UU. → SCCs (según proveedor) |
| **Redis** | OTP, rate-limit, estado de sesión | Teléfono (OTP temporal), IP | Según hosting |
| **Sentry** | Monitorización de errores | IP, user-agent, ruta, ID de usuario | EE. UU. → SCCs |
| **Vercel / Fly.io** | Hosting (web / sidecar Baileys) | Tráfico, logs | EE. UU. → SCCs |

**Responsables independientes / corresponsables (OAuth):** Meta/WhatsApp, Instagram, Telegram, Discord, LinkedIn, Google. Cada plataforma trata datos bajo su propia política; revisar si el intercambio bidireccional configura **corresponsabilidad** (art. 26) — especialmente Meta/WhatsApp.

---

## 4. Derechos de los interesados

Acceso, rectificación, supresión, oposición, limitación, portabilidad (arts. 15-22 GDPR). Canal: contact@channelad.io, resolución en **1 mes**.

> **Hueco técnico:** no existen endpoints de autoservicio para exportación (art. 15/20) ni supresión (art. 17), ni mecanismo expuesto de **retirada de consentimiento** de la sesión Baileys (existe `markRevoked()` pero no está expuesto al usuario).

---

## 5. Huecos de cumplimiento detectados (acciones)

1. **Evidencia de aceptación de términos en el registro** — `routes/auth.js` no captura `acceptedTermsAt` ni `acceptedTermsVersion` (art. 7 GDPR: hay que poder probar el consentimiento/aceptación). **Acción:** añadir casilla + sellado de versión y timestamp.
2. **DPA con cada encargado** (art. 28) — formalizar contrato de encargo con Stripe, Atlas, R2, SMTP, Sentry, hosting.
3. **DPA "inverso" creator/anunciante** — definir si Channelad actúa como encargado de algún dato del anunciante/creator o si todos son responsables independientes (a cerrar con el informe legal).
4. **Cifrado de credenciales Baileys** (art. 32) — cifrar `creds`/`keys` como ya se hace con `Canal.credenciales`.
5. **Endpoints de derechos (DSR)** — exportación y supresión; retirada de consentimiento WhatsApp.
6. **Designación de DPO** — evaluar art. 37 (observación a gran escala / categorías especiales). Probablemente no preceptivo hoy, documentar la valoración.
7. **Minimización en `Conversion`** — definir plazo de borrado/anonimización.
8. **Transparencia publicitaria (DSA)** — formalizar cómo el creator identifica el contenido patrocinado.

---

*Este RAT se actualizará al cerrar el informe legal (España + UE) y al constituir la sociedad. Los borradores de NDA, DPA, cláusulas de aceptación y aviso de privacidad se apoyarán en este inventario.*
