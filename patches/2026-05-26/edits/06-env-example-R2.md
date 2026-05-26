# Edit · `.env.example` · Documentar variables R2

## Qué hace

Añade las 5 variables que `services/r2StorageService.js` necesita para
funcionar, con comentarios que expliquen cómo obtenerlas.

## Cómo aplicarlo

Añade al **final** de `.env.example`:

```bash
# ── Cloudflare R2 (storage de media de campaña) ───────────────────────────────
# Bucket S3-compatible donde se suben imágenes/vídeos/documentos que los
# advertisers adjuntan a las campañas. Las URLs públicas se persisten en
# campaign.media[].url y los conectores de cada plataforma (Telegram,
# Discord, etc.) las descargan al publicar. Si dejas estas variables
# vacías, el endpoint POST /api/uploads/campaign-media devuelve 503 con
# `code: STORAGE_NOT_CONFIGURED` y el wizard puede aún funcionar para
# campañas de texto plano.
#
# Cómo crearlas:
#   1. Cloudflare dashboard → R2 → Create bucket (nombre = R2_BUCKET).
#   2. R2 → API Tokens → Create token con permiso "Object Read/Write"
#      acotado al bucket. Copia los Access Key ID + Secret.
#   3. R2_ACCOUNT_ID lo encuentras en el dashboard de R2, arriba a la dcha.
#   4. R2_PUBLIC_URL: usa el `xxx.r2.dev` del bucket para dev, o un
#      dominio custom (recomendado en producción) mapeado al bucket.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=channelad-media
R2_PUBLIC_URL=
```

## Verificación

```bash
grep -c '^R2_' .env.example
```

Esperado: `5`.
