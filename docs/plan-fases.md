# Plan por fases para poner la plataforma a punto

## Fase 2 — Backend de dominio mínimo viable
1. Crear modelos Mongoose: `Canal`, `Anuncio`, `Campana`, `Transaccion`, `Notificacion`.
2. Implementar controladores mínimos:
   - Canales: crear/listar público/listar propios.
   - Campañas: crear/listar/cambiar estado.
   - Transacciones: crear + webhook básico.
3. Reemplazar 501 en módulos implementados.

## Fase 3 — Frontend marketplace real
1. Rutas reales para explorar canales, crear campañas, detalle de campaña, pagos.
2. Conectar `services/api.js` a endpoints reales (sin mocks/TODO).
3. Dashboard por rol con datos de API.

## Fase 4 — Calidad y CI
1. Configurar ESLint base del repo (`.eslintrc*`).
2. Agregar smoke tests (health + auth login/register básico con supertest).
3. Ajustar `npm test` para pasar en CI.

## Fase 5 — Hardening y despliegue
1. Endurecer validación de entrada y límites por endpoint crítico.
2. Revisar secretos/env para producción.
3. Checklist de release + monitoreo básico.
