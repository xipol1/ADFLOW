const STORAGE_KEY = "adflow_demo_mockup_v1";

function uid(prefix) {
  const base = Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `${prefix}_${base.slice(0, 14)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function fmtMoney(amount) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function getHashPath() {
  const raw = window.location.hash || "#/";
  const s = raw.startsWith("#") ? raw.slice(1) : raw;
  return s || "/";
}

function setHashPath(path) {
  window.location.hash = `#${path}`;
}

function parseRoute(path) {
  const clean = path.split("?")[0] || "/";
  const seg = clean.split("/").filter(Boolean);
  const q = new URLSearchParams((path.split("?")[1] || "").trim());
  return { seg, q };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addDays(date, days) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function makeDefaultAvailability(channel) {
  const platform = String(channel?.platform || "Telegram");
  const dow = {
    0: { enabled: true, capacity: 1, hotBoost: 1.15 },
    1: { enabled: true, capacity: 1, hotBoost: 1.05 },
    2: { enabled: true, capacity: 2, hotBoost: 1.2 },
    3: { enabled: true, capacity: 2, hotBoost: 1.1 },
    4: { enabled: true, capacity: 2, hotBoost: 1.25 },
    5: { enabled: true, capacity: 1, hotBoost: 1.05 },
    6: { enabled: true, capacity: 1, hotBoost: 1.3 },
  };

  if (platform === "Discord") {
    dow[2] = { enabled: true, capacity: 2, hotBoost: 1.1 };
    dow[3] = { enabled: true, capacity: 2, hotBoost: 1.25 };
    dow[4] = { enabled: true, capacity: 2, hotBoost: 1.2 };
    dow[6] = { enabled: true, capacity: 1, hotBoost: 1.15 };
  }

  if (platform === "WhatsApp") {
    dow[1] = { enabled: true, capacity: 1, hotBoost: 1.15 };
    dow[2] = { enabled: true, capacity: 1, hotBoost: 1.2 };
    dow[3] = { enabled: true, capacity: 1, hotBoost: 1.1 };
    dow[4] = { enabled: true, capacity: 1, hotBoost: 1.15 };
    dow[6] = { enabled: true, capacity: 1, hotBoost: 1.05 };
  }

  return {
    timezone: "Europe/Madrid",
    weekly: dow,
    blackoutDates: [],
  };
}

function seedState() {
  const admin = { id: uid("usr"), role: "creator", name: "Lucía Canal", email: "admin@demo.com", password: "demo123", createdAt: nowIso() };
  const adv = { id: uid("usr"), role: "advertiser", name: "Marcos Brand", email: "anunciante@demo.com", password: "demo123", createdAt: nowIso() };
  const creator2 = { id: uid("usr"), role: "creator", name: "Nora Community", email: "nora@demo.com", password: "demo123", createdAt: nowIso() };
  const users = [admin, adv, creator2];
  const channels = [
    {
      id: uid("chn"),
      ownerId: admin.id,
      name: "Crypto Latam Premium",
      platform: "Telegram",
      category: "Finanzas",
      price: 120,
      rating: 4.8,
      tags: ["crypto", "trading", "latam"],
      description: "Comunidad cerrada de señales y análisis. Publicaciones diarias con alto engagement.",
      createdAt: nowIso(),
      availability: null,
    },
    {
      id: uid("chn"),
      ownerId: admin.id,
      name: "Indie Makers ES",
      platform: "Discord",
      category: "SaaS",
      price: 80,
      rating: 4.6,
      tags: ["saas", "startups", "makers"],
      description: "Servidor privado con founders. Ideal para tools B2B y lanzamientos.",
      createdAt: nowIso(),
      availability: null,
    },
    {
      id: uid("chn"),
      ownerId: creator2.id,
      name: "Fitness Pro Club",
      platform: "Telegram",
      category: "Fitness",
      price: 60,
      rating: 4.5,
      tags: ["fitness", "salud", "rutinas"],
      description: "Canal exclusivo con rutinas semanales y retos. Audiencia muy activa.",
      createdAt: nowIso(),
      availability: null,
    },
  ];

  for (const ch of channels) {
    ch.availability = makeDefaultAvailability(ch);
  }

  const c1Date = todayKey(addDays(new Date(), 4));
  const c2Date = todayKey(addDays(new Date(), -1));

  const c1 = {
    id: uid("cmp"),
    advertiserId: adv.id,
    channelId: channels[0].id,
    creativeText: "🚀 Prueba nuestro bot de alertas cripto con 7 días gratis. Señales claras + gestión de riesgo.",
    link: "https://example.com/crypto-bot",
    status: "PAGADA",
    paymentStatus: "PAID",
    publicationStatus: "PENDING",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: { borradorAt: nowIso(), pagadaAt: nowIso(), aceptadaAt: null, publicadaAt: null, completadaAt: null },
    schedule: { count: 1, requestedDates: [c1Date], confirmedDates: [], publishedDates: [] },
    tracking: { clicks: 0, clickTimestamps: [], daily: {} },
  };

  const c2 = {
    id: uid("cmp"),
    advertiserId: adv.id,
    channelId: channels[1].id,
    creativeText: "Lanza tu SaaS en 3 días: landing + pagos + analytics. Plantillas y soporte en vivo.",
    link: "https://example.com/saas-kit",
    status: "PUBLICADA",
    paymentStatus: "PAID",
    publicationStatus: "PUBLISHED",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: { borradorAt: nowIso(), pagadaAt: nowIso(), aceptadaAt: nowIso(), publicadaAt: nowIso(), completadaAt: null },
    schedule: { count: 1, requestedDates: [c2Date], confirmedDates: [c2Date], publishedDates: [c2Date] },
    tracking: { clicks: 74, clickTimestamps: [], daily: {} },
  };

  const state = {
    version: 1,
    session: { userId: null, viewAs: "advertiser", calendars: {} },
    users,
    channels,
    campaigns: [c1, c2],
    notifications: [],
  };

  hydrateTracking(state);
  return state;
}

function ensureState() {
  const loaded = loadState();
  if (loaded && loaded.version === 1) {
    hydrateTracking(loaded);
    hydrateScheduling(loaded);
    return loaded;
  }
  const seeded = seedState();
  hydrateScheduling(seeded);
  saveState(seeded);
  return seeded;
}

function todayKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = `${x.getMonth() + 1}`.padStart(2, "0");
  const day = `${x.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDailyClicks(tracking, dateKey, amount) {
  tracking.daily = tracking.daily || {};
  tracking.daily[dateKey] = (tracking.daily[dateKey] || 0) + amount;
}

function hydrateTracking(state) {
  for (const c of state.campaigns || []) {
    c.tracking = c.tracking || { clicks: 0, clickTimestamps: [], daily: {} };
    c.tracking.clicks = Number(c.tracking.clicks || 0);
    c.tracking.clickTimestamps = Array.isArray(c.tracking.clickTimestamps) ? c.tracking.clickTimestamps : [];
    c.tracking.daily = c.tracking.daily && typeof c.tracking.daily === "object" ? c.tracking.daily : {};
    if (c.status === "PUBLICADA" || c.status === "COMPLETADA") {
      if (Object.keys(c.tracking.daily).length === 0) {
        const base = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(base);
          d.setDate(base.getDate() - i);
          const k = todayKey(d);
          const v = Math.max(0, Math.round((Math.sin(i * 1.2) + 1) * 6 + (Math.random() * 3)));
          addDailyClicks(c.tracking, k, v);
          c.tracking.clicks += v;
        }
      }
    }
  }
}

function hydrateScheduling(state) {
  state.session = state.session && typeof state.session === "object" ? state.session : {};
  state.session.calendars = state.session.calendars && typeof state.session.calendars === "object" ? state.session.calendars : {};

  state.channels = Array.isArray(state.channels) ? state.channels : [];
  for (const ch of state.channels) {
    if (!ch.availability) ch.availability = makeDefaultAvailability(ch);
    ch.availability.timezone = String(ch.availability.timezone || "Europe/Madrid");
    ch.availability.weekly = ch.availability.weekly && typeof ch.availability.weekly === "object" ? ch.availability.weekly : makeDefaultAvailability(ch).weekly;
    ch.availability.blackoutDates = Array.isArray(ch.availability.blackoutDates) ? ch.availability.blackoutDates : [];
    for (let i = 0; i < 7; i++) {
      const w = ch.availability.weekly[i] || {};
      ch.availability.weekly[i] = {
        enabled: w.enabled !== false,
        capacity: Math.max(0, Math.min(10, Number(w.capacity ?? 1))),
        hotBoost: Math.max(0.8, Math.min(1.6, Number(w.hotBoost ?? 1.1))),
      };
    }
  }

  state.campaigns = Array.isArray(state.campaigns) ? state.campaigns : [];
  for (const c of state.campaigns) {
    c.schedule = c.schedule && typeof c.schedule === "object" ? c.schedule : { count: 1, requestedDates: [], confirmedDates: [], publishedDates: [] };
    c.schedule.count = Math.max(1, Math.min(5, Number(c.schedule.count || 1)));
    c.schedule.requestedDates = Array.isArray(c.schedule.requestedDates) ? c.schedule.requestedDates : [];
    c.schedule.confirmedDates = Array.isArray(c.schedule.confirmedDates) ? c.schedule.confirmedDates : [];
    c.schedule.publishedDates = Array.isArray(c.schedule.publishedDates) ? c.schedule.publishedDates : [];

    if (c.status === "PUBLICADA" || c.status === "COMPLETADA") {
      if (c.schedule.confirmedDates.length === 0 && c.schedule.requestedDates.length) c.schedule.confirmedDates = [...c.schedule.requestedDates];
      if (c.schedule.publishedDates.length === 0 && c.schedule.confirmedDates.length) c.schedule.publishedDates = [c.schedule.confirmedDates[0]];
    }
  }
}

function getUser(state, id) {
  return (state.users || []).find((u) => u.id === id) || null;
}

function getSessionUser(state) {
  return getUser(state, state.session.userId);
}

function statusLabel(s) {
  const map = { BORRADOR: "BORRADOR", PAGADA: "PAGADA", ACEPTADA: "ACEPTADA", PUBLICADA: "PUBLICADA", COMPLETADA: "COMPLETADA" };
  return map[s] || s || "—";
}

function statusClass(s) {
  const map = { BORRADOR: "s-borrador", PAGADA: "s-pagada", ACEPTADA: "s-aceptada", PUBLICADA: "s-publicada", COMPLETADA: "s-completada" };
  return map[s] || "s-borrador";
}

function campaignTimelineSteps(c) {
  const t = c.timeline || {};
  const order = [
    { key: "BORRADOR", at: t.borradorAt, label: "Borrador" },
    { key: "PAGADA", at: t.pagadaAt, label: "Pagada (escrow)" },
    { key: "ACEPTADA", at: t.aceptadaAt, label: "Aceptada por canal" },
    { key: "PUBLICADA", at: t.publicadaAt, label: "Publicada" },
    { key: "COMPLETADA", at: t.completadaAt, label: "Completada (pago liberado)" },
  ];
  return order.map((x) => ({ ...x, done: !!x.at }));
}

function channelById(state, id) {
  return (state.channels || []).find((c) => c.id === id) || null;
}

function campaignsForAdvertiser(state, advertiserId) {
  return (state.campaigns || []).filter((c) => c.advertiserId === advertiserId);
}

function campaignsForCreator(state, creatorId) {
  const ownedChannelIds = new Set((state.channels || []).filter((ch) => ch.ownerId === creatorId).map((ch) => ch.id));
  return (state.campaigns || []).filter((c) => ownedChannelIds.has(c.channelId));
}

function dateKeyToDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function monthKeyFromDate(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = `${x.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function parseMonthKey(monthKey) {
  const [y, m] = String(monthKey || "").split("-");
  const yy = Number(y || 0);
  const mm = Number(m || 1);
  return { y: yy, m: mm };
}

function addMonthsToMonthKey(monthKey, delta) {
  const { y, m } = parseMonthKey(monthKey);
  const d = new Date(y, Math.max(0, (m || 1) - 1), 1);
  d.setMonth(d.getMonth() + Number(delta || 0));
  return monthKeyFromDate(d);
}

function monthLabel(monthKey) {
  const { y, m } = parseMonthKey(monthKey);
  const d = new Date(y, Math.max(0, (m || 1) - 1), 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function mondayFirstDow(d) {
  const dow = d.getDay();
  return (dow + 6) % 7;
}

function buildMonthGrid(monthKey) {
  const { y, m } = parseMonthKey(monthKey);
  const first = new Date(y, Math.max(0, (m || 1) - 1), 1);
  const startOffset = mondayFirstDow(first);
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  const out = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dk = todayKey(d);
    out.push({ dateKey: dk, day: d.getDate(), inMonth: d.getMonth() === first.getMonth(), dow: mondayFirstDow(d), date: d });
  }
  return out;
}

function ensureCalendar(state, calId, defaults) {
  state.session = state.session || {};
  state.session.calendars = state.session.calendars || {};
  const cur = state.session.calendars[calId];
  if (cur && typeof cur === "object") return cur;
  const next = defaults && typeof defaults === "object" ? defaults : {};
  state.session.calendars[calId] = next;
  return next;
}

function getChannelAvailability(ch) {
  return ch && ch.availability && typeof ch.availability === "object" ? ch.availability : makeDefaultAvailability(ch);
}

function countBookingsForChannelDate(state, channelId, dateKey) {
  let n = 0;
  for (const c of state.campaigns || []) {
    if (c.channelId !== channelId) continue;
    if (!(c.status === "PAGADA" || c.status === "ACEPTADA" || c.status === "PUBLICADA" || c.status === "COMPLETADA")) continue;
    const sch = c.schedule || {};
    const dates = (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [];
    if (dates.includes(dateKey)) n++;
  }
  return n;
}

function countBookingsForChannelDateExcluding(state, channelId, dateKey, excludeCampaignId) {
  let n = 0;
  for (const c of state.campaigns || []) {
    if (excludeCampaignId && c.id === excludeCampaignId) continue;
    if (c.channelId !== channelId) continue;
    if (!(c.status === "PAGADA" || c.status === "ACEPTADA" || c.status === "PUBLICADA" || c.status === "COMPLETADA")) continue;
    const sch = c.schedule || {};
    const dates = (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [];
    if (dates.includes(dateKey)) n++;
  }
  return n;
}

function isChannelDateAvailable(state, channel, dateKey) {
  const av = getChannelAvailability(channel);
  const d = dateKeyToDate(dateKey);
  const dow = d.getDay();
  const w = av.weekly && av.weekly[dow] ? av.weekly[dow] : { enabled: true, capacity: 1, hotBoost: 1.1 };
  if (!w.enabled) return { ok: false, reason: "Día no disponible" };
  if ((av.blackoutDates || []).includes(dateKey)) return { ok: false, reason: "Bloqueado por el canal" };
  const booked = countBookingsForChannelDate(state, channel.id, dateKey);
  if (booked >= Number(w.capacity || 0)) return { ok: false, reason: "Sin cupo" };
  return { ok: true, reason: "" };
}

function isChannelDateAvailableExcluding(state, channel, dateKey, excludeCampaignId) {
  const av = getChannelAvailability(channel);
  const d = dateKeyToDate(dateKey);
  const dow = d.getDay();
  const w = av.weekly && av.weekly[dow] ? av.weekly[dow] : { enabled: true, capacity: 1, hotBoost: 1.1 };
  if (!w.enabled) return { ok: false, reason: "Día no disponible" };
  if ((av.blackoutDates || []).includes(dateKey)) return { ok: false, reason: "Bloqueado por el canal" };
  const booked = countBookingsForChannelDateExcluding(state, channel.id, dateKey, excludeCampaignId);
  if (booked >= Number(w.capacity || 0)) return { ok: false, reason: "Sin cupo" };
  return { ok: true, reason: "" };
}

function channelHotScoreForDate(channel, dateKey) {
  const av = getChannelAvailability(channel);
  const d = dateKeyToDate(dateKey);
  const dow = d.getDay();
  const w = av.weekly && av.weekly[dow] ? av.weekly[dow] : { enabled: true, capacity: 1, hotBoost: 1.1 };
  const baseByPlatform = {
    Telegram: [1.15, 1.0, 1.25, 1.05, 1.2, 0.95, 1.35],
    Discord: [1.05, 1.0, 1.1, 1.25, 1.2, 1.05, 1.15],
    WhatsApp: [1.05, 1.15, 1.2, 1.05, 1.15, 0.95, 1.0],
    Instagram: [1.2, 1.05, 1.1, 1.1, 1.2, 1.25, 1.3],
  };
  const p = String(channel?.platform || "Telegram");
  const arr = baseByPlatform[p] || baseByPlatform.Telegram;
  const base = Number(arr[dow] || 1.0);
  const mix = base * Number(w.hotBoost || 1.1);
  const norm = Math.max(0, Math.min(1, (mix - 0.9) / 0.8));
  return norm;
}

function renderMonthlyCalendar(state, opts) {
  const calId = String(opts.calId || "cal");
  const monthKey = String(opts.monthKey || monthKeyFromDate(new Date()));
  const selected = Array.isArray(opts.selected) ? opts.selected : [];
  const grid = buildMonthGrid(monthKey);
  const title = monthLabel(monthKey);
  const headers = ["L", "M", "X", "J", "V", "S", "D"].map((h) => `<div class="cal-head">${h}</div>`).join("");
  const cells = grid
    .map((day) => {
      const isSelected = selected.includes(day.dateKey);
      const disabled = typeof opts.isDisabled === "function" ? !!opts.isDisabled(day) : false;
      const heat = typeof opts.heat === "function" ? Number(opts.heat(day) || 0) : 0;
      const label = typeof opts.badge === "function" ? opts.badge(day) : "";
      return `
        <button
          class="cal-day ${day.inMonth ? "" : "out"} ${disabled ? "disabled" : ""} ${isSelected ? "selected" : ""}"
          style="--heat:${Math.max(0, Math.min(1, heat)).toFixed(3)}"
          ${disabled ? "disabled" : ""}
          data-action="calToggleDate"
          data-cal-id="${escapeHtml(calId)}"
          data-date="${escapeHtml(day.dateKey)}"
        >
          <div class="cal-top">
            <div class="cal-num">${escapeHtml(String(day.day))}</div>
            ${label ? `<div class="cal-badge">${escapeHtml(label)}</div>` : ""}
          </div>
        </button>
      `;
    })
    .join("");

  return `
    <div class="calendar" data-cal="${escapeHtml(calId)}">
      <div class="cal-bar">
        <button class="btn" data-action="calPrevMonth" data-cal-id="${escapeHtml(calId)}">←</button>
        <div class="cal-title">${escapeHtml(title)}</div>
        <button class="btn" data-action="calNextMonth" data-cal-id="${escapeHtml(calId)}">→</button>
      </div>
      <div class="cal-grid">
        ${headers}
        ${cells}
      </div>
    </div>
  `;
}

function toast(message, detail) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<div>${escapeHtml(message)}</div>${detail ? `<div class="small">${escapeHtml(detail)}</div>` : ""}`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2600);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTopbar(state, path) {
  const user = getSessionUser(state);
  const viewAs = state.session.viewAs || "advertiser";
  const links = [
    { to: "/", label: "Home" },
    { to: "/marketplace", label: "Canales" },
    { to: viewAs === "creator" ? "/dashboard/creator" : "/dashboard/advertiser", label: "Dashboard" },
  ];

  const navLinks = links
    .map((l) => {
      const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
      return `<a class="navlink ${active ? "active" : ""}" href="#${l.to}">${escapeHtml(l.label)}</a>`;
    })
    .join("");

  const roleChips = `
    <div class="chipset" role="tablist" aria-label="Ver como">
      <button class="chip ${viewAs === "advertiser" ? "active" : ""}" data-action="setViewAs" data-role="advertiser">Ver como anunciante</button>
      <button class="chip ${viewAs === "creator" ? "active" : ""}" data-action="setViewAs" data-role="creator">Ver como admin</button>
    </div>
  `;

  const authSlot = user
    ? `<div class="pill"><strong>${escapeHtml(user.name)}</strong> <span class="muted">${escapeHtml(user.role === "creator" ? "Admin canal" : "Anunciante")}</span></div>
       <button class="btn ghost" data-action="logout">Salir</button>`
    : `<a class="btn primary" href="#/auth">Entrar</a>`;

  return `
    <div class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="#/">
          <span class="brand-dot"></span>
          <span>Adflow Demo</span>
        </a>
        <div class="nav">
          ${navLinks}
        </div>
        <div class="right">
          ${roleChips}
          ${authSlot}
        </div>
      </div>
    </div>
  `;
}

function renderHome(state) {
  const channels = state.channels || [];
  const totalCampaigns = (state.campaigns || []).length;
  const totalClicks = (state.campaigns || []).reduce((acc, c) => acc + Number(c.tracking?.clicks || 0), 0);

  const featured = channels.slice(0, 3).map((c) => renderChannelCard(state, c)).join("");

  return `
    <div class="container">
      <div class="hero">
        <div class="hero-grid">
          <div>
            <h1 class="h1">Marketplace de anuncios en canales cerrados.</h1>
            <p class="subtitle">Demo 100% visual: canal → campaña → pago (escrow) → publicación → tracking → pago liberado. Sin backend, todo mock con datos persistidos en tu navegador.</p>
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
              <a class="btn primary" href="#/marketplace">Explorar canales</a>
              <a class="btn" href="#/auth">Registro / login</a>
              <button class="btn" data-action="resetDemo">Reset demo</button>
            </div>
            <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
              <span class="pill">Canales <strong>${channels.length}</strong></span>
              <span class="pill">Campañas <strong>${totalCampaigns}</strong></span>
              <span class="pill">Clicks (fake) <strong>${totalClicks}</strong></span>
            </div>
          </div>
          <div class="panel pad">
            <div class="section-title" style="margin-top:0;">Cuentas demo</div>
            <div class="grid cols-2">
              <div class="card">
                <div class="card-title">
                  <h3>Admin de canal</h3>
                  <span class="status s-aceptada"><span class="dot"></span>Rol</span>
                </div>
                <div class="muted">Email: <span style="font-family:var(--mono);">${escapeHtml("admin@demo.com")}</span></div>
                <div class="muted">Pass: <span style="font-family:var(--mono);">${escapeHtml("demo123")}</span></div>
                <button class="btn good" data-action="quickLogin" data-email="admin@demo.com" data-pass="demo123">Entrar como admin</button>
              </div>
              <div class="card">
                <div class="card-title">
                  <h3>Anunciante</h3>
                  <span class="status s-pagada"><span class="dot"></span>Rol</span>
                </div>
                <div class="muted">Email: <span style="font-family:var(--mono);">${escapeHtml("anunciante@demo.com")}</span></div>
                <div class="muted">Pass: <span style="font-family:var(--mono);">${escapeHtml("demo123")}</span></div>
                <button class="btn primary" data-action="quickLogin" data-email="anunciante@demo.com" data-pass="demo123">Entrar como anunciante</button>
              </div>
            </div>
            <div class="divider" style="margin:14px 0;"></div>
            <div class="muted">Tip: usa “Ver como…” para alternar el dashboard y el flujo end-to-end.</div>
          </div>
        </div>
      </div>

      <div class="section-title">Destacados</div>
      <div class="grid cols-3">
        ${featured || `<div class="muted">No hay canales todavía.</div>`}
      </div>
    </div>
  `;
}

function renderMarketplace(state, q) {
  const query = (q.get("q") || "").trim().toLowerCase();
  const platform = (q.get("platform") || "all").trim();
  const category = (q.get("category") || "all").trim();

  const platforms = ["all", ...new Set((state.channels || []).map((c) => c.platform))];
  const categories = ["all", ...new Set((state.channels || []).map((c) => c.category))];

  const filtered = (state.channels || []).filter((c) => {
    const hitQuery =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      (c.tags || []).some((t) => String(t).toLowerCase().includes(query));
    const hitPlatform = platform === "all" || c.platform === platform;
    const hitCategory = category === "all" || c.category === category;
    return hitQuery && hitPlatform && hitCategory;
  });

  const cards = filtered.map((c) => renderChannelCard(state, c)).join("");

  return `
    <div class="container">
      <div class="panel pad">
        <div class="grid cols-3">
          <div class="field">
            <div class="label">Buscar</div>
            <input class="input" placeholder="Ej: crypto, fitness, SaaS..." value="${escapeHtml(query)}" data-bind="q" />
          </div>
          <div class="field">
            <div class="label">Plataforma</div>
            <select class="select" data-bind="platform">
              ${platforms.map((p) => `<option value="${escapeHtml(p)}" ${p === platform ? "selected" : ""}>${escapeHtml(p === "all" ? "Todas" : p)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <div class="label">Temática</div>
            <select class="select" data-bind="category">
              ${categories.map((c) => `<option value="${escapeHtml(c)}" ${c === category ? "selected" : ""}>${escapeHtml(c === "all" ? "Todas" : c)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn primary" data-action="applyMarketplaceFilters">Aplicar filtros</button>
          <a class="btn" href="#/dashboard/creator">Ir a dashboard admin</a>
          <a class="btn" href="#/dashboard/advertiser">Ir a dashboard anunciante</a>
        </div>
      </div>

      <div class="section-title">Canales</div>
      <div class="grid cols-3">
        ${cards || `<div class="muted">No hay resultados con esos filtros.</div>`}
      </div>
    </div>
  `;
}

function renderChannelCard(state, channel) {
  const owner = getUser(state, channel.ownerId);
  const stars = "★★★★★".slice(0, Math.round(channel.rating || 4));
  return `
    <a class="card" href="#/channel/${encodeURIComponent(channel.id)}">
      <div class="card-title">
        <h3>${escapeHtml(channel.name)}</h3>
        <span class="price">${fmtMoney(channel.price)}</span>
      </div>
      <div class="meta">
        <span class="status s-publicada"><span class="dot"></span>${escapeHtml(channel.platform)}</span>
        <span class="status s-aceptada"><span class="dot"></span>${escapeHtml(channel.category)}</span>
        <span class="status s-borrador"><span class="dot"></span>${escapeHtml(stars)} <span class="muted">(${escapeHtml(String(channel.rating || 0))})</span></span>
      </div>
      <div class="muted">${escapeHtml(channel.description)}</div>
      <div class="meta">
        ${(channel.tags || []).slice(0, 4).map((t) => `<span class="pill">#${escapeHtml(t)}</span>`).join("")}
        ${owner ? `<span class="pill">por <strong>${escapeHtml(owner.name)}</strong></span>` : ""}
      </div>
    </a>
  `;
}

function renderChannelDetail(state, channelId) {
  const ch = channelById(state, channelId);
  if (!ch) return renderNotFound("Canal no encontrado");

  const owner = getUser(state, ch.ownerId);
  const user = getSessionUser(state);
  const viewAs = state.session.viewAs || "advertiser";
  const canCreateCampaign = viewAs === "advertiser";
  const canManageChannel = user && user.role === "creator" && user.id === ch.ownerId;

  const actions = `
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      ${canCreateCampaign ? `<a class="btn primary" href="#/campaign/new?channelId=${encodeURIComponent(ch.id)}">Crear campaña (anuncio)</a>` : ""}
      ${canManageChannel ? `<a class="btn" href="#/dashboard/creator">Ver en mi dashboard</a>` : ""}
      <a class="btn ghost" href="#/marketplace">Volver</a>
    </div>
  `;

  return `
    <div class="container">
      <div class="panel pad">
        <div class="grid cols-2">
          <div>
            <div class="meta">
              <span class="status s-publicada"><span class="dot"></span>${escapeHtml(ch.platform)}</span>
              <span class="status s-aceptada"><span class="dot"></span>${escapeHtml(ch.category)}</span>
              <span class="status s-borrador"><span class="dot"></span>Rating ${escapeHtml(String(ch.rating || 0))}</span>
            </div>
            <h2 style="margin:12px 0 0; font-size:26px; letter-spacing:-0.4px;">${escapeHtml(ch.name)}</h2>
            <p class="muted" style="margin:10px 0 0;">${escapeHtml(ch.description)}</p>
            <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
              <span class="pill">Precio <strong>${fmtMoney(ch.price)}</strong></span>
              ${owner ? `<span class="pill">Admin <strong>${escapeHtml(owner.name)}</strong></span>` : ""}
              <span class="pill">Creado <strong>${escapeHtml(fmtDateTime(ch.createdAt))}</strong></span>
            </div>
            <div style="margin-top:14px;">
              ${actions}
            </div>
          </div>
          <div class="card">
            <div class="section-title" style="margin-top:0;">Qué compras aquí</div>
            <div class="timeline">
              <div class="step done"><span class="b"></span>Campaña creada (BORRADOR)</div>
              <div class="step done"><span class="b"></span>Pago simulado en escrow (PAGADA)</div>
              <div class="step done"><span class="b"></span>Aceptación por admin del canal (ACEPTADA)</div>
              <div class="step done"><span class="b"></span>Publicación confirmada (PUBLICADA)</div>
              <div class="step done"><span class="b"></span>Tracking + liberación de pago (COMPLETADA)</div>
            </div>
            <div class="divider"></div>
            <div class="muted">Esta demo muestra el flujo completo, sin integraciones reales.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderChannelSchedule(state, channelId) {
  const ch = channelById(state, channelId);
  if (!ch) return renderNotFound("Canal no encontrado");

  const user = getSessionUser(state);
  if (!user || user.role !== "creator" || user.id !== ch.ownerId) {
    return `
      <div class="container">
        <div class="panel pad">
          <div class="section-title" style="margin-top:0;">Calendario del canal</div>
          <div class="muted">Solo el admin del canal puede configurar disponibilidad, cupos y días HOT.</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
            <a class="btn primary" href="#/auth">Ir a login</a>
            <a class="btn" href="#/channel/${encodeURIComponent(ch.id)}">Volver a la ficha</a>
          </div>
        </div>
      </div>
    `;
  }

  const av = getChannelAvailability(ch);
  const calId = `chBlk_${ch.id}`;
  const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()) });
  cal.monthKey = String(cal.monthKey || monthKeyFromDate(new Date()));

  const blackoutSelected = Array.isArray(av.blackoutDates) ? av.blackoutDates : [];
  const calendar = renderMonthlyCalendar(state, {
    calId,
    monthKey: cal.monthKey,
    selected: blackoutSelected,
    isDisabled: (day) => !day.inMonth,
    heat: (day) => (day.inMonth ? channelHotScoreForDate(ch, day.dateKey) : 0),
    badge: (day) => {
      if (!day.inMonth) return "";
      if ((av.blackoutDates || []).includes(day.dateKey)) return "OFF";
      const heat = channelHotScoreForDate(ch, day.dateKey);
      return heat >= 0.78 ? "HOT" : "";
    },
  });

  const order = [1, 2, 3, 4, 5, 6, 0];
  const dayNames = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };

  const weeklyRows = order
    .map((dow) => {
      const w = (av.weekly && av.weekly[dow]) || { enabled: true, capacity: 1, hotBoost: 1.1 };
      const isHot = Number(w.hotBoost || 1) >= 1.25;
      return `
        <tr>
          <td style="font-weight:750;">${escapeHtml(dayNames[dow])}</td>
          <td>
            <button class="btn ${w.enabled ? "good" : "ghost"}" data-action="toggleWeeklyDay" data-channel-id="${escapeHtml(ch.id)}" data-dow="${escapeHtml(String(dow))}">
              ${w.enabled ? "Disponible" : "Cerrado"}
            </button>
          </td>
          <td>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn" data-action="adjustWeeklyCapacity" data-channel-id="${escapeHtml(ch.id)}" data-dow="${escapeHtml(String(dow))}" data-delta="-1">-</button>
              <span class="pill">Cupo <strong>${escapeHtml(String(w.capacity || 0))}</strong></span>
              <button class="btn" data-action="adjustWeeklyCapacity" data-channel-id="${escapeHtml(ch.id)}" data-dow="${escapeHtml(String(dow))}" data-delta="1">+</button>
            </div>
          </td>
          <td>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button class="btn" data-action="adjustWeeklyHotBoost" data-channel-id="${escapeHtml(ch.id)}" data-dow="${escapeHtml(String(dow))}" data-delta="-0.05">-</button>
              <span class="pill">Hot <strong>${escapeHtml(isHot ? "sí" : "no")}</strong></span>
              <span class="pill">Boost <strong>${escapeHtml(Number(w.hotBoost || 1).toFixed(2))}×</strong></span>
              <button class="btn" data-action="adjustWeeklyHotBoost" data-channel-id="${escapeHtml(ch.id)}" data-dow="${escapeHtml(String(dow))}" data-delta="0.05">+</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="container">
      <div class="panel pad">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="section-title" style="margin-top:0;">Calendario del canal</div>
            <div style="font-size:22px; font-weight:850; letter-spacing:-0.4px;">${escapeHtml(ch.name)}</div>
            <div class="muted">Define qué días publicas, cuántas veces por día, y dónde están los días HOT.</div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn" href="#/dashboard/creator">Volver al dashboard</a>
            <a class="btn" href="#/channel/${encodeURIComponent(ch.id)}">Ver ficha</a>
          </div>
        </div>

        <div class="divider" style="margin:14px 0;"></div>

        <div class="grid cols-2">
          <div class="card">
            <div class="section-title" style="margin-top:0;">Reglas semanales</div>
            <div class="muted">Cupo = máximo de publicaciones por día (reservas activas + confirmadas).</div>
            <div style="margin-top:12px;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Disponibilidad</th>
                    <th>Cupo</th>
                    <th>Día HOT</th>
                  </tr>
                </thead>
                <tbody>${weeklyRows}</tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="section-title" style="margin-top:0;">Bloqueos del mes</div>
            <div class="muted">Marca OFF para días que no publicas (vacaciones, eventos, etc.).</div>
            <div style="margin-top:12px;">
              ${calendar}
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
              <span class="pill">OFF seleccionados <strong>${escapeHtml(String((av.blackoutDates || []).length))}</strong></span>
              <button class="btn ghost" data-action="clearChannelBlackouts" data-channel-id="${escapeHtml(ch.id)}">Limpiar OFF</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAuth(state) {
  const user = getSessionUser(state);
  if (user) {
    return `
      <div class="container">
        <div class="panel pad">
          <div class="section-title" style="margin-top:0;">Sesión activa</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <span class="pill">Usuario <strong>${escapeHtml(user.name)}</strong></span>
            <span class="pill">Rol <strong>${escapeHtml(user.role === "creator" ? "Admin canal" : "Anunciante")}</strong></span>
            <button class="btn" data-action="logout">Salir</button>
            <a class="btn primary" href="#/${user.role === "creator" ? "dashboard/creator" : "dashboard/advertiser"}">Ir a mi dashboard</a>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="container">
      <div class="grid cols-2">
        <div class="panel pad">
          <div class="section-title" style="margin-top:0;">Login</div>
          <div class="grid">
            <div class="field">
              <div class="label">Email</div>
              <input class="input" placeholder="tu@email.com" data-auth="loginEmail" />
            </div>
            <div class="field">
              <div class="label">Password</div>
              <input class="input" type="password" placeholder="••••••••" data-auth="loginPass" />
            </div>
            <button class="btn primary" data-action="login">Entrar</button>
            <div class="muted">Usa demo: <span style="font-family:var(--mono);">admin@demo.com / demo123</span> o <span style="font-family:var(--mono);">anunciante@demo.com / demo123</span></div>
          </div>
        </div>

        <div class="panel pad">
          <div class="section-title" style="margin-top:0;">Registro</div>
          <div class="grid">
            <div class="field">
              <div class="label">Nombre</div>
              <input class="input" placeholder="Tu nombre" data-auth="regName" />
            </div>
            <div class="grid cols-2">
              <div class="field">
                <div class="label">Email</div>
                <input class="input" placeholder="tu@email.com" data-auth="regEmail" />
              </div>
              <div class="field">
                <div class="label">Rol</div>
                <select class="select" data-auth="regRole">
                  <option value="advertiser">Anunciante</option>
                  <option value="creator">Admin de canal</option>
                </select>
              </div>
            </div>
            <div class="field">
              <div class="label">Password</div>
              <input class="input" type="password" placeholder="Mínimo 4 caracteres" data-auth="regPass" />
            </div>
            <button class="btn good" data-action="register">Crear cuenta</button>
            <div class="muted">Este registro es mock y se guarda en localStorage.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDashboardAdvertiser(state) {
  const user = getSessionUser(state);
  const viewAs = state.session.viewAs || "advertiser";
  if (!user || user.role !== "advertiser") {
    return renderRoleGate(viewAs, "advertiser");
  }

  const list = campaignsForAdvertiser(state, user.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const totalPaid = list.filter((c) => c.paymentStatus === "PAID" || c.paymentStatus === "RELEASED").length;
  const totalPublished = list.filter((c) => c.status === "PUBLICADA" || c.status === "COMPLETADA").length;
  const totalClicks = list.reduce((acc, c) => acc + Number(c.tracking?.clicks || 0), 0);

  const rows = list
    .map((c) => {
      const ch = channelById(state, c.channelId);
      return `
        <tr>
          <td>
            <div style="display:grid; gap:6px;">
              <div style="font-weight:750;">${escapeHtml(ch ? ch.name : "Canal")}</div>
              <div class="muted" style="font-size:12px;">${escapeHtml(c.creativeText).slice(0, 90)}${c.creativeText.length > 90 ? "…" : ""}</div>
            </div>
          </td>
          <td><span class="status ${statusClass(c.status)}"><span class="dot"></span>${escapeHtml(statusLabel(c.status))}</span></td>
          <td class="muted">${escapeHtml(fmtDateTime(c.updatedAt))}</td>
          <td class="muted">${escapeHtml(String(c.tracking?.clicks || 0))}</td>
          <td style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn" href="#/campaign/${encodeURIComponent(c.id)}">Ver</a>
            ${c.status === "BORRADOR" ? `<button class="btn primary" data-action="payCampaign" data-id="${escapeHtml(c.id)}">Simular pago</button>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="container">
      <div class="panel pad">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="section-title" style="margin-top:0;">Dashboard anunciante</div>
            <div class="muted">Crea campañas, simula pago en escrow y mira estados y tracking.</div>
          </div>
          <a class="btn primary" href="#/marketplace">Explorar canales</a>
        </div>
        <div style="margin-top:14px;" class="kpis">
          <div class="kpi"><div class="k">Campañas</div><div class="v">${escapeHtml(String(list.length))}</div></div>
          <div class="kpi"><div class="k">Pagadas</div><div class="v">${escapeHtml(String(totalPaid))}</div></div>
          <div class="kpi"><div class="k">Publicadas</div><div class="v">${escapeHtml(String(totalPublished))}</div></div>
          <div class="kpi"><div class="k">Clicks (fake)</div><div class="v">${escapeHtml(String(totalClicks))}</div></div>
        </div>
      </div>

      <div class="section-title">Mis campañas</div>
      <table class="table">
        <thead>
          <tr>
            <th>Canal / Creativo</th>
            <th>Estado</th>
            <th>Actualizado</th>
            <th>Clicks</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" class="muted">Aún no tienes campañas. Ve al marketplace y crea una.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderDashboardCreator(state) {
  const user = getSessionUser(state);
  const viewAs = state.session.viewAs || "creator";
  if (!user || user.role !== "creator") {
    return renderRoleGate(viewAs, "creator");
  }

  const myChannels = (state.channels || []).filter((c) => c.ownerId === user.id);
  const requests = campaignsForCreator(state, user.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const pending = requests.filter((c) => c.status === "PAGADA").length;
  const published = requests.filter((c) => c.status === "PUBLICADA" || c.status === "COMPLETADA").length;
  const earnings = requests.filter((c) => c.status === "COMPLETADA").reduce((acc, c) => acc + Number(channelById(state, c.channelId)?.price || 0), 0);

  const channelCards = myChannels
    .map(
      (c) => `
      <div class="card">
        <div class="card-title">
          <h3>${escapeHtml(c.name)}</h3>
          <span class="price">${fmtMoney(c.price)}</span>
        </div>
        <div class="meta">
          <span class="status s-publicada"><span class="dot"></span>${escapeHtml(c.platform)}</span>
          <span class="status s-aceptada"><span class="dot"></span>${escapeHtml(c.category)}</span>
        </div>
        <div class="muted">${escapeHtml(c.description)}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn" href="#/channel/${encodeURIComponent(c.id)}">Ver ficha</a>
          <a class="btn" href="#/channel/${encodeURIComponent(c.id)}/schedule">Calendario</a>
        </div>
      </div>
    `
    )
    .join("");

  const reqRows = requests
    .map((c) => {
      const ch = channelById(state, c.channelId);
      const adv = getUser(state, c.advertiserId);
      const canAccept = c.status === "PAGADA";
      const sch = c.schedule || { count: 1, requestedDates: [], confirmedDates: [], publishedDates: [] };
      const confirmed = (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [];
      const published = Array.isArray(sch.publishedDates) ? sch.publishedDates : [];
      const pending = confirmed.filter((d) => !published.includes(d));
      const canPublish = (c.status === "ACEPTADA" || c.status === "PUBLICADA") && pending.length > 0;
      const canComplete = c.status === "PUBLICADA" && pending.length === 0;
      return `
        <tr>
          <td>
            <div style="display:grid; gap:6px;">
              <div style="font-weight:750;">${escapeHtml(ch ? ch.name : "Canal")}</div>
              <div class="muted" style="font-size:12px;">De <span style="font-family:var(--mono);">${escapeHtml(adv?.email || "—")}</span></div>
            </div>
          </td>
          <td><span class="status ${statusClass(c.status)}"><span class="dot"></span>${escapeHtml(statusLabel(c.status))}</span></td>
          <td class="muted">${escapeHtml(fmtDateTime(c.updatedAt))}</td>
          <td style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn" href="#/campaign/${encodeURIComponent(c.id)}">Ver</a>
            ${canAccept ? `<button class="btn good" data-action="acceptCampaign" data-id="${escapeHtml(c.id)}">Aceptar</button>` : ""}
            ${canPublish ? `<button class="btn primary" data-action="publishCampaign" data-id="${escapeHtml(c.id)}">Publicar siguiente</button>` : ""}
            ${canComplete ? `<button class="btn warn" data-action="completeCampaign" data-id="${escapeHtml(c.id)}">Completar</button>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="container">
      <div class="panel pad">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="section-title" style="margin-top:0;">Dashboard admin de canal</div>
            <div class="muted">Gestiona tu oferta, acepta campañas y confirma publicación para liberar el pago.</div>
          </div>
          <button class="btn primary" data-action="openCreateChannel">Crear canal</button>
        </div>
        <div style="margin-top:14px;" class="kpis">
          <div class="kpi"><div class="k">Mis canales</div><div class="v">${escapeHtml(String(myChannels.length))}</div></div>
          <div class="kpi"><div class="k">Pendientes</div><div class="v">${escapeHtml(String(pending))}</div></div>
          <div class="kpi"><div class="k">Publicadas</div><div class="v">${escapeHtml(String(published))}</div></div>
          <div class="kpi"><div class="k">Ingresos (fake)</div><div class="v">${escapeHtml(fmtMoney(earnings))}</div></div>
        </div>
      </div>

      <div class="section-title">Mis canales</div>
      <div class="grid cols-3">
        ${channelCards || `<div class="muted">Aún no creaste canales. Crea uno para recibir campañas.</div>`}
      </div>

      <div class="section-title">Campañas recibidas</div>
      <table class="table">
        <thead>
          <tr>
            <th>Canal / Anunciante</th>
            <th>Estado</th>
            <th>Actualizado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${reqRows || `<tr><td colspan="4" class="muted">Aún no recibiste campañas. Pídele al anunciante demo que cree una.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderRoleGate(viewAs, requiredRole) {
  const label = requiredRole === "creator" ? "Admin de canal" : "Anunciante";
  const demoEmail = requiredRole === "creator" ? "admin@demo.com" : "anunciante@demo.com";
  return `
    <div class="container">
      <div class="panel pad">
        <div class="section-title" style="margin-top:0;">Necesitas sesión</div>
        <div style="display:grid; gap:12px;">
          <div>Para ver este dashboard, inicia sesión como <strong>${escapeHtml(label)}</strong>.</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn primary" href="#/auth">Ir a login</a>
            <button class="btn" data-action="quickLogin" data-email="${escapeHtml(demoEmail)}" data-pass="demo123">Entrar con cuenta demo</button>
            <button class="btn ghost" data-action="setViewAs" data-role="${escapeHtml(requiredRole)}">Ver como ${escapeHtml(label)}</button>
          </div>
          <div class="muted">Tu modo actual: <span style="font-family:var(--mono);">${escapeHtml(viewAs)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function renderNotFound(title) {
  return `
    <div class="container">
      <div class="panel pad">
        <div class="section-title" style="margin-top:0;">${escapeHtml(title || "No encontrado")}</div>
        <a class="btn primary" href="#/">Volver al home</a>
      </div>
    </div>
  `;
}

function renderCampaignDetail(state, campaignId) {
  const c = (state.campaigns || []).find((x) => x.id === campaignId) || null;
  if (!c) return renderNotFound("Campaña no encontrada");

  const ch = channelById(state, c.channelId);
  const adv = getUser(state, c.advertiserId);
  const owner = ch ? getUser(state, ch.ownerId) : null;
  const steps = campaignTimelineSteps(c);
  const actions = [];
  const sch = c.schedule || { count: 1, requestedDates: [], confirmedDates: [], publishedDates: [] };
  const totalPublis = Math.max(1, Math.min(5, Number(sch.count || 1)));
  const confirmed = (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [];
  const publishedDates = Array.isArray(sch.publishedDates) ? sch.publishedDates : [];
  const pendingDates = confirmed.filter((d) => !publishedDates.includes(d)).sort();
  const progressLabel = `${Math.min(publishedDates.length, totalPublis)}/${totalPublis}`;
  const confirmCalId = `cmpConfirm_${c.id}`;

  const user = getSessionUser(state);
  if (user && user.role === "advertiser" && user.id === c.advertiserId && c.status === "BORRADOR") {
    actions.push(`<button class="btn primary" data-action="payCampaign" data-id="${escapeHtml(c.id)}">Simular pago (escrow)</button>`);
  }
  if (user && user.role === "creator" && ch && ch.ownerId === user.id && c.status === "PAGADA") {
    actions.push(`<button class="btn good" data-action="acceptCampaign" data-id="${escapeHtml(c.id)}" data-cal-id="${escapeHtml(confirmCalId)}">Aceptar con fechas</button>`);
  }
  if (user && user.role === "creator" && ch && ch.ownerId === user.id && (c.status === "ACEPTADA" || c.status === "PUBLICADA") && pendingDates.length) {
    actions.push(`<button class="btn primary" data-action="publishCampaign" data-id="${escapeHtml(c.id)}">Publicar siguiente (${escapeHtml(progressLabel)})</button>`);
  }
  if (user && user.role === "creator" && ch && ch.ownerId === user.id && c.status === "PUBLICADA" && pendingDates.length === 0) {
    actions.push(`<button class="btn warn" data-action="completeCampaign" data-id="${escapeHtml(c.id)}">Completar (liberar pago)</button>`);
  }

  const confirmSection = (() => {
    if (!(user && user.role === "creator" && ch && ch.ownerId === user.id && c.status === "PAGADA")) return "";
    const cal = ensureCalendar(state, confirmCalId, {
      monthKey: monthKeyFromDate(new Date()),
      selected: (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [],
      count: totalPublis,
    });
    cal.monthKey = String(cal.monthKey || monthKeyFromDate(new Date()));
    cal.count = totalPublis;
    cal.selected = Array.isArray(cal.selected) ? cal.selected : [];
    if (cal.selected.length === 0 && sch.requestedDates && sch.requestedDates.length) cal.selected = [...sch.requestedDates];
    const calendar = renderMonthlyCalendar(state, {
      calId: confirmCalId,
      monthKey: cal.monthKey,
      selected: cal.selected,
      isDisabled: (day) => {
        if (!day.inMonth) return false;
        const today = todayKey(new Date());
        if (day.dateKey < today) return true;
        return !isChannelDateAvailableExcluding(state, ch, day.dateKey, c.id).ok;
      },
      heat: (day) => (day.inMonth ? channelHotScoreForDate(ch, day.dateKey) : 0),
      badge: (day) => {
        if (!day.inMonth) return "";
        const heat = channelHotScoreForDate(ch, day.dateKey);
        return heat >= 0.78 ? "HOT" : "";
      },
    });
    const left = Math.max(0, totalPublis - cal.selected.length);
    return `
      <div class="divider" style="margin:14px 0;"></div>
      <div class="muted">Como admin, puedes ajustar y confirmar fechas antes de aceptar.</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; align-items:center;">
        <span class="pill">Requiere <strong>${escapeHtml(String(totalPublis))}</strong></span>
        <span class="pill">Seleccionadas <strong>${escapeHtml(String(cal.selected.length))}</strong></span>
        ${left === 0 ? `<span class="pill">OK <strong>listo</strong></span>` : `<span class="pill">Faltan <strong>${escapeHtml(String(left))}</strong></span>`}
        <button class="btn primary" data-action="calAutoPickBest" data-cal-id="${escapeHtml(confirmCalId)}" data-channel-id="${escapeHtml(ch.id)}">Auto (días HOT)</button>
        <button class="btn ghost" data-action="calClear" data-cal-id="${escapeHtml(confirmCalId)}">Limpiar</button>
      </div>
      <div style="margin-top:12px;">${calendar}</div>
    `;
  })();

  const scheduleCard = `
    <div class="card">
      <div class="section-title" style="margin-top:0;">Programación</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <span class="pill">Publicaciones <strong>${escapeHtml(String(totalPublis))}</strong></span>
        <span class="pill">Progreso <strong>${escapeHtml(progressLabel)}</strong></span>
      </div>
      <div class="divider" style="margin:14px 0;"></div>
      <div class="muted">Fechas confirmadas por el canal (o solicitadas si aún no acepta):</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        ${(confirmed.length ? confirmed : ["—"]).map((d) => `<span class="pill"><strong>${escapeHtml(d)}</strong></span>`).join("")}
      </div>
      <div style="margin-top:12px;" class="muted">Pendientes de publicar:</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
        ${(pendingDates.length ? pendingDates : ["—"]).map((d) => `<span class="pill"><strong>${escapeHtml(d)}</strong></span>`).join("")}
      </div>
      ${confirmSection}
    </div>
  `;

  const tracking = renderTrackingPanel(c);

  return `
    <div class="container">
      <div class="panel pad">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start;">
          <div style="display:grid; gap:10px;">
            <div class="meta">
              <span class="status ${statusClass(c.status)}"><span class="dot"></span>${escapeHtml(statusLabel(c.status))}</span>
              ${ch ? `<span class="status s-publicada"><span class="dot"></span>${escapeHtml(ch.platform)}</span>` : ""}
              ${ch ? `<span class="status s-aceptada"><span class="dot"></span>${escapeHtml(ch.category)}</span>` : ""}
            </div>
            <div style="font-size:22px; font-weight:850; letter-spacing:-0.4px;">${escapeHtml(ch ? ch.name : "Campaña")}</div>
            <div class="muted">Anunciante: <span style="font-family:var(--mono);">${escapeHtml(adv?.email || "—")}</span> · Admin canal: <span style="font-family:var(--mono);">${escapeHtml(owner?.email || "—")}</span></div>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a class="btn" href="#/${state.session.viewAs === "creator" ? "dashboard/creator" : "dashboard/advertiser"}">Volver al dashboard</a>
            ${actions.join("")}
          </div>
        </div>

        <div class="divider" style="margin:14px 0;"></div>

        <div class="grid cols-2">
          <div class="card">
            <div class="section-title" style="margin-top:0;">Creativo</div>
            <div style="display:grid; gap:10px;">
              <div style="white-space:pre-wrap;">${escapeHtml(c.creativeText)}</div>
              <div class="muted">Link: <span style="font-family:var(--mono);">${escapeHtml(c.link)}</span></div>
              <div class="muted">Creada: ${escapeHtml(fmtDateTime(c.createdAt))}</div>
              <div class="muted">Actualizada: ${escapeHtml(fmtDateTime(c.updatedAt))}</div>
              <div class="muted">Pago: <span class="status s-pagada"><span class="dot"></span>${escapeHtml(c.paymentStatus || "—")}</span></div>
            </div>
          </div>

          ${scheduleCard}
        </div>

        <div class="divider" style="margin:14px 0;"></div>

        <div class="card">
          <div class="section-title" style="margin-top:0;">Estado end-to-end</div>
          <div class="timeline">
            ${steps
              .map(
                (s) => `
              <div class="step ${s.done ? "done" : ""}">
                <span class="b"></span>
                <div style="display:flex; justify-content:space-between; gap:12px; width:100%;">
                  <div>${escapeHtml(s.label)}</div>
                  <div class="muted">${escapeHtml(fmtDateTime(s.at))}</div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>

      ${tracking}
    </div>
  `;
}

function last7DaysKeys() {
  const out = [];
  const base = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

function renderTrackingPanel(c) {
  const isTrackable = c.status === "PUBLICADA" || c.status === "COMPLETADA";
  const keys = last7DaysKeys();
  const daily = (c.tracking && c.tracking.daily) || {};
  const values = keys.map((k) => Number(daily[k] || 0));
  const max = Math.max(1, ...values);
  const bars = values.map((v) => `<div class="bar" style="height:${Math.round((v / max) * 100)}%;"></div>`).join("");
  const labels = keys
    .map((k) => {
      const parts = k.split("-");
      return `<div style="text-align:center;">${escapeHtml(parts[2])}</div>`;
    })
    .join("");

  const sampleTs = (c.tracking?.clickTimestamps || []).slice(-5).reverse();

  return `
    <div style="margin-top:16px;" class="panel pad">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
        <div>
          <div class="section-title" style="margin-top:0;">Tracking (simulado)</div>
          <div class="muted">${isTrackable ? "Clicks fake + gráfico 7 días + timestamps." : "El tracking se activa cuando la campaña está PUBLICADA."}</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${isTrackable ? `<button class="btn primary" data-action="simulateClicks" data-id="${escapeHtml(c.id)}" data-amount="5">Simular 5 clicks</button>` : ""}
          ${isTrackable ? `<button class="btn" data-action="simulateClicks" data-id="${escapeHtml(c.id)}" data-amount="20">Simular 20 clicks</button>` : ""}
        </div>
      </div>

      <div style="margin-top:14px;" class="grid cols-2">
        <div class="chart">
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <span class="pill">Clicks total <strong>${escapeHtml(String(c.tracking?.clicks || 0))}</strong></span>
            <span class="pill">Última actualización <strong>${escapeHtml(fmtDateTime(c.updatedAt))}</strong></span>
          </div>
          <div class="bars">${bars}</div>
          <div class="bar-labels">${labels}</div>
        </div>
        <div class="card">
          <div class="section-title" style="margin-top:0;">Últimos timestamps</div>
          <div class="muted">Se guardan como lista en localStorage para simular tracking real.</div>
          <div class="divider"></div>
          <div style="display:grid; gap:8px;">
            ${sampleTs.length ? sampleTs.map((t) => `<div class="pill"><strong>${escapeHtml(fmtDateTime(t))}</strong></div>`).join("") : `<div class="muted">Aún no hay clicks.</div>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCampaignCreate(state, q) {
  const channelId = q.get("channelId");
  const ch = channelId ? channelById(state, channelId) : null;
  const user = getSessionUser(state);
  if (!user || user.role !== "advertiser") return renderRoleGate(state.session.viewAs, "advertiser");

  const calId = `cmpNew_${channelId || "none"}`;
  const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 });
  cal.monthKey = String(cal.monthKey || monthKeyFromDate(new Date()));
  cal.selected = Array.isArray(cal.selected) ? cal.selected : [];
  cal.count = Math.max(1, Math.min(5, Number(cal.count || 1)));

  const canPick = !!ch;
  const selected = cal.selected;
  const scheduleCalendar = renderMonthlyCalendar(state, {
    calId,
    monthKey: cal.monthKey,
    selected,
    isDisabled: (day) => {
      if (!canPick) return true;
      if (!day.inMonth) return false;
      const today = todayKey(new Date());
      if (day.dateKey < today) return true;
      return !isChannelDateAvailable(state, ch, day.dateKey).ok;
    },
    heat: (day) => {
      if (!canPick || !day.inMonth) return 0;
      return channelHotScoreForDate(ch, day.dateKey);
    },
    badge: (day) => {
      if (!canPick || !day.inMonth) return "";
      const heat = channelHotScoreForDate(ch, day.dateKey);
      return heat >= 0.78 ? "HOT" : "";
    },
  });

  return `
    <div class="container">
      <div class="panel pad">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="section-title" style="margin-top:0;">Crear campaña</div>
            <div class="muted">Una campaña en esta demo es un anuncio con estados: BORRADOR → PAGADA → ACEPTADA → PUBLICADA → COMPLETADA.</div>
          </div>
          <a class="btn" href="#/marketplace">Volver</a>
        </div>

        <div class="divider" style="margin:14px 0;"></div>

        <div class="grid cols-2">
          <div class="card">
            <div class="section-title" style="margin-top:0;">Canal seleccionado</div>
            ${ch ? renderChannelMini(state, ch) : `<div class="muted">Selecciona un canal desde el marketplace.</div>`}
          </div>

          <div class="card">
            <div class="section-title" style="margin-top:0;">Programación</div>
            <div class="muted">Elige en calendario cuándo publicar. Los días HOT tienen más retención (simulada) y se recomiendan.</div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; align-items:center;">
              <span class="pill">Publicaciones <strong>${escapeHtml(String(cal.count))}</strong></span>
              <button class="btn" data-action="calAdjustCount" data-cal-id="${escapeHtml(calId)}" data-delta="-1">-</button>
              <button class="btn" data-action="calAdjustCount" data-cal-id="${escapeHtml(calId)}" data-delta="1">+</button>
              <button class="btn primary" data-action="calAutoPickBest" data-cal-id="${escapeHtml(calId)}" data-channel-id="${escapeHtml(channelId || "")}">Auto (días HOT)</button>
              <button class="btn ghost" data-action="calClear" data-cal-id="${escapeHtml(calId)}">Limpiar</button>
            </div>
            <div style="margin-top:12px;">
              ${scheduleCalendar}
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
              <span class="pill">Seleccionadas <strong>${escapeHtml(String(selected.length))}</strong></span>
              ${selected.length === cal.count ? `<span class="pill">OK <strong>listo</strong></span>` : `<span class="pill">Faltan <strong>${escapeHtml(String(Math.max(0, cal.count - selected.length)))}</strong></span>`}
            </div>
            <div class="divider" style="margin:14px 0;"></div>
            <div class="section-title" style="margin-top:0;">Creativo</div>
            <div class="grid">
              <div class="field">
                <div class="label">Texto del anuncio</div>
                <textarea class="textarea" data-cmp="text" placeholder="Escribe el copy del anuncio..."></textarea>
              </div>
              <div class="field">
                <div class="label">Link</div>
                <input class="input" data-cmp="link" placeholder="https://tumarca.com/oferta" />
              </div>
              <button class="btn primary" data-action="createCampaign" data-channel-id="${escapeHtml(channelId || "")}" data-cal-id="${escapeHtml(calId)}">Guardar como BORRADOR</button>
              <div class="muted">El pago (escrow) solo se habilita si la programación está completa y hay cupo.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderChannelMini(state, ch) {
  const owner = getUser(state, ch.ownerId);
  return `
    <div style="display:grid; gap:10px;">
      <div style="display:flex; justify-content:space-between; gap:12px;">
        <div style="font-weight:800;">${escapeHtml(ch.name)}</div>
        <div class="price">${fmtMoney(ch.price)}</div>
      </div>
      <div class="meta">
        <span class="status s-publicada"><span class="dot"></span>${escapeHtml(ch.platform)}</span>
        <span class="status s-aceptada"><span class="dot"></span>${escapeHtml(ch.category)}</span>
      </div>
      <div class="muted">${escapeHtml(ch.description)}</div>
      ${owner ? `<div class="pill">Admin <strong>${escapeHtml(owner.name)}</strong></div>` : ""}
    </div>
  `;
}

function openCreateChannelDialog(state) {
  const user = getSessionUser(state);
  if (!user || user.role !== "creator") {
    toast("Necesitas entrar como admin de canal", "Usa admin@demo.com / demo123");
    setHashPath("/auth");
    return;
  }

  const html = `
    <div class="container">
      <div class="panel pad">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
          <div>
            <div class="section-title" style="margin-top:0;">Crear canal</div>
            <div class="muted">Define tu oferta (plataforma, temática y precio). Se mostrará en el marketplace.</div>
          </div>
          <a class="btn" href="#/dashboard/creator">Cerrar</a>
        </div>
        <div class="divider" style="margin:14px 0;"></div>
        <div class="grid cols-2">
          <div class="grid">
            <div class="field">
              <div class="label">Nombre del canal</div>
              <input class="input" data-ch="name" placeholder="Ej: Product Builders VIP" />
            </div>
            <div class="grid cols-2">
              <div class="field">
                <div class="label">Plataforma</div>
                <select class="select" data-ch="platform">
                  <option>Telegram</option>
                  <option>Discord</option>
                  <option>WhatsApp</option>
                  <option>Instagram</option>
                </select>
              </div>
              <div class="field">
                <div class="label">Temática</div>
                <input class="input" data-ch="category" placeholder="Ej: SaaS, Finanzas..." />
              </div>
            </div>
            <div class="field">
              <div class="label">Precio por publicación</div>
              <input class="input" data-ch="price" type="number" min="10" step="5" placeholder="Ej: 80" />
            </div>
            <div class="field">
              <div class="label">Descripción</div>
              <textarea class="textarea" data-ch="description" placeholder="Describe audiencia, tono, frecuencia..."></textarea>
            </div>
            <button class="btn primary" data-action="createChannel">Publicar canal</button>
          </div>
          <div class="card">
            <div class="section-title" style="margin-top:0;">Preview (mock)</div>
            <div class="muted">Tu canal aparecerá como una card estilo marketplace.</div>
            <div class="divider"></div>
            <div class="muted">Tip: luego pide al anunciante demo que cree una campaña y verifica el flujo completo.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderApp(state, "/dashboard/creator/create-channel", html);
}

function applyMarketplaceFiltersFromUI() {
  const q = document.querySelector('[data-bind="q"]')?.value || "";
  const platform = document.querySelector('[data-bind="platform"]')?.value || "all";
  const category = document.querySelector('[data-bind="category"]')?.value || "all";
  const qs = new URLSearchParams();
  if (q.trim()) qs.set("q", q.trim());
  if (platform && platform !== "all") qs.set("platform", platform);
  if (category && category !== "all") qs.set("category", category);
  setHashPath(`/marketplace${qs.toString() ? `?${qs.toString()}` : ""}`);
}

function renderRoute(state) {
  const path = getHashPath();
  const { seg, q } = parseRoute(path);

  if (seg.length === 0) return { path: "/", body: renderHome(state) };
  if (seg[0] === "auth") return { path: "/auth", body: renderAuth(state) };
  if (seg[0] === "marketplace") return { path: "/marketplace", body: renderMarketplace(state, q) };
  if (seg[0] === "channel" && seg[1] && seg[2] === "schedule") return { path: `/channel/${seg[1]}/schedule`, body: renderChannelSchedule(state, seg[1]) };
  if (seg[0] === "channel" && seg[1]) return { path: `/channel/${seg[1]}`, body: renderChannelDetail(state, seg[1]) };
  if (seg[0] === "campaign" && seg[1] === "new") return { path: "/campaign/new", body: renderCampaignCreate(state, q) };
  if (seg[0] === "campaign" && seg[1]) return { path: `/campaign/${seg[1]}`, body: renderCampaignDetail(state, seg[1]) };
  if (seg[0] === "dashboard" && seg[1] === "advertiser") return { path: "/dashboard/advertiser", body: renderDashboardAdvertiser(state) };
  if (seg[0] === "dashboard" && seg[1] === "creator") return { path: "/dashboard/creator", body: renderDashboardCreator(state) };

  return { path: "/404", body: renderNotFound("Ruta no encontrada") };
}

function renderApp(state, pathOverride, bodyOverride) {
  const { path, body } = bodyOverride ? { path: pathOverride || getHashPath(), body: bodyOverride } : renderRoute(state);
  const root = document.getElementById("app");
  root.innerHTML = `${renderTopbar(state, normalizePath(path))}${body}`;
}

function normalizePath(p) {
  const x = p.split("?")[0] || "/";
  if (!x.startsWith("/")) return `/${x}`;
  return x;
}

function findByEmail(state, email) {
  const e = String(email || "").trim().toLowerCase();
  return (state.users || []).find((u) => String(u.email || "").toLowerCase() === e) || null;
}

function login(state, email, pass) {
  const u = findByEmail(state, email);
  if (!u || u.password !== pass) return { ok: false, error: "Credenciales inválidas" };
  state.session.userId = u.id;
  state.session.viewAs = u.role;
  return { ok: true, user: u };
}

function logout(state) {
  state.session.userId = null;
}

function register(state, payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const name = String(payload.name || "").trim();
  const role = payload.role === "creator" ? "creator" : "advertiser";
  const pass = String(payload.password || "");
  if (!email || !email.includes("@")) return { ok: false, error: "Email inválido" };
  if (!name) return { ok: false, error: "Nombre requerido" };
  if (pass.length < 4) return { ok: false, error: "Password muy corta" };
  if (findByEmail(state, email)) return { ok: false, error: "Ese email ya existe" };
  const u = { id: uid("usr"), role, name, email, password: pass, createdAt: nowIso() };
  state.users.push(u);
  state.session.userId = u.id;
  state.session.viewAs = u.role;
  return { ok: true, user: u };
}

function createChannel(state, input) {
  const user = getSessionUser(state);
  if (!user || user.role !== "creator") return { ok: false, error: "Requiere rol admin" };

  const name = String(input.name || "").trim();
  const platform = String(input.platform || "").trim() || "Telegram";
  const category = String(input.category || "").trim() || "General";
  const price = Number(input.price || 0);
  const description = String(input.description || "").trim();

  if (!name) return { ok: false, error: "Nombre requerido" };
  if (!description) return { ok: false, error: "Descripción requerida" };
  if (!(price > 0)) return { ok: false, error: "Precio inválido" };

  const ch = {
    id: uid("chn"),
    ownerId: user.id,
    name,
    platform,
    category,
    price,
    rating: 4.7,
    tags: Array.from(new Set([category.toLowerCase().slice(0, 16), platform.toLowerCase()].filter(Boolean))),
    description,
    createdAt: nowIso(),
    availability: makeDefaultAvailability({ platform }),
  };

  state.channels.unshift(ch);
  state.notifications.unshift({ id: uid("ntf"), at: nowIso(), type: "channel_created", message: `Canal creado: ${name}` });
  return { ok: true, channel: ch };
}

function createCampaign(state, input) {
  const user = getSessionUser(state);
  if (!user || user.role !== "advertiser") return { ok: false, error: "Requiere rol anunciante" };

  const channelId = String(input.channelId || "");
  const ch = channelById(state, channelId);
  if (!ch) return { ok: false, error: "Canal inválido" };

  const text = String(input.text || "").trim();
  const link = String(input.link || "").trim();
  if (text.length < 10) return { ok: false, error: "Texto muy corto" };
  if (!link || !link.startsWith("http")) return { ok: false, error: "Link inválido" };

  const count = Math.max(1, Math.min(5, Number(input.count || 1)));
  const dates = Array.isArray(input.requestedDates) ? input.requestedDates.map((x) => String(x)) : [];
  const uniq = Array.from(new Set(dates)).sort();
  if (uniq.length !== count) return { ok: false, error: `Selecciona ${count} fecha(s) en el calendario` };
  const today = todayKey(new Date());
  for (const dk of uniq) {
    if (dk < today) return { ok: false, error: "No puedes programar en el pasado" };
    const ok = isChannelDateAvailable(state, ch, dk);
    if (!ok.ok) return { ok: false, error: `Fecha ${dk}: ${ok.reason}` };
  }

  const at = nowIso();
  const cmp = {
    id: uid("cmp"),
    advertiserId: user.id,
    channelId,
    creativeText: text,
    link,
    status: "BORRADOR",
    paymentStatus: "UNPAID",
    publicationStatus: "DRAFT",
    createdAt: at,
    updatedAt: at,
    timeline: { borradorAt: at, pagadaAt: null, aceptadaAt: null, publicadaAt: null, completadaAt: null },
    schedule: { count, requestedDates: uniq, confirmedDates: [], publishedDates: [] },
    tracking: { clicks: 0, clickTimestamps: [], daily: {} },
  };

  state.campaigns.unshift(cmp);
  state.notifications.unshift({ id: uid("ntf"), at: nowIso(), type: "campaign_created", message: `Campaña en borrador para ${ch.name}` });
  return { ok: true, campaign: cmp };
}

function payCampaign(state, campaignId) {
  const c = (state.campaigns || []).find((x) => x.id === campaignId) || null;
  if (!c) return { ok: false, error: "Campaña no existe" };

  const user = getSessionUser(state);
  if (!user || user.role !== "advertiser" || user.id !== c.advertiserId) return { ok: false, error: "No autorizado" };
  if (c.status !== "BORRADOR") return { ok: false, error: "Solo se paga desde BORRADOR" };

  const ch = channelById(state, c.channelId);
  if (!ch) return { ok: false, error: "Canal inválido" };
  const sch = c.schedule || {};
  const count = Math.max(1, Math.min(5, Number(sch.count || 1)));
  const dates = Array.isArray(sch.requestedDates) ? Array.from(new Set(sch.requestedDates.map((x) => String(x)))).sort() : [];
  if (dates.length !== count) return { ok: false, error: `Selecciona ${count} fecha(s) antes de pagar` };
  const today = todayKey(new Date());
  for (const dk of dates) {
    if (dk < today) return { ok: false, error: "No puedes pagar una campaña programada en el pasado" };
    const ok = isChannelDateAvailable(state, ch, dk);
    if (!ok.ok) return { ok: false, error: `Fecha ${dk}: ${ok.reason}` };
  }

  const at = nowIso();
  c.status = "PAGADA";
  c.paymentStatus = "PAID";
  c.publicationStatus = "PENDING";
  c.updatedAt = at;
  c.timeline = c.timeline || {};
  c.timeline.pagadaAt = at;
  state.notifications.unshift({ id: uid("ntf"), at: nowIso(), type: "paid", message: `Pago en escrow simulado. Fechas reservadas: ${dates.join(", ")}` });
  return { ok: true };
}

function acceptCampaign(state, campaignId, confirmedDatesOverride) {
  const c = (state.campaigns || []).find((x) => x.id === campaignId) || null;
  if (!c) return { ok: false, error: "Campaña no existe" };
  if (c.status !== "PAGADA") return { ok: false, error: "Solo se acepta si está PAGADA" };

  const ch = channelById(state, c.channelId);
  const user = getSessionUser(state);
  if (!ch || !user || user.role !== "creator" || user.id !== ch.ownerId) return { ok: false, error: "No autorizado" };

  const sch = c.schedule || { count: 1, requestedDates: [], confirmedDates: [], publishedDates: [] };
  const count = Math.max(1, Math.min(5, Number(sch.count || 1)));
  const proposed = Array.isArray(confirmedDatesOverride) ? confirmedDatesOverride : sch.requestedDates;
  const dates = Array.from(new Set((proposed || []).map((x) => String(x)))).sort();
  if (dates.length !== count) return { ok: false, error: `Confirma ${count} fecha(s) para aceptar` };
  const today = todayKey(new Date());
  for (const dk of dates) {
    if (dk < today) return { ok: false, error: "No puedes aceptar fechas en el pasado" };
    const ok = isChannelDateAvailableExcluding(state, ch, dk, c.id);
    if (!ok.ok) return { ok: false, error: `Fecha ${dk}: ${ok.reason}` };
  }

  const at = nowIso();
  c.status = "ACEPTADA";
  c.updatedAt = at;
  c.timeline = c.timeline || {};
  c.timeline.aceptadaAt = at;
  c.schedule = sch;
  c.schedule.confirmedDates = dates;
  state.notifications.unshift({ id: uid("ntf"), at: nowIso(), type: "accepted", message: `Campaña aceptada. Fechas confirmadas: ${dates.join(", ")}` });
  return { ok: true };
}

function publishCampaign(state, campaignId) {
  const c = (state.campaigns || []).find((x) => x.id === campaignId) || null;
  if (!c) return { ok: false, error: "Campaña no existe" };
  if (!(c.status === "ACEPTADA" || c.status === "PUBLICADA")) return { ok: false, error: "Solo se publica si está ACEPTADA o PUBLICADA" };

  const ch = channelById(state, c.channelId);
  const user = getSessionUser(state);
  if (!ch || !user || user.role !== "creator" || user.id !== ch.ownerId) return { ok: false, error: "No autorizado" };

  const sch = c.schedule || { count: 1, requestedDates: [], confirmedDates: [], publishedDates: [] };
  const confirmed = (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [];
  sch.publishedDates = Array.isArray(sch.publishedDates) ? sch.publishedDates : [];
  const pending = confirmed.filter((d) => !sch.publishedDates.includes(d)).sort();
  if (!pending.length) return { ok: false, error: "No hay publicaciones pendientes" };
  const publishDate = pending[0];

  const at = nowIso();
  if (c.status === "ACEPTADA") c.status = "PUBLICADA";
  c.publicationStatus = "PUBLISHED";
  c.updatedAt = at;
  c.timeline = c.timeline || {};
  if (!c.timeline.publicadaAt) c.timeline.publicadaAt = at;
  c.schedule = sch;
  sch.publishedDates.push(publishDate);
  if (!c.tracking) c.tracking = { clicks: 0, clickTimestamps: [], daily: {} };
  if (Object.keys(c.tracking.daily || {}).length === 0) {
    hydrateTracking({ campaigns: [c] });
  }
  state.notifications.unshift({ id: uid("ntf"), at: nowIso(), type: "published", message: `Publicación marcada: ${publishDate}` });
  return { ok: true };
}

function completeCampaign(state, campaignId) {
  const c = (state.campaigns || []).find((x) => x.id === campaignId) || null;
  if (!c) return { ok: false, error: "Campaña no existe" };
  if (c.status !== "PUBLICADA") return { ok: false, error: "Solo se completa si está PUBLICADA" };

  const ch = channelById(state, c.channelId);
  const user = getSessionUser(state);
  if (!ch || !user || user.role !== "creator" || user.id !== ch.ownerId) return { ok: false, error: "No autorizado" };

  const sch = c.schedule || { count: 1, requestedDates: [], confirmedDates: [], publishedDates: [] };
  const total = Math.max(1, Math.min(5, Number(sch.count || 1)));
  const confirmed = (sch.confirmedDates && sch.confirmedDates.length ? sch.confirmedDates : sch.requestedDates) || [];
  const published = Array.isArray(sch.publishedDates) ? sch.publishedDates : [];
  const remaining = confirmed.filter((d) => !published.includes(d));
  if (remaining.length) return { ok: false, error: `Aún quedan publicaciones pendientes (${published.length}/${total})` };

  const at = nowIso();
  c.status = "COMPLETADA";
  c.paymentStatus = "RELEASED";
  c.updatedAt = at;
  c.timeline = c.timeline || {};
  c.timeline.completadaAt = at;
  state.notifications.unshift({ id: uid("ntf"), at: nowIso(), type: "completed", message: `Campaña completada. Pago liberado (mock).` });
  return { ok: true };
}

function simulateClicks(state, campaignId, amount) {
  const c = (state.campaigns || []).find((x) => x.id === campaignId) || null;
  if (!c) return { ok: false, error: "Campaña no existe" };
  if (!(c.status === "PUBLICADA" || c.status === "COMPLETADA")) return { ok: false, error: "Tracking sólo en PUBLICADA/COMPLETADA" };

  const n = Math.max(1, Math.min(200, Number(amount || 1)));
  c.tracking = c.tracking || { clicks: 0, clickTimestamps: [], daily: {} };

  const now = new Date();
  const k = todayKey(now);
  addDailyClicks(c.tracking, k, n);
  c.tracking.clicks += n;
  for (let i = 0; i < n; i++) {
    const jitter = Math.round(Math.random() * 480000);
    c.tracking.clickTimestamps.push(new Date(now.getTime() - jitter).toISOString());
  }
  c.updatedAt = nowIso();
  return { ok: true };
}

function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  const state = ensureState();
  toast("Demo reseteada", "Se restauraron datos mock iniciales");
  setHashPath("/");
  return state;
}

let state = ensureState();

// Auto-login when arriving from AuthPage with ?role=advertiser or ?role=creator
(function initFromQueryParam() {
  const urlRole = new URLSearchParams(window.location.search).get("role");
  if (!urlRole) return;
  const emailMap = { advertiser: "anunciante@demo.com", creator: "admin@demo.com" };
  const email = emailMap[urlRole];
  if (!email) return;
  const res = login(state, email, "demo123");
  if (res.ok) {
    state.session.viewAs = urlRole;
    saveState(state);
    const target = urlRole === "creator" ? "#/dashboard/creator" : "#/dashboard/advertiser";
    history.replaceState(null, "", window.location.pathname + window.location.search + target);
  }
})();

function rerender() {
  saveState(state);
  renderApp(state);
}

function handleAction(action, el) {
  if (action === "setViewAs") {
    const role = el.getAttribute("data-role");
    state.session.viewAs = role === "creator" ? "creator" : "advertiser";
    rerender();
    return;
  }

  if (action === "resetDemo") {
    state = resetDemo();
    rerender();
    return;
  }

  if (action === "quickLogin") {
    const email = el.getAttribute("data-email") || "";
    const pass = el.getAttribute("data-pass") || "";
    const res = login(state, email, pass);
    if (!res.ok) toast("No se pudo entrar", res.error);
    else toast("Sesión iniciada", `${res.user.email} (${res.user.role})`);
    rerender();
    setHashPath(res.user.role === "creator" ? "/dashboard/creator" : "/dashboard/advertiser");
    return;
  }

  if (action === "login") {
    const email = document.querySelector('[data-auth="loginEmail"]')?.value || "";
    const pass = document.querySelector('[data-auth="loginPass"]')?.value || "";
    const res = login(state, email, pass);
    if (!res.ok) {
      toast("Login falló", res.error);
      return;
    }
    toast("Bienvenido/a", res.user.email);
    rerender();
    setHashPath(res.user.role === "creator" ? "/dashboard/creator" : "/dashboard/advertiser");
    return;
  }

  if (action === "register") {
    const name = document.querySelector('[data-auth="regName"]')?.value || "";
    const email = document.querySelector('[data-auth="regEmail"]')?.value || "";
    const role = document.querySelector('[data-auth="regRole"]')?.value || "advertiser";
    const password = document.querySelector('[data-auth="regPass"]')?.value || "";
    const res = register(state, { name, email, role, password });
    if (!res.ok) {
      toast("Registro falló", res.error);
      return;
    }
    toast("Cuenta creada", `${res.user.email} (${res.user.role})`);
    rerender();
    setHashPath(res.user.role === "creator" ? "/dashboard/creator" : "/dashboard/advertiser");
    return;
  }

  if (action === "logout") {
    logout(state);
    toast("Sesión cerrada");
    rerender();
    setHashPath("/");
    return;
  }

  if (action === "applyMarketplaceFilters") {
    applyMarketplaceFiltersFromUI();
    return;
  }

  if (action === "openCreateChannel") {
    openCreateChannelDialog(state);
    return;
  }

  if (action === "calPrevMonth" || action === "calNextMonth") {
    const calId = el.getAttribute("data-cal-id") || "";
    const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 });
    cal.monthKey = addMonthsToMonthKey(String(cal.monthKey || monthKeyFromDate(new Date())), action === "calPrevMonth" ? -1 : 1);
    rerender();
    return;
  }

  if (action === "calAdjustCount") {
    const calId = el.getAttribute("data-cal-id") || "";
    const delta = Number(el.getAttribute("data-delta") || 0);
    const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 });
    cal.count = Math.max(1, Math.min(5, Number(cal.count || 1) + delta));
    cal.selected = Array.isArray(cal.selected) ? cal.selected : [];
    if (cal.selected.length > cal.count) cal.selected = cal.selected.slice(0, cal.count);
    rerender();
    return;
  }

  if (action === "calClear") {
    const calId = el.getAttribute("data-cal-id") || "";
    if (calId.startsWith("chBlk_")) {
      const channelId = calId.slice("chBlk_".length);
      const ch = channelById(state, channelId);
      if (ch) {
        const av = getChannelAvailability(ch);
        av.blackoutDates = [];
        ch.availability = av;
      }
      rerender();
      return;
    }
    const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 });
    cal.selected = [];
    rerender();
    return;
  }

  if (action === "calToggleDate") {
    const calId = el.getAttribute("data-cal-id") || "";
    const dateKey = el.getAttribute("data-date") || "";
    if (!calId || !dateKey) return;

    if (calId.startsWith("chBlk_")) {
      const channelId = calId.slice("chBlk_".length);
      const ch = channelById(state, channelId);
      if (!ch) return;
      const av = getChannelAvailability(ch);
      av.blackoutDates = Array.isArray(av.blackoutDates) ? av.blackoutDates : [];
      if (av.blackoutDates.includes(dateKey)) av.blackoutDates = av.blackoutDates.filter((d) => d !== dateKey);
      else av.blackoutDates = [...av.blackoutDates, dateKey].sort();
      ch.availability = av;
      rerender();
      return;
    }

    const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 });
    cal.selected = Array.isArray(cal.selected) ? cal.selected : [];
    cal.count = Math.max(1, Math.min(5, Number(cal.count || 1)));
    if (cal.selected.includes(dateKey)) {
      cal.selected = cal.selected.filter((d) => d !== dateKey);
      rerender();
      return;
    }
    if (cal.selected.length >= cal.count) {
      toast("Límite alcanzado", `Máximo ${cal.count} fecha(s)`);
      return;
    }
    cal.selected = [...cal.selected, dateKey].sort();
    rerender();
    return;
  }

  if (action === "calAutoPickBest") {
    const calId = el.getAttribute("data-cal-id") || "";
    const channelId = el.getAttribute("data-channel-id") || "";
    const ch = channelId ? channelById(state, channelId) : null;
    if (!calId || !ch) {
      toast("Selecciona un canal", "No se pudo aplicar auto-selección");
      return;
    }
    const cal = ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 });
    cal.monthKey = String(cal.monthKey || monthKeyFromDate(new Date()));
    cal.count = Math.max(1, Math.min(5, Number(cal.count || 1)));
    const today = todayKey(new Date());
    const excludeCampaignId = calId.startsWith("cmpConfirm_") ? calId.slice("cmpConfirm_".length) : null;
    const days = buildMonthGrid(cal.monthKey).filter((d) => d.inMonth);
    const candidates = [];
    for (const d of days) {
      if (d.dateKey < today) continue;
      const ok = excludeCampaignId ? isChannelDateAvailableExcluding(state, ch, d.dateKey, excludeCampaignId) : isChannelDateAvailable(state, ch, d.dateKey);
      if (!ok.ok) continue;
      const score = channelHotScoreForDate(ch, d.dateKey);
      candidates.push({ dateKey: d.dateKey, score });
    }
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.dateKey).localeCompare(String(b.dateKey));
    });
    cal.selected = candidates.slice(0, cal.count).map((x) => x.dateKey).sort();
    rerender();
    return;
  }

  if (action === "toggleWeeklyDay") {
    const channelId = el.getAttribute("data-channel-id") || "";
    const dow = Number(el.getAttribute("data-dow") || 0);
    const ch = channelById(state, channelId);
    if (!ch) return;
    const av = getChannelAvailability(ch);
    av.weekly = av.weekly && typeof av.weekly === "object" ? av.weekly : makeDefaultAvailability(ch).weekly;
    const w = av.weekly[dow] || { enabled: true, capacity: 1, hotBoost: 1.1 };
    w.enabled = !w.enabled;
    av.weekly[dow] = w;
    ch.availability = av;
    rerender();
    return;
  }

  if (action === "adjustWeeklyCapacity") {
    const channelId = el.getAttribute("data-channel-id") || "";
    const dow = Number(el.getAttribute("data-dow") || 0);
    const delta = Number(el.getAttribute("data-delta") || 0);
    const ch = channelById(state, channelId);
    if (!ch) return;
    const av = getChannelAvailability(ch);
    av.weekly = av.weekly && typeof av.weekly === "object" ? av.weekly : makeDefaultAvailability(ch).weekly;
    const w = av.weekly[dow] || { enabled: true, capacity: 1, hotBoost: 1.1 };
    w.capacity = Math.max(0, Math.min(10, Number(w.capacity || 0) + delta));
    av.weekly[dow] = w;
    ch.availability = av;
    rerender();
    return;
  }

  if (action === "adjustWeeklyHotBoost") {
    const channelId = el.getAttribute("data-channel-id") || "";
    const dow = Number(el.getAttribute("data-dow") || 0);
    const delta = Number(el.getAttribute("data-delta") || 0);
    const ch = channelById(state, channelId);
    if (!ch) return;
    const av = getChannelAvailability(ch);
    av.weekly = av.weekly && typeof av.weekly === "object" ? av.weekly : makeDefaultAvailability(ch).weekly;
    const w = av.weekly[dow] || { enabled: true, capacity: 1, hotBoost: 1.1 };
    w.hotBoost = Math.max(0.8, Math.min(1.6, Number(w.hotBoost || 1.1) + delta));
    av.weekly[dow] = w;
    ch.availability = av;
    rerender();
    return;
  }

  if (action === "clearChannelBlackouts") {
    const channelId = el.getAttribute("data-channel-id") || "";
    const ch = channelById(state, channelId);
    if (!ch) return;
    const av = getChannelAvailability(ch);
    av.blackoutDates = [];
    ch.availability = av;
    rerender();
    return;
  }

  if (action === "createChannel") {
    const name = document.querySelector('[data-ch="name"]')?.value || "";
    const platform = document.querySelector('[data-ch="platform"]')?.value || "";
    const category = document.querySelector('[data-ch="category"]')?.value || "";
    const price = document.querySelector('[data-ch="price"]')?.value || "";
    const description = document.querySelector('[data-ch="description"]')?.value || "";
    const res = createChannel(state, { name, platform, category, price, description });
    if (!res.ok) {
      toast("No se pudo crear canal", res.error);
      return;
    }
    toast("Canal publicado", res.channel.name);
    rerender();
    setHashPath(`/channel/${encodeURIComponent(res.channel.id)}`);
    return;
  }

  if (action === "createCampaign") {
    const channelId = el.getAttribute("data-channel-id") || "";
    const calId = el.getAttribute("data-cal-id") || "";
    const cal = calId ? ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 }) : null;
    const text = document.querySelector('[data-cmp="text"]')?.value || "";
    const link = document.querySelector('[data-cmp="link"]')?.value || "";
    const res = createCampaign(state, {
      channelId,
      text,
      link,
      count: cal ? cal.count : 1,
      requestedDates: cal ? cal.selected : [],
    });
    if (!res.ok) {
      toast("No se pudo crear campaña", res.error);
      return;
    }
    toast("Campaña creada", "Estado: BORRADOR");
    if (cal) cal.selected = [];
    rerender();
    setHashPath(`/campaign/${encodeURIComponent(res.campaign.id)}`);
    return;
  }

  if (action === "payCampaign") {
    const id = el.getAttribute("data-id") || "";
    const res = payCampaign(state, id);
    if (!res.ok) toast("No se pudo pagar", res.error);
    else toast("Pago simulado", "Estado: PAGADA (escrow)");
    rerender();
    return;
  }

  if (action === "acceptCampaign") {
    const id = el.getAttribute("data-id") || "";
    const calId = el.getAttribute("data-cal-id") || "";
    const cal = calId ? ensureCalendar(state, calId, { monthKey: monthKeyFromDate(new Date()), selected: [], count: 1 }) : null;
    const res = acceptCampaign(state, id, cal ? cal.selected : undefined);
    if (!res.ok) toast("No se pudo aceptar", res.error);
    else toast("Campaña aceptada", "Estado: ACEPTADA");
    rerender();
    return;
  }

  if (action === "publishCampaign") {
    const id = el.getAttribute("data-id") || "";
    const res = publishCampaign(state, id);
    if (!res.ok) toast("No se pudo publicar", res.error);
    else toast("Publicación confirmada", "Estado: PUBLICADA");
    rerender();
    return;
  }

  if (action === "completeCampaign") {
    const id = el.getAttribute("data-id") || "";
    const res = completeCampaign(state, id);
    if (!res.ok) toast("No se pudo completar", res.error);
    else toast("Campaña completada", "Pago liberado (mock)");
    rerender();
    return;
  }

  if (action === "simulateClicks") {
    const id = el.getAttribute("data-id") || "";
    const amount = Number(el.getAttribute("data-amount") || 5);
    const res = simulateClicks(state, id, amount);
    if (!res.ok) toast("No se pudo simular clicks", res.error);
    else toast("Clicks simulados", `+${amount}`);
    rerender();
    return;
  }
}

document.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const actionEl = t.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.getAttribute("data-action");
  if (!action) return;
  e.preventDefault();
  handleAction(action, actionEl);
});

window.addEventListener("hashchange", () => {
  renderApp(state);
});

renderApp(state);
