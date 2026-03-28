# Release checklist MVP (Vercel)

## 1) Preflight local
- [ ] `npm install`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `node -e "require('./app'); console.log('app_loaded')"`

## 2) Variables de entorno (Production)
- [ ] `NODE_ENV=production`
- [ ] `PORT` (si aplica)
- [ ] `FRONTEND_URL` (dominio final frontend)
- [ ] `MONGODB_URI`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `NEXT_PUBLIC_API_URL` (frontend)

## 3) Vercel
- [ ] Proyecto enlazado al repo/branch correcto
- [ ] `buildCommand`: `npm run build`
- [ ] `outputDirectory`: `dist`
- [ ] Rewrite SPA a `/index.html`

## 4) Smoke post-deploy
- [ ] `GET /health` => 200
- [ ] `GET /api/health` => 200
- [ ] `GET /api/channels` => 200
- [ ] `/` carga landing
- [ ] `/auth/login` carga login
- [ ] Cambio de tema dark/light funciona

## 5) Cierre
- [ ] Registrar URL final de producción
- [ ] Registrar commit hash desplegado
- [ ] Registrar fecha/hora de release
