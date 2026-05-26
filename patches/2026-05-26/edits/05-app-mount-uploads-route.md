# Edit · `app.js` · Montar la ruta `/api/uploads`

## Qué hace

Registra el módulo `routes/uploads.js` en el preload table y lo monta en
`/api/uploads` para que `POST /api/uploads/campaign-media` esté disponible.

## Paso 1 · Añadir al `_routes` preload

Localiza el bloque de `try { _routes['./routes/files'] = require... }`
en `app.js` (alrededor de la línea 24). Justo **después** de esa línea,
añade:

```js
try { _routes['./routes/uploads']       = require('./routes/uploads');       } catch (e) { _routes['./routes/uploads']       = e; }
```

## Paso 2 · Añadir al `enabledRoutes`

Localiza el array `enabledRoutes` (alrededor de la línea 491). Busca:

```js
['/api/files', './routes/files'],
```

Justo **después** añade:

```js
['/api/uploads', './routes/uploads'],
```

## Verificación

```bash
# Arranca el servidor y comprueba que la ruta responde 401 sin auth
# (no 404 — eso confirmaría que está montada)
curl -i http://localhost:5000/api/uploads/campaign-media
```

Esperado:
```
HTTP/1.1 401 Unauthorized
{"success":false,"message":"Token requerido"}
```

(Si devuelve 404 el route no está montado; revisa los 2 pasos.)
