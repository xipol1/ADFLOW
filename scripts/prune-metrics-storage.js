/*
 * prune-metrics-storage.js — libera cuota de Atlas en el cluster de produccion.
 *
 * Contexto (agosto 2026): Atlas M0 mide la cuota como tamaño LOGICO de datos +
 * indices, no el comprimido. Llegamos a 435,0 + 77,5 = 512,5 MB de 512 MB y el
 * cluster bloqueo TODAS las escrituras: nadie podia registrarse, ni crear
 * campañas, ni escribir logs de auditoria. Dos colecciones de series temporales
 * se comian el 96% de la cuota, y ninguna tenia TTL.
 *
 * Modos (DRY-RUN salvo --apply):
 *
 *   --report     Solo mide: cuota, top de colecciones, indices y su tamaño.
 *
 *   --drop-dead-indexes
 *                Borra los indices de `estadisticas` sobre periodo.inicio y
 *                periodo.fin (campos que NO existen en ninguno de los 889.064
 *                documentos) y el compuesto que los usaba. ~21 MB. NO borra
 *                ni un solo documento. Reversible: se recrean con createIndex.
 *
 *   --ttl        Crea indices TTL. OJO: al crearlos, MongoDB borra en segundo
 *                plano todo lo que ya supere la ventana. Con --days=90 eso son
 *                ~597.000 docs de estadisticas y ~57.000 de canalscoresnapshots.
 *                ES BORRADO DEFINITIVO. Pide --apply y confirmacion explicita.
 *
 * Opciones:
 *   --days=N     Ventana de retencion del TTL (por defecto 90).
 *   --apply      Ejecuta de verdad.
 *
 * Uso tipico:
 *   node scripts/prune-metrics-storage.js --report
 *   node scripts/prune-metrics-storage.js --drop-dead-indexes --apply
 *   node scripts/prune-metrics-storage.js --ttl --days=90 --apply
 */
require('dotenv').config();
const mongoose = require('mongoose');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (k, dflt = null) => {
  const a = argv.find((x) => x.startsWith('--' + k + '='));
  return a ? a.slice(k.length + 3) : dflt;
};

const APPLY = has('--apply');
const DAYS = Number(val('days')) > 0 ? Number(val('days')) : 90;
const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

// Indices de `estadisticas` sobre campos inexistentes. Verificado 2026-08-30:
// countDocuments({'periodo': {$exists: true}}) === 0 sobre 889.064 documentos.
const INDICES_MUERTOS = [
  'periodo.inicio_1',
  'periodo.fin_1',
  'entidadId_1_tipoEntidad_1_periodo.inicio_1_periodo.fin_1',
];

// Series temporales que hay que envejecer. `campo` es la fecha por la que
// caducan; ambos son datos regenerables por los scrapers y el motor de scoring.
const SERIES = [
  { col: 'estadisticas', campo: 'createdAt' },
  { col: 'canalscoresnapshots', campo: 'fecha' },
];

async function cuota(db) {
  const s = await db.stats();
  const usado = (s.dataSize || 0) + (s.indexSize || 0);
  return { usado, datos: s.dataSize || 0, indices: s.indexSize || 0, pct: (usado / (512 * 1048576)) * 100 };
}

async function informe(db) {
  const q = await cuota(db);
  console.log('=== CUOTA ATLAS (M0: 512 MB de datos + indices) ===');
  console.log('  datos    : ' + mb(q.datos));
  console.log('  indices  : ' + mb(q.indices));
  console.log('  USADO    : ' + mb(q.usado) + '  (' + q.pct.toFixed(1) + '% del limite)');
  console.log('  margen   : ' + mb(512 * 1048576 - q.usado));
  if (q.pct >= 100) console.log('  ESTADO   : ESCRITURAS BLOQUEADAS');

  const cols = await db.listCollections().toArray();
  const filas = [];
  for (const c of cols) {
    try {
      const s = await db.command({ collStats: c.name });
      filas.push({ n: c.name, docs: s.count || 0, peso: (s.size || 0) + (s.totalIndexSize || 0) });
    } catch { /* vistas */ }
  }
  filas.sort((a, b) => b.peso - a.peso);
  console.log('\n=== TOP COLECCIONES (datos + indices) ===');
  for (const f of filas.slice(0, 8)) {
    console.log('  ' + f.n.padEnd(26) + String(f.docs).padStart(9) + ' docs' + mb(f.peso).padStart(12) +
      ((f.peso / q.usado) * 100).toFixed(0).padStart(6) + '%');
  }
  return q;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;

  const antes = await informe(db);
  console.log('\n' + (APPLY ? '### APPLY - escribiendo en PRODUCCION ###' : '### DRY-RUN - no toca nada ###') + '\n');

  if (has('--drop-dead-indexes')) {
    const col = db.collection('estadisticas');

    // Guardarrail: si alguna vez alguien empieza a escribir `periodo`, estos
    // indices dejan de estar muertos y no hay que tocarlos.
    const conPeriodo = await col.countDocuments({ periodo: { $exists: true } });
    if (conPeriodo > 0) {
      console.log('ABORTADO: ' + conPeriodo + ' documentos SI tienen `periodo`. Los indices ya no estan muertos.');
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log('Verificado: 0 documentos con `periodo` sobre ' + (await col.countDocuments()) + '.\n');

    const existentes = (await col.indexes()).map((i) => i.name);
    const s = await db.command({ collStats: 'estadisticas' });
    for (const nombre of INDICES_MUERTOS) {
      if (!existentes.includes(nombre)) { console.log('  ' + nombre + ': ya no existe'); continue; }
      console.log('  ' + nombre.padEnd(56) + mb(s.indexSizes?.[nombre] || 0).padStart(10) + (APPLY ? '' : '  [se borraria]'));
      if (APPLY) { await col.dropIndex(nombre); console.log('     borrado'); }
    }
  }

  if (has('--ttl')) {
    console.log('TTL de ' + DAYS + ' dias. Esto BORRA los documentos mas antiguos, no solo los futuros.\n');
    for (const { col: nombre, campo } of SERIES) {
      const col = db.collection(nombre);
      const corte = new Date(Date.now() - DAYS * 864e5);
      const total = await col.countDocuments();
      const caducados = await col.countDocuments({ [campo]: { $lt: corte } });
      console.log('  ' + nombre + ': ' + total + ' docs, se borrarian ' + caducados +
        ' (' + ((caducados / total) * 100).toFixed(0) + '%) anteriores a ' + corte.toISOString().slice(0, 10));

      if (!APPLY) continue;
      const ya = (await col.indexes()).find((i) => i.expireAfterSeconds !== undefined);
      if (ya) { console.log('     ya tenia TTL (' + ya.name + '), no lo toco'); continue; }
      await col.createIndex({ [campo]: 1 }, { expireAfterSeconds: DAYS * 86400, name: 'ttl_' + campo });
      console.log('     TTL creado; MongoDB purga en segundo plano (puede tardar minutos)');
    }
  }

  if (APPLY) {
    const despues = await cuota(db);
    console.log('\n=== RESULTADO ===');
    console.log('  antes  : ' + mb(antes.usado) + '  (' + antes.pct.toFixed(1) + '%)');
    console.log('  ahora  : ' + mb(despues.usado) + '  (' + despues.pct.toFixed(1) + '%)');
    console.log('  liberado: ' + mb(antes.usado - despues.usado));
  }

  await mongoose.disconnect();
})().catch((e) => { console.error('ERROR: ' + e.message); process.exit(1); });
