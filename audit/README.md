# Audit scripts

Read-only auditorías sobre MongoDB Atlas. No tocan código de producción ni
escriben en colecciones.

## tier1-outreach-coverage

Audita la cobertura de datos para los 13 canales prioritarios de outreach
Tier 1 (vertical fintech ES). Por cada canal evalúa frescura, histórico,
métricas Scoring v2.0, engagement y verticalización; produce un score
sobre 25 y una recomendación de acción (listo / re-scrape / scrape
inicial / investigación humana).

### Cómo correrlo

Necesitas `.env` con `MONGODB_URI` apuntando a la DB de producción (o
staging si quieres dry-run sobre data parcial). Desde la raíz del repo:

```bash
node scripts/audit-tier1-coverage.js
```

El script:

1. Conecta a Mongo (read-only, sólo `find` / `findOne` / `countDocuments`).
2. Para cada uno de los 13 targets:
   - intenta match exacto por handle (variantes con/sin `@`, mayúsculas)
   - si falla, match exacto por `nombreCanal`
   - si falla, regex case-insensitive sobre `nombreCanal`, `identificadorCanal` y `descripcion`
   - si la fuzzy devuelve >1 doc → marca como **ambiguo** (revisión humana, no auto-elige)
3. Para cada canal encontrado, computa scores A-E + score total + flag `mínimoViableOutreach`.
4. Escribe `audit/tier1-outreach-coverage-YYYY-MM-DD.md` con tabla maestra,
   secciones por bucket de acción, ambiguos, observaciones de calidad y
   próximos pasos.

### Salida

Un archivo Markdown por día. Si lo corres dos veces el mismo día se
sobreescribe — para versionar histórico, hacer commit entre runs.

### Criterios de scoring (resumen)

- **A Frescura**: max(`Canal.estadisticas.ultimaActualizacion`, `ChannelMetrics.platformData.lastFetched`, último `CanalScoreSnapshot.fecha`). 5=≤7d, 3=8-30d, 1=>30d.
- **B Volumen** (redefinido — no guardamos posts individuales): 5 = ≥90 snapshots Y `telegramIntel.last_post_date` ≤7d. 3 = 30-89 snapshots O `last_post_date` ≤30d. 1 = resto.
- **C Métricas v2.0**: si hay ≥1 snapshot las 6 métricas existen (el schema las requiere) → 5. Si no hay snapshots, conteo de campos `CAF/CTF/CER/CVS/CAP/CAS` con valor distinto del default 50.
- **D Engagement**: granular (views/engagement por post) = 5, sólo agregados = 3, sólo sub count = 1.
- **E Vertical**: `categoria` matchea fintech/cripto/inversión/etc → 5, categoría genérica = 3, vacía = 1.

**Score total Insights-ready** = A+B+C+D+E sobre 25.
- ≥20 → listo
- 12-19 → re-scrape ligero
- <12 → scrape inicial / profundo

**Mínimo viable outreach** (bool, paralelo al score): hay al menos 1
snapshot con `telegramIntel.last_post_date` ≤ 14 días. Es la señal
operativa de "puedo mandar Insights HOY aunque B sea bajo".

### Caveats

- "Volumen B" se calcula sobre snapshots, no sobre posts individuales —
  el stack no persiste mensajes granulares (GramJS agrega sobre los
  últimos N posts y guarda el resumen en `CanalScoreSnapshot.telegramIntel`).
- Los handles `(sin confirmar)` del spec original (Rankia, Tradersew,
  Nación Crypto, Ecotechers, DiarioCripto, Jack's Arrow) sólo se buscan
  por nombre fuzzy. Es esperable que varios caigan en "ambiguo" o "no
  encontrado".
- Tradersew se trata como multi-canal: si la fuzzy devuelve N docs, los
  lista todos sin consolidar.
