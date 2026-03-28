# ADFLOW · Plataforma de monetización de canales

Marketplace para conectar anunciantes con creadores de canales (Telegram, Discord, WhatsApp, etc.).

Estado actual: **MVP en construcción** — backend operativo, frontend en desarrollo.

---

## Stack

### Backend
- Node.js + Express
- JWT + bcrypt (contraseñas min. 8 chars + complejidad)
- MongoDB (Mongoose) + JSON file store de respaldo
- Middleware: helmet, cors, compression, rate limiting

### Frontend
- React 18 + React Router 6
- Vite + TailwindCSS

---

## Requisitos
- Node.js >= 16
- npm >= 8
- MongoDB (opcional — funciona en modo file store sin DB)

---

## Instalación

```bash
npm install
cp .env.example .env
```

### Variables de entorno mínimas

```env
MONGODB_URI=mongodb://localhost:27017/adflow
JWT_SECRET=tu_secreto_muy_largo
JWT_REFRESH_SECRET=tu_refresh_secreto
PORT=5000
FRONTEND_URL=http://localhost:3000
```

---

## Ejecución

```bash
# Backend (desarrollo)
npm run dev

# Frontend (desarrollo)
npm run frontend:dev

# Ambos en paralelo
npm run dev:full

# Build frontend producción
npm run build
```

---

## Endpoints principales

### Salud
- `GET /health`
- `GET /api/health`

### Auth
- `POST /api/auth/registro`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `GET  /api/auth/perfil` *(autenticado)*
- `POST /api/auth/cambiar-password` *(autenticado)*

### Canales / Channels
- `GET  /api/channels`
- `GET  /api/channels/:id`
- `GET  /api/canales`

### Anuncios
- `GET  /api/anuncios`
- `POST /api/anuncios`
- `GET  /api/anuncios/:id`
- `PUT  /api/anuncios/:id`
- `DELETE /api/anuncios/:id`

### Campañas
- `GET  /api/campaigns`
- `POST /api/campaigns`

### Transacciones, Notificaciones, Archivos, Estadísticas
- Endpoints en `/api/transacciones`, `/api/notifications`, `/api/files`, `/api/estadisticas`

### Partner API
- `POST /api/partners/*` *(con autenticación de partner)*

---

## Tests y calidad

```bash
npm test          # Jest (smoke + integración)
npm run lint      # ESLint
npm run build     # Build frontend
```

CI/CD configurado con GitHub Actions (`.github/workflows/ci.yml`).

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| `docs/estado-real.md` | Estado actual del proyecto |
| `docs/plan-fases.md` | Roadmap por fases |
| `docs/api-contrato.md` | Contrato de API |
| `docs/getalink-api.md` | Integración Getalink |
| `docs/release-checklist.md` | Checklist de release |

---

## Licencia
MIT
