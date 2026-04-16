/**
 * Telegram Intel Service — MTProto channel metrics extraction via GramJS.
 *
 * Connects to Telegram's MTProto API using a pre-generated StringSession
 * to extract real metrics from public Telegram channels. Feeds the
 * Scoring Engine v2.0 with automated data instead of manual input.
 *
 * Rate limiting: minimum 2.5 seconds between API calls to avoid flood bans.
 * Only processes channels already mapped in MongoDB (no mass scraping).
 */

// Lazy-loaded with dynamic path to prevent Vercel NFT from bundling GramJS
let _TelegramClient, _StringSession, _Api;
function loadGramJS() {
  if (!_TelegramClient) {
    // Dynamic path prevents Vercel's Node File Tracer from bundling at build time
    const pkg = 'telegram';
    _TelegramClient = require(pkg).TelegramClient;
    _StringSession = require(pkg + '/sessions').StringSession;
    _Api = require(pkg + '/tl').Api;
  }
  return { TelegramClient: _TelegramClient, StringSession: _StringSession, Api: _Api };
}

const RATE_LIMIT_MS = 2500;

let _client = null;

/**
 * Initialize (or reuse) the GramJS client.
 * Uses TELEGRAM_SESSION string session for headless auth.
 */
async function getClient() {
  if (_client && _client.connected) return _client;

  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const sessionStr = process.env.TELEGRAM_SESSION || '';

  if (!apiId || !apiHash) {
    throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH are required');
  }

  const { TelegramClient, StringSession } = loadGramJS();
  const session = new StringSession(sessionStr);
  _client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
    retryDelay: 1000,
  });

  await _client.connect();
  return _client;
}

/**
 * Disconnect the client gracefully.
 */
async function disconnectClient() {
  if (_client && _client.connected) {
    await _client.disconnect();
    _client = null;
  }
}

/**
 * Sleep helper for rate limiting.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract metrics from a single public Telegram channel.
 *
 * @param {string} username — Channel username (without @)
 * @returns {object|null} — Metrics object or null if unavailable
 */
async function getChannelMetrics(username) {
  const { Api } = loadGramJS();
  const client = await getClient();
  const cleanUsername = username.replace(/^@/, '').trim();

  // Resolve the channel entity
  const entity = await client.getEntity(cleanUsername);

  if (!entity || !(entity instanceof Api.Channel)) {
    return null;
  }

  // Get full channel info (includes participants_count for public channels)
  const fullChannel = await client.invoke(
    new Api.channels.GetFullChannel({ channel: entity })
  );

  const channelFull = fullChannel.fullChat;
  const participantsCount = channelFull.participantsCount ?? null;

  // If no participant count, the channel is likely private/restricted
  if (participantsCount === null) {
    return {
      username: cleanUsername,
      description: channelFull.about || '',
      verified: entity.verified || false,
      participants_count: null,
      avg_views_last_20_posts: null,
      engagement_rate: null,
      post_frequency_per_week: null,
      views_trend: null,
      last_post_date: null,
      unscrapable: true,
    };
  }

  // Fetch last 20 messages to calculate view metrics
  const messages = await client.getMessages(entity, { limit: 20 });

  // Filter to actual posts (not service messages)
  const posts = messages.filter((m) => m.message || m.media);

  const views = posts.map((m) => m.views ?? 0);
  const avgViews =
    views.length > 0
      ? Math.round(views.reduce((a, b) => a + b, 0) / views.length)
      : 0;

  const engagementRate =
    participantsCount > 0 && avgViews > 0
      ? parseFloat((avgViews / participantsCount).toFixed(4))
      : 0;

  // Views trend: compare last 10 posts vs previous 10
  let viewsTrend = null;
  if (posts.length >= 20) {
    const recent10 = views.slice(0, 10);
    const older10 = views.slice(10, 20);
    const avgRecent = recent10.reduce((a, b) => a + b, 0) / recent10.length;
    const avgOlder = older10.reduce((a, b) => a + b, 0) / older10.length;
    viewsTrend =
      avgOlder > 0
        ? parseFloat(((avgRecent - avgOlder) / avgOlder).toFixed(4))
        : null;
  }

  // Post frequency: calculate from post dates
  let postFrequencyPerWeek = null;
  if (posts.length >= 2) {
    const dates = posts.map((m) => m.date).filter(Boolean).sort((a, b) => a - b);
    if (dates.length >= 2) {
      const spanSeconds = dates[dates.length - 1] - dates[0];
      const spanWeeks = spanSeconds / (7 * 24 * 3600);
      if (spanWeeks > 0) {
        postFrequencyPerWeek = parseFloat(
          (dates.length / spanWeeks).toFixed(2)
        );
      }
    }
  }

  // Last post date
  const lastPostDate =
    posts.length > 0 && posts[0].date
      ? new Date(posts[0].date * 1000)
      : null;

  return {
    username: cleanUsername,
    description: channelFull.about || '',
    verified: entity.verified || false,
    participants_count: participantsCount,
    avg_views_last_20_posts: avgViews,
    engagement_rate: engagementRate,
    post_frequency_per_week: postFrequencyPerWeek,
    views_trend: viewsTrend,
    last_post_date: lastPostDate,
    unscrapable: false,
  };
}

/**
 * Sync all Telegram channels mapped in MongoDB.
 *
 * For each canal with plataforma: 'telegram', fetches metrics via MTProto,
 * creates a CanalScoreSnapshot, and updates the Canal's scoring fields.
 *
 * @returns {{ processed: number, errors: string[], duration_ms: number }}
 */
async function syncAllMappedChannels() {
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
  const { calcularCAS } = require('./channelScoringV2');

  const start = Date.now();
  const errors = [];
  let processed = 0;

  // Find all Telegram channels
  const canales = await Canal.find({
    plataforma: 'telegram',
    estado: { $ne: 'eliminado' },
  }).lean();

  if (canales.length === 0) {
    await disconnectClient();
    return { processed: 0, errors: [], duration_ms: Date.now() - start };
  }

  try {
    await getClient(); // ensure connection

    for (const canal of canales) {
      const username =
        canal.identificadorCanal || canal.identificadores?.chatId || '';
      if (!username) {
        errors.push(`Canal ${canal._id}: no username/identifier found`);
        continue;
      }

      try {
        const metrics = await getChannelMetrics(username);

        if (!metrics) {
          errors.push(`Canal ${canal._id} (@${username}): entity not found`);
          await sleep(RATE_LIMIT_MS);
          continue;
        }

        // Update Canal with MTProto data
        const updateData = {
          'estadisticas.seguidores': metrics.participants_count ?? canal.estadisticas?.seguidores ?? 0,
          'estadisticas.ultimaActualizacion': new Date(),
          'crawler.ultimaActualizacion': new Date(),
        };

        if (metrics.unscrapable) {
          updateData['crawler.urlPublica'] = '';
        } else {
          updateData['crawler.urlPublica'] = `https://t.me/${metrics.username}`;
        }

        // Enrich canal object for scoring with MTProto data
        const enrichedCanal = {
          ...canal,
          estadisticas: {
            ...canal.estadisticas,
            seguidores: metrics.participants_count ?? canal.estadisticas?.seguidores ?? 0,
            promedioVisualizaciones: metrics.avg_views_last_20_posts ?? 0,
          },
          verificacion: canal.verificacion || { tipoAcceso: 'declarado' },
          antifraude: canal.antifraude || { flags: [] },
          crawler: {
            ...canal.crawler,
            ultimoPostNum: null,
            ultimaActualizacion: new Date(),
            urlPublica: metrics.unscrapable ? '' : `https://t.me/${metrics.username}`,
          },
          // Pass MTProto-specific intel for scoring
          _mtprotoIntel: {
            engagement_rate: metrics.engagement_rate,
            views_trend: metrics.views_trend,
            post_frequency_per_week: metrics.post_frequency_per_week,
            verified: metrics.verified,
          },
        };

        // Calculate scores using the scoring engine
        const scores = calcularCAS(enrichedCanal, [], canal.categoria || 'otros');

        // Update scoring fields on Canal
        updateData.CAF = scores.CAF;
        updateData.CTF = scores.CTF;
        updateData.CER = scores.CER;
        updateData.CVS = scores.CVS;
        // CAP stays untouched — it comes from real campaign data
        updateData.CAS = scores.CAS;
        updateData.nivel = scores.nivel;
        updateData.CPMDinamico = scores.CPMDinamico;
        updateData['verificacion.confianzaScore'] = scores.confianzaScore;
        updateData['antifraude.ratioCTF_CAF'] = scores.ratioCTF_CAF;
        updateData['antifraude.flags'] = scores.flags;
        updateData['antifraude.ultimaRevision'] = new Date();

        await Canal.updateOne({ _id: canal._id }, { $set: updateData });

        // Create score snapshot
        await CanalScoreSnapshot.create({
          canalId: canal._id,
          fecha: new Date(),
          CAF: scores.CAF,
          CTF: scores.CTF,
          CER: scores.CER,
          CVS: scores.CVS,
          CAP: canal.CAP ?? 50, // preserve existing CAP
          CAS: scores.CAS,
          nivel: scores.nivel,
          CPMDinamico: scores.CPMDinamico,
          confianzaScore: scores.confianzaScore,
          ratioCTF_CAF: scores.ratioCTF_CAF,
          flags: scores.flags,
          seguidores: metrics.participants_count ?? 0,
          nicho: canal.categoria || 'otros',
          plataforma: 'telegram',
          version: 2,
          // MTProto-specific fields
          telegramIntel: {
            avg_views_last_20_posts: metrics.avg_views_last_20_posts,
            engagement_rate: metrics.engagement_rate,
            post_frequency_per_week: metrics.post_frequency_per_week,
            views_trend: metrics.views_trend,
            last_post_date: metrics.last_post_date,
            verified: metrics.verified,
          },
        });

        processed++;
      } catch (err) {
        errors.push(`Canal ${canal._id} (@${username}): ${err.message}`);
      }

      // Rate limit between channels
      await sleep(RATE_LIMIT_MS);
    }
  } finally {
    await disconnectClient();
  }

  return {
    processed,
    errors,
    duration_ms: Date.now() - start,
  };
}

// ─── Discovery: keyword search via contacts.Search ──────────────────────

// Full keyword set for massive discovery (115+ terms)
const ALL_KEYWORDS = [
  // Finanzas/Inversión
  'bolsa española', 'invertir en bolsa', 'trading español',
  'fondos de inversión', 'dividendos acciones', 'IBEX 35',
  'finanzas personales', 'ahorro España', 'hipoteca consejos',
  'crypto español', 'bitcoin español', 'ethereum comunidad',
  'DeFi español', 'NFT español', 'forex trading español',
  // Marketing/Negocios
  'marketing digital España', 'SEO español', 'growth hacking',
  'emprendedores españoles', 'startups España', 'ecommerce España',
  'dropshipping español', 'Amazon FBA español', 'copywriting español',
  'redes sociales marketing', 'email marketing', 'publicidad digital',
  'community manager', 'content creator español', 'personal branding',
  // Tecnología
  'programación español', 'desarrollo web', 'inteligencia artificial',
  'machine learning español', 'ciberseguridad', 'blockchain español',
  'apps movil', 'SaaS español', 'no-code herramientas', 'python español',
  // Salud/Fitness
  'fitness español', 'nutrición deportiva', 'gym motivación',
  'pérdida de peso', 'running España', 'yoga español',
  'salud mental', 'meditación mindfulness', 'dieta cetogénica',
  'crossfit comunidad',
  // Educación
  'cursos online español', 'inglés aprende', 'oposiciones España',
  'universidad España', 'productividad personal', 'hábitos éxito',
  'libros resúmenes', 'idiomas aprendizaje', 'certificaciones IT',
  'formación profesional',
  // Lifestyle/Entretenimiento
  'viajes España', 'viajes baratos', 'fotografía español',
  'cocina recetas español', 'series películas', 'música española',
  'fútbol noticias', 'humor español', 'gaming español', 'anime español',
  // Inmobiliario/Legal
  'inmobiliaria inversión', 'alquiler pisos', 'comprar casa España',
  'autónomos España', 'fiscalidad España', 'derecho laboral',
  'seguros comparar', 'noticias economía', 'política España',
  'actualidad España',
  // ── Expansion 2026-04-15 ─────────────────────────────────────
  // Mascotas/familia
  'mascotas perros España', 'gatos consejos', 'veterinaria consejos',
  'embarazo España', 'crianza bebé', 'maternidad blog',
  'niños actividades', 'educación infantil',
  // Hogar/DIY
  'bricolaje español', 'decoración hogar', 'jardinería consejos',
  'hogar minimalista', 'organización hogar', 'manualidades español',
  // Deportes específicos
  'fútbol La Liga', 'Real Madrid noticias', 'FC Barcelona',
  'baloncesto ACB', 'MotoGP España', 'Fórmula 1 español',
  'tenis español', 'pádel España', 'ciclismo español',
  // Moda/belleza
  'moda mujer España', 'moda hombre', 'belleza maquillaje',
  'cosmética natural', 'skincare español', 'peluquería consejos',
  // Gastronomía
  'recetas caseras España', 'repostería casera', 'vinos España',
  'tapas pinchos', 'dieta mediterránea', 'cocina saludable',
  // Motor
  'coches motor España', 'motos España', 'coches eléctricos',
  'autocaravanas camping', 'motor noticias',
  // Cultura/Arte
  'cine español', 'literatura libros español', 'arte pintura',
  'música flamenco', 'fotografía profesional', 'teatro España',
  // Profesional/B2B
  'oposiciones policía', 'oposiciones educación', 'oposiciones justicia',
  'energía solar', 'agricultura ecológica', 'logística transporte',
  'industria 4.0', 'exportación España', 'recursos humanos',
  // Viajes nicho
  'mochilero viajes', 'viajes Asia', 'viajes Europa',
  'rutas senderismo', 'turismo rural España',
];

// Seed channels for social graph discovery (large Spanish channels)
const SEED_CHANNELS = [
  'forocoches', 'elconfidencial', 'expansion_com',
  'lasexta', 'elespanol', 'larazon_es', 'okdiario',
  'elmundo_es', 'elpais', 'abc_es',
  'inversoresbolsa', 'tradingespanol', 'cryptoespanol',
  'marketingdigitalespana', 'emprendedores_es',
];
const KEYWORDS_PER_RUN = 8;
function getKeywordsForRun() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const offset = (dayOfYear * KEYWORDS_PER_RUN) % ALL_KEYWORDS.length;
  const picked = [];
  for (let i = 0; i < KEYWORDS_PER_RUN; i++) {
    picked.push(ALL_KEYWORDS[(offset + i) % ALL_KEYWORDS.length]);
  }
  return picked;
}
const DISCOVERY_KEYWORDS = ALL_KEYWORDS;

/**
 * Pick the next keyword slice for a given source, advancing a persistent
 * cursor in MongoDB so consecutive runs query different slices.
 *
 * Wrap-around is natural: when offset + sliceSize exceeds the pool length,
 * the slice wraps to the beginning. Over ceil(poolSize / sliceSize) runs
 * the full ALL_KEYWORDS space is covered, then the cycle repeats.
 *
 * If the DB is unreachable (or the ScrapingRotation collection is missing),
 * falls back to a time-based rotation using dayOfYear so discovery is never
 * blocked by the persistence layer.
 *
 * @param {'mtproto_keywords'|'lyzem_keywords'} source
 * @param {number} sliceSize — number of keywords to pick this run
 * @returns {Promise<string[]>}
 */
async function getRotatingKeywords(source, sliceSize) {
  try {
    const ScrapingRotation = require('../models/ScrapingRotation');
    let state = await ScrapingRotation.findOne({ source });
    if (!state) {
      state = new ScrapingRotation({
        source,
        offset: 0,
        totalKeywords: ALL_KEYWORDS.length,
      });
    }

    const startOffset = state.offset % ALL_KEYWORDS.length;
    const picked = [];
    for (let i = 0; i < sliceSize; i++) {
      picked.push(ALL_KEYWORDS[(startOffset + i) % ALL_KEYWORDS.length]);
    }

    state.offset = (startOffset + sliceSize) % ALL_KEYWORDS.length;
    state.totalKeywords = ALL_KEYWORDS.length;
    state.lastRunAt = new Date();
    state.lastSlice = picked;
    await state.save();

    return picked;
  } catch (err) {
    // Fallback to deterministic time-based rotation if DB is unavailable
    console.warn(`[rotation] ${source} fallback to time-based: ${err.message}`);
    const dayOfYear = Math.floor(Date.now() / 86400000);
    const offset = (dayOfYear * sliceSize) % ALL_KEYWORDS.length;
    const picked = [];
    for (let i = 0; i < sliceSize; i++) {
      picked.push(ALL_KEYWORDS[(offset + i) % ALL_KEYWORDS.length]);
    }
    return picked;
  }
}

/**
 * Discover channels by keyword search via MTProto contacts.Search.
 *
 * @param {string[]} keywords — search terms
 * @returns {Array<{ username, title, subscribers, description }>}
 */
async function discoverByKeywords(keywords = getKeywordsForRun()) {
  const { Api } = loadGramJS();
  const client = await getClient();
  const seen = new Map();
  const errors = [];

  for (const keyword of keywords) {
    try {
      const result = await client.invoke(
        new Api.contacts.Search({ q: keyword, limit: 100 })
      );

      const chats = result.chats || [];
      for (const chat of chats) {
        if (chat.className !== 'Channel') continue;
        if (chat.megagroup) continue; // skip supergroups
        if (!chat.username) continue;
        if ((chat.participantsCount || 0) < 500) continue;

        const uname = chat.username.toLowerCase();
        if (!seen.has(uname)) {
          seen.set(uname, {
            username: uname,
            title: chat.title || '',
            subscribers: chat.participantsCount || 0,
            description: '', // contacts.Search doesn't return about
          });
        }
      }
    } catch (err) {
      errors.push(`Keyword "${keyword}": ${err.message}`);
    }

    await sleep(3000); // 3s between keywords
  }

  return { results: Array.from(seen.values()), errors };
}

/**
 * Discover channels from the social graph of known channels.
 * Extracts forwards and @mentions from recent posts.
 *
 * @param {string[]} channelUsernames — seed channels
 * @param {object} [options]
 * @param {number} [options.maxSeeds=3] — max seeds to process (Vercel default 3, CLI jobs can raise)
 * @param {number} [options.maxResolvePerSeed=5] — max entities to resolve per seed
 * @param {number} [options.messagesPerSeed=20] — recent posts to scan per seed
 * @returns {Array<{ username, title, subscribers }>}
 */
async function discoverFromSocialGraph(channelUsernames = [], options = {}) {
  const { Api } = loadGramJS();
  const client = await getClient();
  const seen = new Map();
  const errors = [];

  const maxSeeds = options.maxSeeds ?? 3;
  const maxResolvePerSeed = options.maxResolvePerSeed ?? 5;
  const messagesPerSeed = options.messagesPerSeed ?? 20;

  const seeds = channelUsernames.slice(0, maxSeeds);

  for (const username of seeds) {
    try {
      const cleanName = username.replace(/^@/, '').trim();
      if (!cleanName) continue;

      const entity = await client.getEntity(cleanName);
      if (!entity || !(entity instanceof Api.Channel)) {
        await sleep(2000);
        continue;
      }

      // Get last N posts
      const messages = await client.getMessages(entity, { limit: messagesPerSeed });

      const discoveredIds = new Set();

      for (const msg of messages) {
        // Extract forwarded channel IDs
        if (msg.fwdFrom?.fromId?.channelId) {
          discoveredIds.add(String(msg.fwdFrom.fromId.channelId));
        }

        // Extract @mentions from text
        if (msg.message) {
          const mentions = msg.message.match(/@([\w]{5,})/g) || [];
          for (const mention of mentions) {
            const mUsername = mention.slice(1).toLowerCase();
            if (!seen.has(mUsername)) {
              discoveredIds.add(mUsername); // will resolve below
            }
          }
        }

        await sleep(100); // minimal delay between post processing
      }

      // Resolve discovered IDs/usernames (configurable per seed)
      let resolveCount = 0;
      for (const idOrUsername of discoveredIds) {
        if (resolveCount >= maxResolvePerSeed) break;
        if (seen.has(idOrUsername)) continue;
        try {
          const ent = await client.getEntity(idOrUsername);
          if (
            ent &&
            ent.className === 'Channel' &&
            !ent.megagroup &&
            ent.username &&
            (ent.participantsCount || 0) >= 500
          ) {
            const uname = ent.username.toLowerCase();
            if (!seen.has(uname)) {
              seen.set(uname, {
                username: uname,
                title: ent.title || '',
                subscribers: ent.participantsCount || 0,
              });
            }
          }
          resolveCount++;
        } catch {
          resolveCount++;
        }
        await sleep(1000); // 1s between entity resolutions
      }
    } catch (err) {
      errors.push(`SocialGraph @${username}: ${err.message}`);
    }

    await sleep(2000); // 2s between seed channels
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  getClient,
  disconnectClient,
  getChannelMetrics,
  syncAllMappedChannels,
  discoverByKeywords,
  discoverFromSocialGraph,
  getRotatingKeywords,
  sleep,
  loadGramJS,
  RATE_LIMIT_MS,
  DISCOVERY_KEYWORDS,
  ALL_KEYWORDS,
  SEED_CHANNELS,
};
