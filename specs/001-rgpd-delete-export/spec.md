# Feature Specification: Eliminación de cuenta + Export de datos (RGPD)

**Feature Branch**: `claude/sad-hawking-99a5d2` (Claude worktree — branch sin numeración secuencial)

**Spec ID**: `001-rgpd-delete-export` (corresponde a SPEC-B1 del backlog MVP)

**Created**: 2026-05-18

**Status**: Draft

**Input**: SPEC-B1 del backlog MVP. Cierre del hueco RGPD — la página de Privacy promete derechos que no tienen endpoint detrás. Es incumplimiento legal si entra cualquier usuario europeo (residencia ES + LATAM no exime: si el usuario está en UE o trata datos de residentes UE, aplica).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Solicitud de eliminación de cuenta (Priority: P1)

Un usuario decide dejar de usar Channelad y quiere ejercer su derecho de supresión (Art. 17 RGPD). Desde la sección de ajustes de su cuenta encuentra una opción clara "Eliminar mi cuenta", la pulsa, recibe un email de confirmación con un enlace de un solo uso, y al confirmar entra en un periodo de gracia antes del borrado definitivo. Durante ese periodo puede arrepentirse y cancelar la solicitud volviendo a iniciar sesión. Tras el periodo, los datos personales identificables se anonimizan irreversiblemente; los registros con obligación fiscal (facturas, transacciones liquidadas) se conservan anonimizados durante el plazo legal español (6 años, Ley General Tributaria).

**Why this priority**: Es el hueco legal más urgente. Sin esto, cualquier reclamación ante la AEPD es inmediatamente sostenible. Bloquea ir a producción con usuarios reales en jurisdicción UE.

**Independent Test**: se puede probar end-to-end con un usuario de prueba sin necesidad de que exista el export ni la página unificada "Mis derechos". El test consiste en: crear usuario → solicitar borrado → confirmar email → esperar grace period (o forzarlo en entorno de test) → comprobar que `email`, `nombre`, `teléfono`, `avatar`, IPs históricas y demás PII han sido reemplazadas por valores anonimizados; que las transacciones con factura emitida siguen recuperables vía `usuarioId` anonimizado para auditoría fiscal; y que el usuario no puede volver a iniciar sesión.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado sin operaciones pendientes ni disputas abiertas, **When** entra en `Ajustes → Privacidad → Eliminar cuenta` y confirma la acción, **Then** el sistema envía un email con asunto sobrio ("Confirma la eliminación de tu cuenta") y un enlace de confirmación válido durante 24 horas.
2. **Given** un usuario que ha solicitado borrado y recibe el email, **When** abre el enlace de confirmación dentro de las 24 horas, **Then** el sistema confirma la solicitud, marca la cuenta como `pending_deletion`, cierra todas las sesiones activas en otros dispositivos, y muestra un mensaje claro indicando el periodo de gracia y cómo cancelarlo.
3. **Given** un usuario en periodo de gracia, **When** vuelve a iniciar sesión con sus credenciales, **Then** el sistema muestra un banner persistente con la opción "Cancelar eliminación de cuenta" y, al pulsarla, restaura el estado activo de la cuenta.
4. **Given** un usuario en periodo de gracia que no cancela, **When** termina el plazo, **Then** el sistema ejecuta la anonimización de PII y los datos personales identificables ya no son recuperables por ningún medio operativo de la plataforma.
5. **Given** un usuario con disputas abiertas o pagos en disputa, **When** intenta solicitar el borrado, **Then** el sistema lo bloquea con un mensaje que enumera las disputas pendientes y enlaza a su resolución, sin permitir continuar.

---

### User Story 2 — Export de datos personales (Priority: P2)

El mismo usuario quiere obtener una copia de los datos que Channelad guarda sobre él (Art. 20 RGPD — derecho de portabilidad). Desde la misma sección de ajustes pulsa "Descargar mis datos", el sistema genera la copia en segundo plano y le envía un email con un enlace de descarga temporal cuando el archivo está listo. El paquete contiene su perfil, historial de campañas, transacciones, disputas, mensajes y, si es un canal, los datos del canal verificado y sus métricas.

**Why this priority**: Complemento del derecho de supresión (Art. 17). RGPD lo exige aunque el usuario no piense borrarse. Además ayuda al usuario a tomar decisiones informadas antes de borrar (puede descargar primero, revisar, decidir).

**Independent Test**: se puede probar sin que exista la eliminación de cuenta. Test: crear usuario con datos representativos (al menos 2 campañas, 1 disputa, varios mensajes) → solicitar export → verificar que llega email con link → descargar paquete → comprobar que contiene todos los datos esperados, en formato estructurado y legible, y que el link expira al cabo de 7 días.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** entra en `Ajustes → Privacidad → Descargar mis datos`, **Then** el sistema acepta la solicitud, muestra una confirmación visible ("Estamos preparando tu archivo. Recibirás un email cuando esté listo") y registra la solicitud para procesamiento asíncrono.
2. **Given** una solicitud de export aceptada, **When** el procesamiento termina (< 24 h), **Then** el sistema envía un email al usuario con el enlace de descarga y la fecha exacta de expiración.
3. **Given** el enlace de descarga, **When** el usuario lo abre dentro del plazo de 7 días, **Then** descarga un archivo único que contiene su perfil, campañas, transacciones (sin tokens internos ni IDs de pasarela de pago), disputas con mensajes, datos de canal y métricas si aplica, y un manifiesto que lista qué hay y la fecha de generación.
4. **Given** un usuario que pide export más de una vez en 24 h, **When** intenta hacer la segunda solicitud, **Then** el sistema le indica que ya hay una solicitud en curso o le redirige al enlace existente si todavía es válido.
5. **Given** un enlace de descarga expirado, **When** el usuario intenta usarlo, **Then** el sistema muestra un mensaje claro indicando expiración y le ofrece generar una nueva solicitud.

---

### User Story 3 — Página "Mis derechos RGPD" en ajustes (Priority: P3)

El usuario llega a sus ajustes y encuentra una sección dedicada que explica sus derechos RGPD (acceso, rectificación, supresión, portabilidad, oposición, limitación) con lenguaje claro, los plazos legales asociados y los botones de acción correspondientes. Esta página sirve también como discoverability — la promesa pública de la política de privacidad encuentra aquí su contraparte operativa.

**Why this priority**: sin esta página los usuarios no descubren los derechos aunque existan los endpoints. Es además requisito de transparencia: el RGPD exige información clara y accesible sobre cómo ejercer los derechos.

**Independent Test**: se puede probar sin que los endpoints de borrado o export estén implementados. Test: navegar a `Ajustes → Privacidad` → comprobar que se listan los 6 derechos con explicación breve, plazos legales, y para cada uno o bien un botón funcional o un texto explicando que la vía es por email al DPO (con la dirección visible).

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** entra en `Ajustes → Privacidad`, **Then** ve una sección "Tus derechos RGPD" con los 6 derechos listados, cada uno con explicación de una línea y plazo legal asociado.
2. **Given** la página de derechos, **When** la vista se renderiza, **Then** los derechos con endpoint disponible (acceso vía export, supresión) muestran botón directo; los demás (rectificación, oposición, limitación) muestran instrucciones para solicitar vía email al DPO.
3. **Given** el botón "Descargar mis datos", **When** el usuario lo pulsa, **Then** se ejecuta el flujo de la User Story 2.
4. **Given** el botón "Eliminar mi cuenta", **When** el usuario lo pulsa, **Then** se ejecuta el flujo de la User Story 1.

---

### Edge Cases

- **Usuario con campaña en `Borrador` o `Pendiente de aceptación`**: se cancela inmediatamente al confirmar el borrado, sin cargo. Disponible desde el primer release.
- **Anunciante con campaña activa y escrow retenido**: liquidación express con reembolso automático antes de iniciar la gracia (FR-007.b). Requiere Stripe live — hasta SPEC-F2, se pausa la solicitud con incidencia explicando el bloqueo.
- **Canal con saldo pendiente de liberación**: liquidación express con payout antes del borrado (FR-007.c). Misma dependencia Stripe que el caso anterior.
- **Operación pendiente con bloqueo humano** (KYC, banco rechaza, disputa colateral): FR-007.d — se pausa la solicitud con incidencia operativa concreta y cómo resolverla, manteniendo al usuario informado.
- **Usuario con disputa abierta**: se bloquea el borrado hasta resolver. La otra parte tiene derecho legítimo a la resolución del conflicto.
- **Email de confirmación expira (24 h)**: la solicitud se descarta silenciosamente; el usuario puede reiniciar el proceso. No se reenvía automáticamente.
- **Token de confirmación reutilizado**: solo válido una vez; segundo uso devuelve 410 Gone con mensaje claro.
- **Usuario hace login después de confirmar borrado pero antes de fin de gracia**: ver User Story 1 escenario 3 — banner persistente con opción de cancelar.
- **Canal cuya cuenta se elimina pero cuyos posts patrocinados ya están publicados en plataformas externas (Telegram, Discord)**: los posts no se borran de las plataformas terceras; sí se anonimiza la atribución de propiedad en Channelad.
- **Mensajes en hilos de disputa al borrar**: los mensajes se mantienen para la integridad de la disputa de la otra parte, pero el autor se muestra como "Usuario eliminado".
- **Re-registro con el mismo email tras anonimización**: permitido — el email anonimizado deja de ocupar el slot único.
- **Solicitud de export con cuenta nueva y sin datos**: se procesa igualmente; el paquete contendrá solo el perfil mínimo y un manifiesto que lo refleje. No es error.
- **Solicitud de borrado de cuenta admin (último admin del sistema)**: bloqueada con error explícito; debe transferir el rol primero. No aplica a usuarios estándar.

## Requirements *(mandatory)*

### Functional Requirements

**Solicitud y confirmación de borrado**:

- **FR-001**: El sistema MUST exponer en `Ajustes → Privacidad` una opción "Eliminar mi cuenta" visible para todo usuario autenticado.
- **FR-002**: El sistema MUST exigir confirmación por email mediante token de un solo uso con expiración de 24 horas antes de aceptar una solicitud de borrado.
- **FR-003**: El sistema MUST cerrar todas las sesiones activas del usuario en cuanto la solicitud queda confirmada.
- **FR-004**: El sistema MUST entrar en un periodo de gracia de **7 días naturales** entre la confirmación y el borrado efectivo, durante el cual el usuario puede cancelar la solicitud reiniciando sesión. Plazo alineado con estándar de la industria (Google, GitHub, Facebook) y holgado dentro del límite RGPD de 30 días naturales (Art. 12.3).
- **FR-005**: El sistema MUST notificar al usuario por email tanto al iniciar la gracia como 24 horas antes de su finalización.

**Bloqueo y operaciones pendientes**:

- **FR-006**: El sistema MUST rechazar la solicitud de borrado si el usuario tiene disputas abiertas, mostrando la lista de disputas y un enlace a su resolución.
- **FR-007**: El sistema MUST ejecutar **liquidación express automática** de las operaciones pendientes al confirmar el borrado, antes de iniciar el periodo de gracia. Concretamente:
  - **FR-007.a**: campañas en estado `Borrador` o `Pendiente de aceptación` (sin escrow capturado) → cancelar inmediatamente sin cargo, notificar a la contraparte si la había.
  - **FR-007.b**: campañas en estado `Aceptada` o `En publicación` con escrow retenido (anunciante eliminándose) → reembolso íntegro automático al anunciante y notificación al canal de cancelación con motivo "Anunciante ha cerrado su cuenta".
  - **FR-007.c**: campañas en estado `Publicada` o `Verificada` con saldo pendiente de liberación (canal eliminándose) → liberar payout al canal antes del borrado, con factura emitida a tiempo.
  - **FR-007.d**: si alguna liquidación requiere intervención humana (KYC pendiente, banco rechaza payout, disputa que aparece en la transacción), la solicitud se pausa y se notifica al usuario con la incidencia concreta y cómo resolverla.
  - **Fasing técnico**: FR-007.a se cumple desde el primer release (no requiere Stripe live). FR-007.b/c quedan bloqueados hasta que SPEC-F2 (Config Stripe prod) y SPEC-F1 (idempotency) estén operativos. Mientras tanto, los casos b/c se tratan como FR-007.d (pausa con incidencia) explicando que la liquidación express se completará automáticamente cuando la pasarela esté lista.
- **FR-008**: El sistema MUST rechazar la solicitud si el usuario es el último administrador del sistema, con mensaje explicando que debe transferir el rol primero.

**Anonimización y retención**:

- **FR-009**: Tras el periodo de gracia, el sistema MUST anonimizar irreversiblemente toda PII del usuario: nombre, email, teléfono, avatar, dirección, datos fiscales personales (DNI/NIF/CIF si aplica), IPs históricas, user agents.
- **FR-010**: El sistema MUST preservar registros con obligación fiscal española (facturas emitidas, transacciones liquidadas, asientos contables) durante 6 años desde la fecha de operación, conforme a Ley General Tributaria 58/2003 Art. 70 y Reglamento de Facturación.
- **FR-011**: El sistema MUST mantener la integridad referencial de objetos compartidos: disputas siguen visibles para la contraparte con autor "Usuario eliminado"; mensajes en hilos colaborativos se conservan con autoría anonimizada.
- **FR-012**: El sistema MUST permitir el re-registro con el mismo email tras la anonimización.

**Export de datos**:

- **FR-013**: El sistema MUST exponer en `Ajustes → Privacidad` una opción "Descargar mis datos" visible para todo usuario autenticado.
- **FR-014**: El sistema MUST procesar la solicitud de export de forma asíncrona y entregar el resultado en menos de 24 horas.
- **FR-015**: El sistema MUST enviar un email al usuario con un enlace de descarga cuando el export esté listo; el enlace MUST expirar a los 7 días.
- **FR-016**: El export MUST incluir, en formato estructurado y legible: perfil del usuario, configuración de cuenta, historial de campañas, transacciones (sin secretos de pasarela de pago ni tokens internos), disputas y sus mensajes, datos de canal si aplica, métricas históricas del canal si aplica, preferencias de notificación, registro de consentimientos legales con fechas.
- **FR-017**: El export MUST incluir un manifiesto en raíz que liste el contenido del paquete, la fecha de generación, la versión del schema de export y un identificador único de la solicitud.
- **FR-018**: El sistema MUST aplicar rate limit a las solicitudes de export — máximo 1 solicitud cada 24 horas por usuario; si hay una solicitud reciente vigente, redirige al enlace existente.

**Página "Mis derechos RGPD"**:

- **FR-019**: El sistema MUST exponer en `Ajustes → Privacidad` una sección "Tus derechos RGPD" que enumere los 6 derechos del RGPD con explicación de una línea y el plazo legal asociado.
- **FR-020**: La sección MUST mostrar botón directo para los derechos con endpoint disponible (acceso vía export, supresión) e instrucciones para solicitar los demás vía email al DPO (`dpo@channelad.io` o equivalente operativo).

**Auditoría y observabilidad**:

- **FR-021**: El sistema MUST registrar en un log de auditoría persistente toda acción relevante: solicitud de borrado, confirmación, cancelación, fin de gracia, anonimización, solicitud de export, generación, descarga, expiración. Cada registro incluye usuarioId (incluso tras anonimización, para trazabilidad), timestamp, IP y user agent.
- **FR-022**: El log de auditoría RGPD MUST ser inmutable (append-only) y accesible solo a roles `admin` y `dpo`.
- **FR-023**: El sistema MUST exponer a admin un panel mínimo para consultar el estado de solicitudes RGPD pendientes y completadas.

**Copy y comunicación**:

- **FR-024**: Todo texto visible al usuario en esta feature (emails, modales, banners, mensajes de error) MUST cumplir el [Wording Playbook v1.0](../../.specify/memory/wording-playbook.md): tutear, sin vocabulario prohibido, cifras concretas, fórmula incidencia §6.4 para errores, sin emojis en hero/CTA/asunto email.
- **FR-025**: Los emails MUST estar disponibles en castellano y, cuando el usuario tenga preferencia LATAM configurada, en la variante correspondiente (alineado con el plan de i18n SPEC-C3).

### Key Entities

- **AccountDeletionRequest**: representa una solicitud de borrado en curso. Atributos: usuarioId, status (`pending_email_confirmation`, `grace_period`, `cancelled`, `executed`), requestedAt, confirmedAt, gracePeriodEndsAt, cancelledAt, executedAt, motivo (opcional, libre).
- **DataExportRequest**: representa una solicitud de export. Atributos: usuarioId, status (`queued`, `processing`, `ready`, `delivered`, `expired`, `failed`), requestedAt, completedAt, downloadUrl (firmado, temporal), expiresAt, packageSize, schemaVersion.
- **RGPDAuditLog**: log append-only de acciones RGPD. Atributos: usuarioId (perdura tras anonimización), action, timestamp, ip, userAgent, metadata (JSON estructurado por tipo de acción), actor (sistema, usuario, admin, dpo).
- **AnonymizedUser**: estado anonimizado de un User tras borrado. PII reemplazada por valores constantes (`email = "deleted-{usuarioId}@anonymized.local"`, `nombre = "Usuario eliminado"`, etc.) preservando integridad referencial.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cualquier usuario completa una solicitud de borrado desde ajustes en **menos de 90 segundos** (medido desde el primer clic en "Eliminar mi cuenta" hasta el envío del email de confirmación).
- **SC-002**: Cualquier usuario completa una solicitud de export desde ajustes en **menos de 30 segundos** (medido desde el primer clic hasta la confirmación visible en pantalla).
- **SC-003**: **100 %** de los exports están entregados al usuario por email en menos de **24 horas** desde la solicitud (medido sobre todas las solicitudes del primer mes).
- **SC-004**: Tras la anonimización, **0** consultas del sistema operativo (búsqueda de usuarios, listados, perfiles públicos, autocompletados) devuelven la PII del usuario eliminado. Verificable mediante test forense sobre la base de datos en entorno de QA con datos representativos.
- **SC-005**: **100 %** de los registros con obligación fiscal del usuario eliminado siguen recuperables vía auditoría tras la anonimización (verificable cruzando IDs anonimizados contra el journal contable).
- **SC-006**: **100 %** de las acciones RGPD quedan registradas en el log de auditoría (verificable cruzando solicitudes ejecutadas contra entradas del log; cero discrepancias toleradas).
- **SC-007**: **0** reclamaciones a la AEPD u homólogos LATAM relacionadas con la imposibilidad de ejercer derechos RGPD durante los primeros 6 meses tras el lanzamiento del MVP.
- **SC-008**: Cumplimiento del plazo legal: cualquier solicitud de borrado se completa (incluido el periodo de gracia) en **menos de 30 días naturales** desde la confirmación, plazo máximo del RGPD (Art. 12.3).

## Assumptions

- **Plazo legal de borrado**: el RGPD obliga a responder en 30 días naturales (Art. 12.3). El periodo de gracia se ha fijado en **7 días** + tiempo de liquidación express (estimado <72 h) = ~10 días totales, holgadamente dentro del límite. Si la liquidación se pausa por intervención humana (FR-007.d), el plazo se cuenta desde la resolución de la incidencia.
- **Retención fiscal española**: Ley General Tributaria 58/2003 Art. 70 + Reglamento de Facturación obligan a conservar facturas emitidas durante 6 años. El sistema preserva los registros contables anonimizados durante ese periodo independientemente del borrado de PII.
- **Otros derechos no implementados como endpoint en MVP**: rectificación (ya cubierta parcialmente por la edición de perfil existente), oposición, limitación, y portabilidad ampliada (más allá del export simple) se delegan inicialmente al DPO vía email. Cubrir cada uno con endpoint dedicado es post-MVP.
- **DPO operativo**: se asume que existe (o se habilita en paralelo) una dirección `dpo@channelad.io` o equivalente. La existencia formal del cargo de DPO no es obligatoria para Channelad por tamaño y tipo de tratamiento, pero la dirección de contacto sí (Art. 13.1.b RGPD).
- **Email transaccional disponible**: los emails de confirmación y de entrega de export dependen de SMTP en producción, que está pendiente (Fase F del backlog MVP). En desarrollo se trabaja con Mailtrap; el switch a SMTP prod ocurre en Fase F y no bloquea esta spec.
- **Idioma**: castellano por defecto; variantes LATAM dependen de SPEC-C3 (i18n) y se incorporan cuando esa spec esté completada. Esta spec no bloquea por idioma — si SPEC-C3 no está, todo se entrega en castellano peninsular.
- **Encriptación at-rest**: se asume que la base de datos ya cifra at-rest (MongoDB Atlas lo hace por defecto). No es responsabilidad de esta spec definir cifrado de campo.
- **Tokens de pasarela de pago**: el export no incluye `paymentMethodId`, `customerId`, `accountId` ni cualquier token de Stripe — son referencias internas no portables que el usuario no posee.

## Constitution Check

Esta spec se alinea explícitamente con los principios de la [Channelad Constitution](../../.specify/memory/constitution.md):

- **Principio I (Verificable)**: SC-005 y SC-006 son verificables mediante auditoría sobre el journal contable y el log RGPD. FR-021/22 garantizan la trazabilidad.
- **Principio II (Directo)**: FR-019/20 obligan a explicar los derechos del usuario con plazos y vías concretas, sin esconder. FR-024 fuerza ausencia de vocabulario hueco.
- **Principio III (Localizado)** ✓✓: marco RGPD aplicado con retención fiscal española (FR-010), vocabulario hispano (DPO, NIF/CIF, modelo 036 cuando aplique), preparado para variantes LATAM.
- **Principio IV (Operativo)**: cifras concretas en todos los plazos (24 h confirmación, 7 días enlace export, 24 h SLA generación, 6 años retención fiscal, 30 días plazo legal RGPD). Cero "rápidamente" o "pronto".
- **Principio V (Reparador)**: FR-006/07/08 definen protocolo claro cuando algo bloquea el borrado, con acción concreta para el usuario. FR-024 obliga a usar la fórmula incidencia (§6.4 playbook) en errores. Email 24 h antes de fin de gracia (FR-005) actúa como salvaguarda contra borrado accidental.

Sin desalineamientos. Pasa el `Constitution Check` para Fase 0 de planning.

---

## Decision Log

- **2026-05-18 — Q1 (operaciones pendientes)**: elegida opción **B (liquidación express automática)**. Plasmada en FR-007.a/b/c/d con fasing técnico explícito que permite shippear el flujo completo desde el primer release para casos `Borrador`/`Pendiente de aceptación` (FR-007.a) y posponer los casos con escrow/payout (FR-007.b/c) hasta SPEC-F1+F2, sin bloquear esta spec.
- **2026-05-18 — Q2 (duración gracia)**: elegida opción **A (7 días naturales)**. Plasmada en FR-004 sin condicionales. Total ciclo borrado: ~10 días (7 gracia + ≤72 h liquidación), dentro del límite RGPD de 30 días naturales.

> Spec lista para `/speckit-plan` (todos los `[NEEDS CLARIFICATION]` resueltos, checklist en verde).
