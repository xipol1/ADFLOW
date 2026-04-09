const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat, ExternalHyperlink,
} = require("docx");

// ── Design tokens ──
const INDIGO = "4F46E5";
const VIOLET = "7C3AED";
const SLATE = "1E293B";
const MUTED = "64748B";
const GREEN = "16A34A";
const AMBER = "D97706";
const RED = "DC2626";
const LIGHT_BG = "F8FAFC";
const WHITE = "FFFFFF";
const HEADER_BG = "1E1B4B";

const border = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };
const headerCellMargins = { top: 80, bottom: 80, left: 100, right: 100 };

// ── Helper functions ──
function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: INDIGO, type: ShadingType.CLEAR },
    margins: headerCellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 18 })] })],
  });
}

function cell(text, width, opts = {}) {
  const fill = opts.fill || WHITE;
  const color = opts.color || SLATE;
  const bold = opts.bold || false;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text: String(text), color, font: "Arial", size: 18, bold })],
      alignment: opts.align || AlignmentType.LEFT,
    })],
  });
}

function statusCell(status, width) {
  const map = {
    "Completo": { text: "Completo", color: GREEN, fill: "DCFCE7" },
    "Completado": { text: "Completado", color: GREEN, fill: "DCFCE7" },
    "100%": { text: "100%", color: GREEN, fill: "DCFCE7" },
    "Parcial": { text: "Parcial", color: AMBER, fill: "FEF3C7" },
    "Pendiente": { text: "Pendiente", color: RED, fill: "FEE2E2" },
    "0%": { text: "0%", color: RED, fill: "FEE2E2" },
    "No funciona": { text: "No funciona", color: RED, fill: "FEE2E2" },
  };
  const m = map[status] || { text: status, color: MUTED, fill: LIGHT_BG };
  return cell(m.text, width, { color: m.color, fill: m.fill, bold: true, align: AlignmentType.CENTER });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: HEADER_BG })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: INDIGO })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: VIOLET })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    children: [new TextRun({ text, font: "Arial", size: opts.size || 20, color: opts.color || SLATE, bold: opts.bold, italics: opts.italic })],
  });
}

function spacer(h = 120) {
  return new Paragraph({ spacing: { after: h }, children: [] });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: SLATE })],
  });
}

// ── Build Document ──
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial" }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial" }, paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // ═══════════════════ COVER PAGE ═══════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(2400),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "ADFLOW", font: "Arial", size: 72, bold: true, color: INDIGO })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Marketplace de Publicidad en Comunidades Reales", font: "Arial", size: 28, color: VIOLET })] }),
        spacer(200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: INDIGO, space: 1 } },
          spacing: { before: 200, after: 400 },
          children: [],
        }),
        spacer(100),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Informe de Estado del Desarrollo", font: "Arial", size: 32, bold: true, color: SLATE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "30 de Marzo de 2026", font: "Arial", size: 22, color: MUTED })] }),
        spacer(600),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "URL de Produccion", font: "Arial", size: 18, color: MUTED })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
          new ExternalHyperlink({ link: "https://adflow-unified.vercel.app", children: [new TextRun({ text: "https://adflow-unified.vercel.app", font: "Arial", size: 20, color: INDIGO, underline: {} })] }),
        ] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Documentacion API", font: "Arial", size: 18, color: MUTED })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new ExternalHyperlink({ link: "https://adflow-unified.vercel.app/api/docs/", children: [new TextRun({ text: "https://adflow-unified.vercel.app/api/docs/", font: "Arial", size: 20, color: INDIGO, underline: {} })] }),
        ] }),
      ],
    },

    // ═══════════════════ MAIN CONTENT ═══════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: INDIGO, space: 4 } },
            children: [
              new TextRun({ text: "ADFLOW ", font: "Arial", size: 16, bold: true, color: INDIGO }),
              new TextRun({ text: " |  Informe de Desarrollo  |  Marzo 2026", font: "Arial", size: 16, color: MUTED }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Pagina ", font: "Arial", size: 16, color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: MUTED }),
            ],
          })],
        }),
      },
      children: [
        // ── 1. RESUMEN EJECUTIVO ──
        heading1("1. Resumen Ejecutivo"),
        para("ADFLOW es un marketplace de publicidad en comunidades reales que conecta anunciantes con creadores de canales en WhatsApp, Telegram, Discord, Instagram, Newsletter y Facebook. La plataforma permite a los anunciantes encontrar canales relevantes, crear campanas publicitarias, pagar de forma segura mediante Stripe y trackear resultados en tiempo real."),
        spacer(80),
        para("El proyecto se encuentra en un estado de MVP funcional con 5 sprints completados (de 7 planificados). El codigo esta desplegado en produccion en Vercel y todas las funcionalidades core estan operativas.", { bold: true }),
        spacer(80),

        // KPI summary table
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [2460, 2460, 2460, 2460],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2460, type: WidthType.DXA }, shading: { fill: "EEF2FF", type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "100+", font: "Arial", size: 36, bold: true, color: INDIGO })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Archivos de codigo", font: "Arial", size: 16, color: MUTED })] }),
                ],
              }),
              new TableCell({ borders: noBorders, width: { size: 2460, type: WidthType.DXA }, shading: { fill: "F5F3FF", type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "48", font: "Arial", size: 36, bold: true, color: VIOLET })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "API endpoints", font: "Arial", size: 16, color: MUTED })] }),
                ],
              }),
              new TableCell({ borders: noBorders, width: { size: 2460, type: WidthType.DXA }, shading: { fill: "ECFDF5", type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "118+", font: "Arial", size: 36, bold: true, color: GREEN })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tests", font: "Arial", size: 16, color: MUTED })] }),
                ],
              }),
              new TableCell({ borders: noBorders, width: { size: 2460, type: WidthType.DXA }, shading: { fill: "EEF2FF", type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "18", font: "Arial", size: 36, bold: true, color: INDIGO })] }),
                  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Modelos de datos", font: "Arial", size: 16, color: MUTED })] }),
                ],
              }),
            ] }),
          ],
        }),
        spacer(200),

        // ── 2. STACK TECNOLOGICO ──
        heading1("2. Stack Tecnologico"),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [2800, 7040],
          rows: [
            new TableRow({ children: [headerCell("Capa", 2800), headerCell("Tecnologia", 7040)] }),
            ...[ ["Runtime", "Node.js >= 16"], ["Backend", "Express 4.18"], ["Base de datos", "MongoDB (Mongoose 7.5)"], ["Autenticacion", "JWT (access + refresh tokens) + bcryptjs"], ["Pagos", "Stripe 13.5 (checkout, escrow, PaymentIntents)"], ["Tiempo real", "Socket.io 4.7"], ["Frontend", "React 18 + React Router 6 + Vite 4"], ["Estilos", "TailwindCSS 3.3"], ["Email", "Nodemailer 6.9 (14 templates HTML)"], ["Testing", "Jest + Supertest (118+ tests)"], ["Deploy", "Vercel (serverless) + GitHub Actions CI/CD"], ["Documentacion", "Swagger/OpenAPI 3.0 (48 endpoints)"] ]
              .map(([k, v], i) => new TableRow({ children: [
                cell(k, 2800, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                cell(v, 7040, { fill: i % 2 ? WHITE : LIGHT_BG }),
              ] })),
          ],
        }),
        spacer(200),

        // ── 3. PROGRESO POR SPRINTS ──
        heading1("3. Progreso por Sprints"),

        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [4200, 1400, 1400, 1440, 1400],
          rows: [
            new TableRow({ children: [headerCell("Sprint", 4200), headerCell("Items", 1400), headerCell("Hechos", 1400), headerCell("Progreso", 1440), headerCell("Estado", 1400)] }),
            ...[ ["Sprint 1 - Infraestructura", "7", "7", "100%", "Completado"], ["Sprint 2 - Marketplace core", "10", "10", "100%", "Completado"], ["Sprint 3 - Automatizacion", "7", "7", "100%", "Completado"], ["Sprint 4 - Tracking", "7", "7", "100%", "Completado"], ["Sprint 5 - Features avanzados", "7", "7", "100%", "Completado"], ["Sprint 6 - Produccion real", "22", "0", "0%", "Pendiente"], ["Sprint 7 - Escalamiento", "17", "0", "0%", "Pendiente"] ]
              .map(([name, items, done, pct, status], i) => new TableRow({ children: [
                cell(name, 4200, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                cell(items, 1400, { fill: i % 2 ? WHITE : LIGHT_BG, align: AlignmentType.CENTER }),
                cell(done, 1400, { fill: i % 2 ? WHITE : LIGHT_BG, align: AlignmentType.CENTER }),
                statusCell(pct, 1440),
                statusCell(status, 1400),
              ] })),
            new TableRow({ children: [
              cell("TOTAL", 4200, { bold: true, fill: "EEF2FF" }),
              cell("77", 1400, { bold: true, fill: "EEF2FF", align: AlignmentType.CENTER }),
              cell("38", 1400, { bold: true, fill: "EEF2FF", align: AlignmentType.CENTER }),
              cell("49%", 1440, { bold: true, fill: "EEF2FF", color: INDIGO, align: AlignmentType.CENTER }),
              cell("En progreso", 1400, { bold: true, fill: "EEF2FF", color: INDIGO, align: AlignmentType.CENTER }),
            ] }),
          ],
        }),
        spacer(200),

        // ── Sprint details ──
        heading2("3.1 Sprint 1 - Infraestructura base"),
        ...["Express server con middleware de seguridad (Helmet, CORS, rate limiting, XSS)", "MongoDB con conexion lazy para serverless (ensureDb pattern)", "Autenticacion JWT (access + refresh tokens)", "Registro y verificacion de email", "Modelo de datos base (Usuario, Canal, Campaign, Transaccion)", "Deploy en Vercel como serverless function", "CI/CD con GitHub Actions (lint, test, build)"].map(t => bulletItem(t)),

        heading2("3.2 Sprint 2 - Marketplace core"),
        ...["CRUD de canales para creators", "Marketplace publico con busqueda, filtros y paginacion", "Sistema de campanas (DRAFT -> PAID -> PUBLISHED -> COMPLETED)", "Integracion Stripe (checkout, escrow, PaymentIntents, webhooks)", "Sistema de transacciones y comisiones (10%)", "Dashboard advertiser (7 paginas con KPIs reales)", "Dashboard creator (6 paginas con ganancias)", "Scoring engine de 5 factores para canales", "Pricing dinamico basado en CPM y score", "Landing page con canales destacados"].map(t => bulletItem(t)),

        heading2("3.3 Sprint 3 - Automatizacion y engagement"),
        ...["Sistema de disputas (crear, mensajes, resolucion admin)", "Listas de favoritos (CRUD de listas personalizadas)", "AutoBuy (reglas de compra automatica con budgets)", "Notificaciones multicanal (DB + Socket.io + email + push)", "Campaign cron (expiracion automatica, auto-complete, escrow release)", "Tracking basico de clicks con dedup IP", "Partner API completa (auth, CRUD, webhooks, Stripe escrow)"].map(t => bulletItem(t)),

        heading2("3.4 Sprint 4 - Tracking y verificacion"),
        ...["Sistema de tracking avanzado (links cortos /t/:code)", "Analytics por click (dispositivo, OS, navegador, pais, UTMs, referer)", "Flujo de registro de canal en 5 pasos", "Post de prueba con verificacion (minimo 3 clicks unicos en 48h)", "Auto-verificacion de canales al alcanzar umbral", "Conversion automatica de URLs de anunciantes", "Error boundary en dashboard creator"].map(t => bulletItem(t)),

        heading2("3.5 Sprint 5 - Features avanzados"),
        ...["Sistema de reviews y ratings (5 categorias, respuestas, moderacion)", "Analytics avanzados (time-series, comparativas, export CSV)", "14 templates HTML de email transaccional con diseno profesional", "Swagger/OpenAPI docs (48 endpoints, 15 tags, 8 schemas)", "PWA manifest + service worker + push notifications", "118+ tests de integracion (8 suites)", "Integraciones de plataformas (Telegram, Discord, WhatsApp, Instagram, Facebook, Newsletter)"].map(t => bulletItem(t)),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 4. ESTADO DE CONTROLADORES ──
        heading1("4. Estado Detallado del Backend"),
        heading2("4.1 Controladores (16)"),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [2600, 1400, 5840],
          rows: [
            new TableRow({ children: [headerCell("Controlador", 2600), headerCell("Estado", 1400), headerCell("Funcionalidades", 5840)] }),
            ...[ ["authController", "Completo", "Login, registro, perfil, refresh token, cambiar password, verificar email"], ["canalController", "Completo", "CRUD canales creator, actualizar campos extendidos"], ["channelsController", "Completo", "Listado publico, detalle, busqueda, disponibilidad"], ["campaignController", "Completo", "Ciclo DRAFT->PAID->PUBLISHED->COMPLETED, chat"], ["transaccionController", "Completo", "Checkout Stripe, PaymentIntent, webhooks, retiros"], ["trackingController", "Completo", "Links trackeables, verificacion canales, conversion URLs"], ["reviewController", "Completo", "CRUD reviews, respuestas, helpful/report, agregados"], ["analyticsController", "Completo", "Analytics creator/advertiser/canal/campana, CSV export"], ["disputeController", "Completo", "Crear disputas, mensajes, resolver"], ["notificationController", "Completo", "CRUD notificaciones, marcar leidas"], ["autoBuyController", "Completo", "CRUD reglas, trigger"], ["estadisticaController", "Completo", "Stats generales + analytics avanzados"], ["pushController", "Completo", "Subscribe/unsubscribe push notifications"], ["scoringController", "Completo", "Calculo score 5 factores"], ["fileController", "Parcial", "Upload/download funcional local, efimero en Vercel"], ["anuncioController", "Parcial", "CRUD basico, flujo de aprobacion parcial"] ]
              .map(([name, status, desc], i) => new TableRow({ children: [
                cell(name, 2600, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                statusCell(status, 1400),
                cell(desc, 5840, { fill: i % 2 ? WHITE : LIGHT_BG }),
              ] })),
          ],
        }),
        spacer(200),

        // ── 4.2 Modelos ──
        heading2("4.2 Modelos de datos (18)"),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [2400, 1200, 6240],
          rows: [
            new TableRow({ children: [headerCell("Modelo", 2400), headerCell("Estado", 1200), headerCell("Descripcion", 6240)] }),
            ...[ ["Usuario", "Completo", "Auth, roles, sesiones JWT, push subscriptions"], ["Canal", "Completo", "Canales con credenciales, stats, verificacion, disponibilidad"], ["Campaign", "Completo", "Ciclo de vida completo con Stripe y tracking"], ["Transaccion", "Completo", "Pagos, reembolsos, comisiones, retiros"], ["TrackingLink", "Completo", "Links cortos con analytics (device, country, UTM, referer)"], ["Review", "Completo", "Reviews 5 categorias, respuestas, moderacion"], ["Dispute", "Completo", "Disputas con mensajes y resolucion"], ["AutoBuyRule", "Completo", "Reglas de compra automatica con budgets"], ["UserList", "Completo", "Listas de favoritos de canales"], ["Notificacion", "Completo", "Notificaciones con prioridad y expiracion"], ["CampaignMessage", "Completo", "Chat entre advertiser y creator"], ["ChannelMetrics", "Completo", "Metricas de rendimiento de canales"], ["Retiro", "Completo", "Solicitudes de retiro de creators"], ["Archivo", "Completo", "Metadata de archivos subidos"], ["Anuncio", "Completo", "Gestion de anuncios"], ["Partner", "Completo", "Integraciones externas con API key"], ["PartnerAuditLog", "Completo", "Auditoria de operaciones de partners"], ["Estadistica", "Completo", "Snapshots de estadisticas"] ]
              .map(([name, status, desc], i) => new TableRow({ children: [
                cell(name, 2400, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                statusCell(status, 1200),
                cell(desc, 6240, { fill: i % 2 ? WHITE : LIGHT_BG }),
              ] })),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 5. INTEGRACIONES ──
        heading1("5. Integraciones de Plataformas"),
        para("Cada plataforma tiene un modulo de integracion completo con metodos para verificar acceso, obtener metricas, y publicar anuncios. Todos incluyen fallback a estimacion cuando las credenciales no estan disponibles."),
        spacer(80),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [1800, 3200, 2400, 2440],
          rows: [
            new TableRow({ children: [headerCell("Plataforma", 1800), headerCell("Capacidades API", 3200), headerCell("Estado Modulo", 2400), headerCell("Credenciales", 2440)] }),
            ...[ ["Telegram", "Bot API, publish ads, verify access, member count", "Completo", "Pendiente"], ["Discord", "Guild API, embeds, channel messages, verify bot", "Completo", "Pendiente"], ["WhatsApp", "Graph API, interactive messages, CTA buttons", "Completo", "Pendiente"], ["Instagram", "Graph API, media insights, engagement calc", "Completo", "Pendiente"], ["Facebook", "Page API, insights, post publishing", "Completo", "Pendiente"], ["Newsletter", "Estimacion metricas, verificacion proveedores", "Completo", "N/A"] ]
              .map(([plat, caps, status, creds], i) => new TableRow({ children: [
                cell(plat, 1800, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                cell(caps, 3200, { fill: i % 2 ? WHITE : LIGHT_BG }),
                statusCell(status, 2400),
                statusCell(creds, 2440),
              ] })),
          ],
        }),
        spacer(200),

        // ── 6. INFRAESTRUCTURA ──
        heading1("6. Servicios de Infraestructura"),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [2400, 1600, 5840],
          rows: [
            new TableRow({ children: [headerCell("Servicio", 2400), headerCell("Estado", 1600), headerCell("Detalle", 5840)] }),
            ...[ ["Stripe Pagos", "Completo", "Checkout, PaymentIntent, escrow, webhooks. Sin STRIPE_SECRET_KEY en prod (simula pagos)"], ["Email Transaccional", "Completo", "14 templates HTML profesionales. Sin SMTP configurado aun"], ["Push Notifications", "Completo", "Service worker + Web Push API. Sin VAPID keys configuradas"], ["Socket.io Realtime", "Parcial", "Funcional en local/self-hosted. No funciona en Vercel serverless"], ["File Uploads", "Parcial", "Funcional local con Multer. Efimero en Vercel (necesita cloud storage)"], ["Cron Jobs", "Parcial", "Campaign automation funcional local. No ejecuta en Vercel serverless"], ["Swagger Docs", "Completo", "48 endpoints documentados, accesible en /api/docs/"], ["CI/CD", "Completo", "GitHub Actions: lint, test, build. Auto-deploy en push a main"] ]
              .map(([name, status, desc], i) => new TableRow({ children: [
                cell(name, 2400, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                statusCell(status, 1600),
                cell(desc, 5840, { fill: i % 2 ? WHITE : LIGHT_BG }),
              ] })),
          ],
        }),
        spacer(200),

        // ── 7. LIMITACIONES VERCEL ──
        heading1("7. Limitaciones Serverless y Soluciones"),
        para("Vercel ejecuta funciones serverless (stateless, efimeras). Esto afecta funcionalidades que requieren estado persistente o conexiones largas:"),
        spacer(80),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [2200, 3600, 4040],
          rows: [
            new TableRow({ children: [headerCell("Funcionalidad", 2200), headerCell("Problema en Vercel", 3600), headerCell("Solucion Recomendada", 4040)] }),
            ...[ ["Socket.io", "Sin conexiones WebSocket persistentes entre invocaciones", "Migrar a Pusher/Ably, o implementar polling cada 30s"], ["Cron Jobs", "setInterval no persiste entre invocaciones serverless", "Vercel Cron Functions (api/cron/*.js en vercel.json)"], ["File Uploads", "Directorio /tmp es efimero, archivos se pierden", "Migrar a Vercel Blob, S3, o Cloudinary"], ["Push Notifications", "Requiere VAPID keys no configuradas aun", "Generar con web-push generate-vapid-keys"] ]
              .map(([name, problem, solution], i) => new TableRow({ children: [
                cell(name, 2200, { bold: true, fill: i % 2 ? WHITE : LIGHT_BG }),
                cell(problem, 3600, { fill: i % 2 ? WHITE : LIGHT_BG }),
                cell(solution, 4040, { fill: i % 2 ? WHITE : LIGHT_BG }),
              ] })),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 8. VARIABLES DE ENTORNO ──
        heading1("8. Variables de Entorno"),
        heading2("8.1 Configuradas actualmente"),
        ...["MONGODB_URI - Connection string de MongoDB Atlas", "JWT_SECRET / JWT_REFRESH_SECRET - Secretos de tokens", "FRONTEND_URL - URL del frontend para CORS", "NODE_ENV - Entorno (production)", "PLATFORM_COMMISSION_RATE - Comision estandar 20% (ver config/commissions.js)"].map(t => bulletItem(t)),
        spacer(80),

        heading2("8.2 Pendientes de configurar"),
        ...["STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET - Pagos Stripe en modo live", "EMAIL_PROVIDER / EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS - SMTP", "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_EMAIL - Push notifications", "TELEGRAM_BOT_TOKEN - Integracion Telegram", "DISCORD_BOT_TOKEN / DISCORD_CLIENT_ID - Integracion Discord", "INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_CLIENT_ID - Integracion Instagram", "WHATSAPP_BUSINESS_API_TOKEN / META_APP_ID - Integracion WhatsApp/Meta"].map(t => bulletItem(t)),
        spacer(200),

        // ── 9. TESTS ──
        heading1("9. Tests de Integracion"),
        new Table({
          width: { size: 9840, type: WidthType.DXA },
          columnWidths: [4200, 1800, 1800, 2040],
          rows: [
            new TableRow({ children: [headerCell("Suite", 4200), headerCell("Tests", 1800), headerCell("Estado", 1800), headerCell("Cobertura", 2040)] }),
            ...[ ["smoke.test.js", "6", "Completo", "Health, channels"], ["auth.integration.test.js", "16", "Completo", "Registro, login, tokens"], ["channels.integration.test.js", "15", "Completo", "CRUD canales, permisos"], ["campaigns.integration.test.js", "14", "Completo", "Ciclo de vida campanas"], ["tracking.integration.test.js", "13", "Completo", "Links, verificacion, redirect"], ["disputes.integration.test.js", "12", "Completo", "Disputas, mensajes"], ["reviews.integration.test.js", "14", "Completo", "Reviews, ratings, moderacion"], ["lists-autobuy.integration.test.js", "16", "Completo", "Listas, reglas AutoBuy"], ["notifications.integration.test.js", "12", "Completo", "CRUD notificaciones"] ]
              .map(([name, tests, status, coverage], i) => new TableRow({ children: [
                cell(name, 4200, { fill: i % 2 ? WHITE : LIGHT_BG }),
                cell(tests, 1800, { fill: i % 2 ? WHITE : LIGHT_BG, align: AlignmentType.CENTER }),
                statusCell(status, 1800),
                cell(coverage, 2040, { fill: i % 2 ? WHITE : LIGHT_BG }),
              ] })),
            new TableRow({ children: [
              cell("TOTAL", 4200, { bold: true, fill: "EEF2FF" }),
              cell("118+", 1800, { bold: true, fill: "EEF2FF", align: AlignmentType.CENTER }),
              cell("", 1800, { fill: "EEF2FF" }),
              cell("", 2040, { fill: "EEF2FF" }),
            ] }),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ── 10. PENDIENTE ──
        heading1("10. Sprint 6 - Produccion Real (Pendiente)"),

        heading2("10.1 Configuracion de servicios externos"),
        ...["Configurar Stripe en modo live (STRIPE_SECRET_KEY, webhook secret)", "Configurar SMTP para emails (SendGrid/Mailgun/SES)", "Generar y configurar VAPID keys para push notifications", "Crear bot de Telegram y configurar TELEGRAM_BOT_TOKEN", "Crear app de Discord y configurar DISCORD_BOT_TOKEN", "Configurar WhatsApp Business API (META_APP_ID, token)", "Configurar Instagram Graph API (access token)"].map(t => bulletItem(t)),

        heading2("10.2 Solucion de limitaciones serverless"),
        ...["Implementar Vercel Cron Functions para campaign automation", "Migrar uploads a Vercel Blob o S3", "Reemplazar Socket.io por alternativa serverless (Pusher/Ably o polling)", "Generar set completo de iconos PWA"].map(t => bulletItem(t)),

        heading2("10.3 Panel de administracion"),
        ...["Dashboard admin con metricas de plataforma (usuarios, campanas, revenue)", "Moderacion de canales (aprobar, rechazar, suspender)", "Gestion de usuarios (ver, editar, banear)", "Moderacion de reviews (flagged reviews, eliminar)", "Visor de disputas con herramientas de resolucion", "Logs de auditoria y actividad"].map(t => bulletItem(t)),

        heading2("10.4 Mejoras de UX"),
        ...["Onboarding guiado para nuevos creators y advertisers", "Notificaciones in-app con dropdown en navbar", "Vista previa de anuncio antes de publicar", "Calendario visual de disponibilidad de canales", "Dashboard de analytics con graficos (Chart.js/Recharts)"].map(t => bulletItem(t)),

        heading2("10.5 Seguridad y compliance"),
        ...["Encriptar credenciales de plataformas en DB (AES-256)", "Rate limiting granular por endpoint", "Terminos de servicio y politica de privacidad", "GDPR: exportar/eliminar datos de usuario", "2FA opcional"].map(t => bulletItem(t)),

        spacer(200),

        // ── 11. FUTURO ──
        heading1("11. Sprint 7 - Escalamiento (Futuro)"),
        heading3("Optimizacion de rendimiento"),
        ...["Code-splitting del frontend (lazy loading)", "Redis cache para queries frecuentes", "CDN para assets estaticos", "Indices MongoDB optimizados"].map(t => bulletItem(t)),

        heading3("Funcionalidades premium"),
        ...["Campanas programadas (fecha/hora especifica)", "A/B testing de contenido de anuncios", "Bulk campaigns (misma campana en multiples canales)", "Reportes automaticos semanales por email", "API publica para advertisers (self-service)"].map(t => bulletItem(t)),

        heading3("Expansion de plataformas"),
        ...["Twitter/X (API v2)", "TikTok Business API", "YouTube Community posts", "LinkedIn Company pages", "Reddit, Twitch"].map(t => bulletItem(t)),

        heading3("Monetizacion avanzada"),
        ...["Planes de suscripcion (free/pro/enterprise)", "Comision variable por volumen", "Programa de referidos", "Marketplace de templates de anuncios"].map(t => bulletItem(t)),
      ],
    },
  ],
});

// ── Generate ──
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Users\\win\\Desktop\\ADFLOW\\ADFLOW_Development_Report.docx", buffer);
  console.log("Document generated: ADFLOW_Development_Report.docx");
});
