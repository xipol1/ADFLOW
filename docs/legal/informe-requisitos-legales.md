# Informe — Qué deben firmar/aceptar el admin (creator) y el anunciante

> **Ámbito:** España + UE (GDPR). **Titular:** Rafa Ferrer Castells *(persona física — DNI 49232216A; hasta la constitución de la sociedad)*, marca **Channelad**.
> **Fecha:** 2026-06-05. **Estado:** borrador de trabajo (v0.9) — pendiente de cotejo con la investigación legal en curso y de **validación por abogado colegiado**. No constituye asesoramiento jurídico.

---

## 1. Respuesta corta

**Sí.** Tanto el **admin/creator** como el **anunciante** deben aceptar un conjunto de documentos antes de operar. La mayor parte se articula como **aceptación electrónica (clickwrap)** con prueba (sello de tiempo, IP y versión); algunos (NDA, DPA) pueden requerir **firma**. Se agrupan en tres bloques: **(A) términos contractuales**, **(B) confidencialidad** y **(C) tratamiento de datos**.

| Bloque | Admin / Creator | Anunciante |
|---|---|---|
| **A. Términos** | T&C + **Condiciones del Creador** (incl. declaración de titularidad del canal) | T&C + **Condiciones de Contratación** + **Condiciones del Anunciante** |
| **B. Confidencialidad** | NDA o cláusula de confidencialidad (recomendado) | NDA o cláusula de confidencialidad (recomendado) |
| **C. Datos** | Política de Privacidad (información) + **consentimiento de vinculación** + DPA *si aplica* | Política de Privacidad + **DPA (obligatorio si Channelad trata datos de conversión por su cuenta)** |

---

## 2. Marco normativo aplicable

| Norma | Qué regula aquí |
|---|---|
| **RGPD** — Reglamento (UE) 2016/679 | Bases jurídicas (art. 6), consentimiento y su prueba (art. 7), información (arts. 13-14), derechos (15-22), corresponsables (26), **encargado/DPA (28)**, registro de actividades (30), seguridad (32), brechas (33-34), transferencias (44-49) |
| **LOPDGDD** — LO 3/2018 | Desarrollo nacional del RGPD; DPO; régimen sancionador |
| **LSSI-CE** — Ley 34/2002 | Información del prestador (art. 10), **comunicaciones comerciales identificables (art. 20)**, **cookies (art. 22.2)**, contratación electrónica |
| **TRLGDCU** — RDL 1/2007 | Solo si alguna parte actúa como **consumidor**: desistimiento, cláusulas abusivas, **fuero del consumidor (art. 90.2)** |
| **Cód. Civil / Cód. de Comercio** | Validez de los contratos mercantiles; conservación de documentación (6 años) |
| **Ley 3/1991 Competencia Desleal** | **Publicidad encubierta (art. 26)**, engaño/omisiones (arts. 5 y 7) |
| **Ley 34/1988 General de Publicidad** | Publicidad ilícita/engañosa |
| **Ley 1/2019 Secretos Empresariales** | Base de la confidencialidad (protección de métricas, tarifas, know-how) |
| **DSA** — Reglamento (UE) 2022/2065 | **Transparencia de la publicidad (art. 26, aplica a toda plataforma en línea)**, condiciones claras (art. 14), notice-and-action (art. 16, servicios de alojamiento), puntos de contacto (arts. 11-12). El **art. 30** (trazabilidad de comerciantes/KYBC) **no aplica**: no hay contratación de consumidores con comerciantes vía plataforma |
| **P2B** — Reglamento (UE) 2019/1150 | Aplica a la intermediación que permite a profesionales **ofrecer a consumidores**; la pata B2B (anunciante↔creator) puede quedar **fuera** → analizar caso a caso. Si aplica: condiciones (art. 3), restricción/suspensión (art. 4), **ranking (art. 5)**. Las **pequeñas empresas (<50 empleados y ≤10 M€) están EXENTAS** del sistema interno de reclamaciones (art. 11) y de mediación (art. 12) |
| **LGCA** — Ley 13/2022 + **RD 444/2024** | Régimen del "**usuario de especial relevancia**" (influencers): umbrales ≥300.000 €/año + ≥1 M seguidores + ≥24 vídeos/año → registro estatal y deberes reforzados en comunicaciones comerciales |
| **Ley 10/2010 (PBC/FT)** | KYC/AML en pagos y retiradas |
| **RD 1619/2012 / LGT** | Facturación y conservación |
| **Reglamento (CE) 1924/2006** | Alegaciones nutricionales/salud (relevante por el nicho cocina/dieta) |

---

## 3. Qué firma/acepta el ADMIN (creator)

| Documento | Carácter | Base legal | Por qué | Estado |
|---|---|---|---|---|
| **T&C de Uso** (clickwrap) | Obligatorio | Cód. Civil; P2B | Marco contractual de la plataforma | ✅ Existe (rebrandeado) |
| **Condiciones del Creador** (clickwrap, con casillas) | Obligatorio | Cód. Civil; LSSI; DSA; LCD | Obligaciones de publicación, veracidad de métricas, **transparencia publicitaria**, naturaleza mercantil (autónomo/IVA) | 🟡 **Borrador nuevo** |
| **Declaración de titularidad del canal** (casilla / declaración responsable) | Obligatorio | Responsabilidad civil; IP | Traslada al creator la responsabilidad de que el canal es suyo y los datos son veraces | 🟡 Incluida en Condiciones del Creador |
| **Consentimiento de vinculación / acceso a métricas** | Obligatorio | RGPD art. 6.1.a/b | Autoriza el acceso técnico al canal; revocable | ✅ Ya se captura (`consentAcceptedAt`/IP/UA en BaileysSession) |
| **Política de Privacidad** (entrega/información) | Obligatorio | RGPD arts. 13-14 | Deber de informar; no requiere firma pero sí evidencia de puesta a disposición | ✅ Existe (rebrandeada) |
| **NDA / Confidencialidad** | Recomendado | Ley 1/2019 | Protege tarifas, métricas, lista de anunciantes | 🟡 **Borrador nuevo** |
| **DPA (encargo art. 28)** | Solo si aplica | RGPD art. 28 | Únicamente si Channelad tratara datos personales de la **audiencia** por cuenta del creator. Hoy los datos de audiencia son **agregados** (recuentos/JIDs/métricas) → en principio **no** se requiere; documentar la valoración | 🟡 Plantilla disponible |

---

## 4. Qué firma/acepta el ANUNCIANTE

| Documento | Carácter | Base legal | Por qué | Estado |
|---|---|---|---|---|
| **T&C de Uso** (clickwrap) | Obligatorio | Cód. Civil; P2B | Marco contractual | ✅ Existe |
| **Condiciones de Contratación** | Obligatorio | Cód. Civil; LSSI; TRLGDCU | Reglas de la contratación de campañas (pago, escrow, desistimiento) | ✅ Existe (rebrandeada) |
| **Condiciones del Anunciante** (clickwrap, con casillas) | Obligatorio | LGP; LCD; DSA | **Garantías de legalidad/veracidad del contenido**, titularidad de IP, **indemnidad** a Channelad y al creator | 🟡 **Borrador nuevo** |
| **Política de Privacidad** (información) | Obligatorio | RGPD arts. 13-14 | Deber de informar | ✅ Existe |
| **DPA (encargo art. 28)** | **Obligatorio si aplica** | RGPD art. 28 | Cuando Channelad trate **datos de conversión/leads por cuenta del anunciante**, Channelad es **encargado** y la firma del DPA es obligatoria | 🟡 **Borrador nuevo** |
| **NDA / Confidencialidad** | Recomendado | Ley 1/2019 | Protege tarifas y métricas compartidas en la negociación (p. ej. con marcas como Cosori) | 🟡 **Borrador nuevo** |

---

## 5. Bloque B — Confidencialidad (detalle)

- **No existe obligación legal general** de firmar un NDA. La **Ley 1/2019 de Secretos Empresariales** protege la información incluso sin contrato **si** se adoptan "medidas razonables para mantenerla en secreto" (art. 1.1).
- **Recomendación:** firmar/aceptar el **NDA mutuo** (o, como mínimo, incluir una **cláusula de confidencialidad** en las condiciones de cada parte). Es la "medida razonable" que activa la protección reforzada y permite reclamar daños y **medidas cautelares**.
- **Cubre:** tarifas y condiciones económicas, métricas y datos de audiencia, listas de anunciantes/creators, algoritmos de pricing/scoring, términos de negociación.

---

## 6. Bloque C — Tratamiento de datos (roles y documentos)

**Roles (del [RAT](registro-actividades-tratamiento.md)):**
- **Channelad = RESPONSABLE** de los datos de creators, anunciantes, leads y visitantes.
- **Proveedores = ENCARGADOS** de Channelad (Stripe, MongoDB Atlas, Cloudflare R2, SMTP, Redis, Sentry, hosting) → Channelad debe **tener firmado/aceptado un DPA art. 28 con cada uno** (normalmente aceptando sus DPA estándar).
- **Entre Channelad y creator/anunciante:** por regla general, **responsables independientes**. Hay **encargo (art. 28)** en supuestos concretos:
  - Channelad trata **datos de conversión/leads por cuenta del anunciante** → Channelad **encargado del anunciante** (DPA obligatorio).
  - Posible **corresponsabilidad (art. 26)** en flujos OAuth con plataformas (p. ej. Meta/WhatsApp): valorar acuerdo de corresponsables.
- **Audiencia de WhatsApp:** hoy solo datos **agregados** (recuentos/JIDs/métricas), sin PII individual → no convierte a Channelad en encargado del creator. Si en el futuro se tratan datos individuales de suscriptores, habría que firmar DPA con el creator.

**Documentos del bloque de datos:**
1. **Política de Privacidad** (información, arts. 13-14) — ✅ existe, actualizar destinatarios/encargados conforme al RAT.
2. **DPA / Acuerdo de Encargo** (art. 28) — 🟡 borrador nuevo (reversible: sirve para proveedores y para el supuesto Channelad-encargado-del-anunciante).
3. **Consentimiento** (art. 7) — separado, granular, revocable; doble opt-in para marketing (ya implementado en la waitlist).
4. **RAT** (art. 30) — ✅ creado.

---

## 7. Mecanismo de aceptación válido (clave para que tenga valor)

El RGPD (art. 7.1) exige **poder demostrar** la aceptación. Para que sea oponible:
- **Clickwrap** con casilla **activa y no premarcada** (no vale "navegar = aceptar"): art. 4.11 y 7 RGPD + considerando 32 y **STJUE *Planet49*, C-673/17** (las casillas premarcadas no son consentimiento válido; criterio recogido por la AEPD).
- **Registrar evidencia:** identidad/cuenta, **sello de tiempo, IP, user-agent y versión/hash** del documento aceptado.
- **Consentimiento separado** del de los términos contractuales y **granular** (marketing aparte).
- **Doble opt-in** por email para comunicaciones comerciales.
- **Conservar versiones históricas** de cada documento.

> **Hueco detectado:** el registro (`routes/auth.js`) **no** captura hoy `acceptedTermsAt`/`acceptedTermsVersion`. Acción técnica prioritaria.

---

## 8. Huecos → acciones

| # | Hueco | Acción | Tipo |
|---|---|---|---|
| 1 | Sin evidencia de aceptación de T&C en registro | Añadir `acceptedTermsAt`/`Version` + casilla clickwrap | Técnico |
| 2 | Sin NDA ni cláusula de confidencialidad | Publicar NDA / incrustar cláusula | Legal ✅ borrador |
| 3 | Sin DPA con proveedores | Aceptar/firmar DPA de Stripe, Atlas, R2, SMTP, Sentry, hosting | Legal |
| 4 | Credenciales Baileys sin cifrar (art. 32) | Cifrar en reposo (tarea ya derivada) | Técnico/seguridad |
| 5 | Sin endpoints de derechos (DSR) ni retirada de consentimiento WhatsApp | Implementar export/borrado + revocación | Técnico |
| 6 | Sin declaración firmada de titularidad de canal | Incluida en Condiciones del Creador (casilla) | Legal ✅ borrador |
| 7 | KYC/AML sin procedimiento (Ley 10/2010) | Documentar proceso (lo ejecuta Stripe Connect) | Legal/Producto |
| 8 | Transparencia publicitaria (DSA) sin desarrollar | Incluida en Condiciones del Creador | Legal ✅ borrador |
| 9 | Datos registrales/fiscales pendientes | Rellenar al constituir la sociedad | Pendiente |
| 10 | Cumplimiento P2B (Reg. 2019/1150) | Confirmar aplicabilidad (la pata B2B anunciante↔creator puede quedar fuera); si aplica: condiciones y **ranking (arts. 3-5)**. Como **pequeña empresa (<50 empl., ≤10 M€) → exenta de los arts. 11 y 12** (reclamaciones internas y mediación) | Legal |

---

## 9. Inventario de documentos legales (estado)

**Existentes (rebrandeados a Channelad (titular: Rafa Ferrer Castells), dominios channelad.io):**
- `aviso-legal.html` · `terminos-condiciones.html` · `condiciones-contratacion.html` · `politica-privacidad.html` · `politica-cookies.html`

**Nuevos (borradores v0.9 de esta sesión):**
- `acuerdo-confidencialidad.html` — **NDA** mutuo
- `condiciones-creador.html` — condiciones del admin + **declaración de titularidad** + transparencia DSA
- `condiciones-anunciante.html` — garantías de contenido + **indemnidad**
- `acuerdo-encargo-tratamiento.html` — **DPA** art. 28 (con anexos I/II/III)
- `registro-actividades-tratamiento.md` — **RAT** art. 30

> Todos los borradores llevan placeholders `RELLENAR` para los datos registrales (pendientes de constitución) y deben **validarse con abogado** antes de su uso.

---

## 11. Fuentes verificadas (verificación dirigida · 2026-06-05)

> La investigación deep-research automática se interrumpió (se colgó en la fase de verificación, sin generar síntesis); se sustituyó por una **verificación ligera dirigida** sobre los puntos críticos. Resultado: las citas del informe quedan **confirmadas**, con estos matices:
>
> - **P2B (Reg. 2019/1150):** aplica a la intermediación profesional→consumidor; la pata B2B (anunciante↔creator) puede quedar **fuera** (analizar caso a caso). Las **pequeñas empresas están EXENTAS de los arts. 11 (reclamaciones internas) y 12 (mediación)** — relevante para Channelad como startup; los arts. 3-5 (condiciones, restricción, ranking) sí aplicarían. *(EUR-Lex 32019R1150; Recomendación 2003/361/CE para la definición de pequeña empresa)*
> - **DPA (RGPD art. 28):** confirmado. La alternativa al encargo no es solo "responsables independientes": si hay **determinación conjunta** de fines y medios habrá **corresponsabilidad (art. 26)**, que exige acuerdo de reparto. *(EDPB Directrices 07/2020)*
> - **DSA (Reg. 2022/2065):** el **art. 26** (transparencia de publicidad) aplica a **toda plataforma en línea** (el repositorio de anuncios del art. 39 es solo para VLOP); el **art. 30** (trazabilidad de comerciantes) **no aplica** a un marketplace publicitario. *(EUR-Lex 32022R2065)*
> - **Consentimiento:** confirmado por **STJUE *Planet49*, C-673/17** y guía de la AEPD (sin casillas premarcadas; el responsable debe poder probar el consentimiento). Cookies: **art. 22.2 LSSI-CE** + Guía de Cookies AEPD. *(RGPD art. 4.11/7, cdo. 32)*
> - **Influencers/etiquetado:** además de **art. 20 LSSI** y **art. 26 LCD**, aplica el régimen de **"usuario de especial relevancia"** (Ley 13/2022 LGCA + **RD 444/2024**) y el **Código AUTOCONTROL/AEA en su versión 2025** (vigente; la edición de 2021 quedó superada).
>
> **Fuentes:** EUR-Lex (RGPD arts. 26/28; Reg. 2019/1150; Reg. 2022/2065), EDPB Directrices 07/2020 y 5/2020, AEPD (consentimiento y guía de cookies), STJUE C-673/17, BOE (Ley 34/2002, Ley 3/1991, Ley 34/1988, Ley 13/2022, RD 444/2024), AUTOCONTROL (Código de influencers, ed. 2025).

*Pendiente: validación por abogado colegiado y cumplimentación de los datos registrales al constituir la sociedad.*
