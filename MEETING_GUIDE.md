# Guión de reunión — Usuario con "canales grandes de WhatsApp"

## Antes de empezar (5 min antes)

1. Verifica que el backend está vivo:
   ```
   curl http://localhost:5000/health
   ```
   Debe devolver `{"status":"ok","db":"connected",...}`

2. Abre en el navegador (no toques nada todavía):
   - **Modo demo (mock)**: <http://localhost:3000/creator/channels/link-whatsapp?demo=1>
   - **Modo real (QR)**: <http://localhost:3000/creator/channels/link-whatsapp>

3. Si Claude te dice que el server no está corriendo, arráncalo con:
   `npm run dev` (backend) y `npm run frontend:dev` (frontend) en dos terminales.

---

## Estructura sugerida (30 min)

### 1. Diagnóstico — 5 min

> "Antes de empezar, quería entender bien qué tienes. ¿Son **canales** o **grupos** de WhatsApp? Te lo pregunto porque WhatsApp tiene dos cosas distintas: los **Canales** (newsletters, broadcast, gris), y los **Grupos** (chats normales con conversación entre miembros). Channelad monetiza canales, no grupos — y por eso probablemente no podías añadirlos."

**Preguntas a hacer**:
- ¿Cuántos tienes y de qué tamaño?
- ¿Tú eres administrador o solo miembro?
- ¿Hay conversación entre miembros o solo tú publicas?

### 2. Demo del feature nuevo — 10 min

> "Hemos hecho algo esta misma mañana porque tu caso no es único. Mira."

Abre: <http://localhost:3000/creator/channels/link-whatsapp?demo=1>

Lo que verá:
- Banner morado: **"Modo demo activo"** (sé honesto, dile que son grupos de ejemplo)
- Mensaje claro: *"No tienes Canales (newsletters) que administres. Channelad monetiza Canales de WhatsApp, no grupos. Pero hemos auditado tus grupos para mostrarte cuáles podrían convertirse..."*
- 3 stats: 5 detectados / 2 aptos / 3 no aptos
- **2 aptos**: Crypto España (1024), Trading Pro VIP (800)
- **3 no aptos**: con razones específicas (anuncios-only, pocos miembros, no admin)

**Mensaje clave**:
> "En vez de bloquearte sin más, ahora **te auditamos toda la cuenta** y te decimos exactamente cuáles de tus grupos podrían monetizarse si los conviertes en Canales (que es un proceso que Meta tiene documentado y dura 2 minutos)."

### 3. Demo real (si tiene tiempo y ganas) — 10 min

Si está convencido, ofrécele conectar SU WhatsApp:

1. Abre: <http://localhost:3000/creator/channels/link-whatsapp> (sin `?demo=1`)
2. Acepta consentimiento → genera QR
3. Él escanea con su móvil (Ajustes → Dispositivos vinculados)
4. Tras conectar, ve sus canales reales + grupos auditados con veredicto
5. **No le pidas que vincule nada todavía** — solo es para demostrar que funciona con su cuenta

### 4. Cierre — 5 min

**Decisión esperada**:
- Si está OK con convertir 1-2 grupos en Newsletter → quédate con él y guíale
- Si quiere pensarlo → cierra con: "Te envío un resumen por mail con los pasos para convertir un grupo a Canal y cuando tengas el primero conectado, monetizamos"

---

## Mensajes clave (cosas que decir)

✅ **Decir**:
- "Channelad funciona con Canales de WhatsApp (newsletters broadcast)"
- "Tus grupos pueden convertirse en Canales — Meta tiene el flujo nativo"
- "Te auditamos los grupos para decirte cuáles tienen sentido convertir"
- "Nunca leemos chats privados ni grupos sin tu permiso"

❌ **NO decir**:
- "WhatsApp no funciona en Channelad" → sí funciona, solo Canales
- "Tienes que crear todo desde cero" → la audiencia se invita al nuevo Canal
- "Lo arreglo en producción ya" → producción está en Vercel y Baileys no funciona ahí (deuda técnica conocida)

---

## Si algo falla en la demo

| Problema | Solución |
|---|---|
| Backend no responde | `npm run dev` en terminal del proyecto, espera 5s |
| Frontend en blanco | `npm run frontend:dev`, abrir 3000 |
| QR no aparece | Espera 3-5s. Si nada, refresca con `?_t=` random al final |
| Lista vacía tras escanear | Es un caso real — el usuario realmente no tiene newsletters. Cambia a `?demo=1` para enseñar la auditoría |
| Página rota | `Ctrl+Shift+R` (hard reload) — fuerza recarga del bundle |

---

## URLs útiles durante la reunión

| URL | Cuándo |
|---|---|
| <http://localhost:3000/creator/channels/link-whatsapp?demo=1> | Demo con mock data |
| <http://localhost:3000/creator/channels/link-whatsapp> | Conexión real con QR |
| <http://localhost:5000/health> | Verificar backend vivo |
| <http://localhost:3000/creator/channels> | Lista de canales del usuario |

---

## Después de la reunión

- Guarda los nombres de los grupos que te diga (para tu plan personal)
- Si el usuario quiere acceso real funcionando: necesitamos migrar backend a Railway/Fly (~1 día de trabajo, $5-20/mes)
- Si quiere convertir grupos a Canales: pásale la doc de Meta sobre Channels (la encuentras buscando "WhatsApp Channels how to create")
