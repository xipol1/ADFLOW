# Estado real del repositorio

## 1) Auditoría estructural

### Controladores
| Componente | Estado |
|---|---|
| `controllers/authController.js` | ✅ Existe |
| `anuncioController` | ❌ Falta |
| `canalController` | ❌ Falta |
| `transaccionController` | ❌ Falta |
| `notificationController` | ❌ Falta |
| `fileController` | ❌ Falta |
| `estadisticaController` | ❌ Falta |
| `campaignController` | ❌ Falta |
| `channelListController` | ❌ Falta |
| `controllers/channelsController.js` | ✅ Existe (API demo) |

### Modelos
| Modelo | Estado |
|---|---|
| `models/Usuario.js` | ✅ Existe |
| `Canal` | ❌ Falta |
| `Anuncio` | ❌ Falta |
| `Transaccion` | ❌ Falta |
| `Notificacion` | ❌ Falta |
| `Campana` | ❌ Falta |

### Servicios
Servicios presentes en `services/`: auth/email/file/channel/campaign optimizer, etc. No hay evidencia de integración completa con controladores de dominio (canales/anuncios/transacciones).

## 2) Rutas operativas vs no operativas

### Operativas
- `/health`
- `/api/health`
- `/api/auth/*`
- `/auth/*`
- `/api/channels/*`
- `/channels/*`

### No operativas (respuesta uniforme `501`)
- `/api/canales/*`
- `/api/anuncios/*`
- `/api/transacciones/*`
- `/api/notifications/*`
- `/api/files/*`
- `/api/estadisticas/*`
- `/api/campaigns/*`
- `/api/lists/*`
- `/campaigns/*`

Formato uniforme:
```json
{
  "success": false,
  "code": "NOT_IMPLEMENTED",
  "module": "<modulo>",
  "message": "Módulo pendiente"
}
```

## 3) Variables de entorno requeridas (mínimas)
- `MONGODB_URI`
- `JWT_SECRET`
- Recomendadas para auth completa: `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- Para pagos: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## 4) Riesgos críticos

### P0
1. Falta de controladores/modelos de dominio (marketplace no funcional de extremo a extremo).

### P1
1. Desalineación documentación vs estado real (README/todo pueden inducir a error).
2. Dependencia de respuestas 501 para gran parte de la API.

### P2
1. Frontend avanzado pendiente para flujos completos de marketplace (más allá de auth + dashboard base).
