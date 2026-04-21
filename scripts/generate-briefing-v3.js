const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TabStopType, TabStopPosition
} = require('docx');

// ─── Helpers ───
const ACCENT   = '009B7D';
const DARK     = '1A1A2E';
const GRAY     = '6B7280';
const LIGHT_BG = 'F8FAFB';
const WHITE    = 'FFFFFF';
const RED_BG   = 'FEE2E2';
const RED_TXT  = 'DC2626';
const YELLOW_BG = 'FEF3C7';
const YELLOW_TXT = 'D97706';
const GREEN_BG = 'D1FAE5';
const GREEN_TXT = '059669';
const BLUE_BG  = 'DBEAFE';
const BLUE_TXT = '2563EB';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const TABLE_WIDTH = 9360;

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Arial', color: DARK })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Arial', color: ACCENT })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 22, font: 'Arial', color: DARK })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({ text, size: 20, font: 'Arial', color: opts.color || '374151', ...opts.run })]
  });
}

function richPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: runs.map(r => typeof r === 'string'
      ? new TextRun({ text: r, size: 20, font: 'Arial', color: '374151' })
      : new TextRun({ size: 20, font: 'Arial', color: '374151', ...r })
    )
  });
}

function bulletItem(text, ref = 'bullets', level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20, font: 'Arial', color: '374151' })]
  });
}

function richBullet(runs, ref = 'bullets', level = 0) {
  return new Paragraph({
    numbering: { reference: ref, level },
    spacing: { after: 60 },
    children: runs.map(r => typeof r === 'string'
      ? new TextRun({ text: r, size: 20, font: 'Arial', color: '374151' })
      : new TextRun({ size: 20, font: 'Arial', color: '374151', ...r })
    )
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
    indent: { left: 200, right: 200 },
    children: [new TextRun({ text, size: 18, font: 'Consolas', color: '1F2937' })]
  });
}

function statusBadge(status) {
  if (status === 'operativo' || status === 'live') return { text: 'Operativo', color: GREEN_TXT, bg: GREEN_BG };
  if (status === 'pendiente') return { text: 'Pendiente', color: YELLOW_TXT, bg: YELLOW_BG };
  if (status === 'bloqueante') return { text: 'Bloqueante', color: RED_TXT, bg: RED_BG };
  if (status === 'en-progreso') return { text: 'En progreso', color: BLUE_TXT, bg: BLUE_BG };
  return { text: status, color: GRAY, bg: LIGHT_BG };
}

function makeHeaderRow(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((col, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: ACCENT, type: ShadingType.CLEAR },
      margins: cellMargins,
      verticalAlign: 'center',
      children: [new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: col, bold: true, size: 18, font: 'Arial', color: WHITE })]
      })]
    }))
  });
}

function makeRow(cells, widths, opts = {}) {
  return new TableRow({
    children: cells.map((cell, i) => {
      const isRichCell = Array.isArray(cell);
      const shading = opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined;
      return new TableCell({
        borders,
        width: { size: widths[i], type: WidthType.DXA },
        shading,
        margins: cellMargins,
        children: [new Paragraph({
          spacing: { after: 0 },
          children: isRichCell ? cell.map(r => new TextRun({ size: 18, font: 'Arial', color: '374151', ...r })) :
            [new TextRun({ text: String(cell), size: 18, font: 'Arial', color: '374151' })]
        })]
      });
    })
  });
}

function statusRow(cells, widths, statusIdx) {
  return new TableRow({
    children: cells.map((cell, i) => {
      if (i === statusIdx) {
        const badge = statusBadge(cell);
        return new TableCell({
          borders,
          width: { size: widths[i], type: WidthType.DXA },
          shading: { fill: badge.bg, type: ShadingType.CLEAR },
          margins: cellMargins,
          children: [new Paragraph({
            spacing: { after: 0 },
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: badge.text, bold: true, size: 18, font: 'Arial', color: badge.color })]
          })]
        });
      }
      const isRich = Array.isArray(cell);
      return new TableCell({
        borders,
        width: { size: widths[i], type: WidthType.DXA },
        margins: cellMargins,
        children: [new Paragraph({
          spacing: { after: 0 },
          children: isRich ? cell.map(r => new TextRun({ size: 18, font: 'Arial', color: '374151', ...r })) :
            [new TextRun({ text: String(cell), size: 18, font: 'Arial', color: '374151' })]
        })]
      });
    })
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB', space: 8 } },
    children: []
  });
}

// ═══════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 20 } }
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: ACCENT },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: 'numbers', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: 'roadmap-done', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u2713', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: 'roadmap-pending', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u25CB', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: 'maint', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u21BB', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          spacing: { after: 0 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: ACCENT, space: 4 } },
          children: [
            new TextRun({ text: 'ChannelAd Technical Briefing v3.0', size: 16, font: 'Arial', color: ACCENT, bold: true }),
            new TextRun({ text: '\t', size: 16 }),
            new TextRun({ text: 'channelad.io', size: 16, font: 'Arial', color: GRAY }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          spacing: { after: 0 },
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 4 } },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Confidencial \u2014 Uso interno \u2014 ', size: 16, font: 'Arial', color: GRAY }),
            new TextRun({ text: 'P\u00E1gina ', size: 16, font: 'Arial', color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: GRAY }),
          ]
        })]
      })
    },
    children: [

      // ═══════════════════════════════════════════════════════
      // COVER PAGE
      // ═══════════════════════════════════════════════════════
      new Paragraph({ spacing: { before: 2400 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'ChannelAd', size: 56, bold: true, font: 'Arial', color: ACCENT })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Technical Briefing para Desarrolladores', size: 32, font: 'Arial', color: DARK })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: 'channelad.io  \u00B7  Abril 2026  \u00B7  Versi\u00F3n 3.0', size: 22, font: 'Arial', color: GRAY })]
      }),

      // Metadata table
      new Table({
        width: { size: 6000, type: WidthType.DXA },
        columnWidths: [2400, 3600],
        alignment: AlignmentType.CENTER,
        rows: [
          makeRow([
            [{ text: 'Tipo', bold: true }],
            'Technical Briefing para equipo de desarrollo'
          ], [2400, 3600]),
          makeRow([
            [{ text: 'Versi\u00F3n', bold: true }],
            '3.0 \u2014 Auditada 16 abril 2026'
          ], [2400, 3600]),
          makeRow([
            [{ text: 'Repo', bold: true }],
            'github.com/xipol1/ADFLOW (rama: main)'
          ], [2400, 3600]),
          makeRow([
            [{ text: 'Producci\u00F3n', bold: true }],
            'adflow-unified.vercel.app'
          ], [2400, 3600]),
          makeRow([
            [{ text: 'Staging', bold: true }],
            'channelad-staging.vercel.app'
          ], [2400, 3600]),
          makeRow([
            [{ text: 'Audiencia', bold: true }],
            'Desarrolladores entrantes / colaboradores t\u00E9cnicos'
          ], [2400, 3600]),
        ]
      }),

      new Paragraph({ spacing: { before: 400, after: 200 }, alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: 'Este documento refleja el estado real auditado del proyecto: c\u00F3digo fuente, historial de commits de Vercel y README del repositorio. Las secciones de roadmap distinguen entre lo confirmado en producci\u00F3n, lo en progreso y lo pendiente.', size: 18, font: 'Arial', color: GRAY, italics: true })
      ]}),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // ESTADO A 16 ABRIL 2026
      // ═══════════════════════════════════════════════════════
      heading1('Estado a 16 abril 2026 \u2014 Hitos clave'),

      heading3('Completados desde v2.0 (10 abr)'),
      bulletItem('Google Sign-In (OAuth 2.0): login/registro one-click, skip email verification'),
      bulletItem('WhatsApp Baileys: vinculaci\u00F3n v\u00EDa QR, newsletters, audit log (requiere VPS)'),
      bulletItem('Sistema de scrapers con rotaci\u00F3n: 7 servicios, 115+ keywords, dedup TTL'),
      bulletItem('Channel claim: verificaci\u00F3n por token en descripci\u00F3n de Telegram v\u00EDa MTProto'),
      bulletItem('Massive seed job: descubrimiento en 3 fases (keywords + social graph + m\u00E9tricas)'),
      bulletItem('Calendario de publicaci\u00F3n interactivo con precios por d\u00EDa + moderaci\u00F3n de chat'),
      bulletItem('Creator sub-types: individual vs agencia (modelo + UI)'),
      bulletItem('LinkedIn monetization pipeline: OAuth + m\u00E9tricas + newsletter discovery (66 seeds + 406 scrapeadas)'),
      bulletItem('Admin dashboard completo: 7 p\u00E1ginas (overview, users, channels, campaigns, disputes, finances, scoring)'),
      bulletItem('Rankings + Niche Intelligence: leaderboard por categor\u00EDa, trends 30d/90d'),
      bulletItem('3 formatos de tracking link: domain visible, custom slug, short hash'),
      bulletItem('Flujo de creaci\u00F3n de campa\u00F1a: wizard 3 pasos con calendario + formato de link'),
      bulletItem('Light mode + design system: CSS variables, tokens sem\u00E1nticos, theme switching'),
      bulletItem('Blog SEO: 19 HTMLs indexables, HowTo schema en 7 gu\u00EDas, sitemap 29 URLs'),
      bulletItem('Creator dashboard redise\u00F1o nivel Semrush: analytics, earnings, channels, requests'),

      heading3('Bloqueantes activos'),
      richBullet([
        { text: 'API keys SHA-256 para Getalink: ', bold: true },
        'pendiente generaci\u00F3n (staging ya live)'
      ]),
      richBullet([
        { text: 'Contrato Getalink: ', bold: true },
        'pendiente firma (4 Anexos redactados: SLA, GDPR/DPA, definiciones, comisiones)'
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 1. QU\u00C9 ES CHANNELAD
      // ═══════════════════════════════════════════════════════
      heading1('1. Qu\u00E9 es ChannelAd'),
      para('Marketplace de publicidad en comunidades digitales cerradas (Telegram, Discord, WhatsApp, Instagram Broadcasts, Newsletters, LinkedIn). Conecta anunciantes con creadores de canales eliminando la fricci\u00F3n actual: DMs manuales, pagos sin garant\u00EDa, tracking inexistente.'),
      richPara([
        { text: 'Posicionamiento estrat\u00E9gico: ', bold: true },
        'el marketplace es el mecanismo de adquisici\u00F3n que genera un motor de datos propietario \u2014 scoring de canales, CTR por nicho, CPMs reales por plataforma. Ning\u00FAn competidor tiene estos datos para canales cerrados.'
      ]),

      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [1800, 7560],
        rows: [
          makeHeaderRow(['Actor', 'Propuesta de valor'], [1800, 7560]),
          makeRow(['Anunciante', 'Inventario segmentado, escrow garantizado, tracking en tiempo real, cr\u00E9ditos por referido, calendario de publicaci\u00F3n interactivo'], [1800, 7560]),
          makeRow(['Creador', 'Monetizaci\u00F3n directa, cobro garantizado v\u00EDa Stripe, panel de ganancias, score p\u00FAblico, claim de canal, sub-tipo individual/agencia'], [1800, 7560]),
          makeRow(['Plataforma', '10% comisi\u00F3n + datos propietarios de rendimiento por canal, nicho y plataforma'], [1800, 7560]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 2. DEMO FUNCIONAL
      // ═══════════════════════════════════════════════════════
      heading1('2. Demo funcional \u2014 Flujos de usuario'),

      heading2('2.1 Flujo del Anunciante'),
      bulletItem('Accede al marketplace p\u00FAblico (nombres/precios anonimizados para no-auth).'),
      bulletItem('Filtra canales por plataforma, categor\u00EDa, precio y score CAS.'),
      bulletItem('Se registra (con o sin Google Sign-In, con o sin referral code \u2014 \u20AC10 cr\u00E9ditos si lo aplica).'),
      bulletItem('Crea campa\u00F1a en DRAFT v\u00EDa wizard de 3 pasos: selecci\u00F3n canal \u2192 contenido + calendario \u2192 confirmaci\u00F3n.'),
      bulletItem('Elige formato de tracking link: domain visible, custom slug o short hash.'),
      bulletItem('Paga con Stripe (escrow). Cr\u00E9ditos auto-aplicados.'),

      para('Ciclo de estados de campa\u00F1a:', { run: { bold: true } }),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 7360],
        rows: [
          makeHeaderRow(['Estado', 'Descripci\u00F3n'], [2000, 7360]),
          makeRow(['DRAFT', 'Campa\u00F1a creada, pendiente de pago'], [2000, 7360]),
          makeRow(['PAID', 'Pago capturado (Stripe PaymentIntent escrow)'], [2000, 7360]),
          makeRow(['PUBLISHED', 'Creator ha publicado el contenido'], [2000, 7360]),
          makeRow(['COMPLETED', 'Campa\u00F1a finalizada; escrow liberado al creator'], [2000, 7360]),
          makeRow(['EXPIRED', 'Superado el deadline sin publicaci\u00F3n'], [2000, 7360]),
          makeRow(['DISPUTED', 'Conflicto abierto; pendiente resoluci\u00F3n admin'], [2000, 7360]),
          makeRow(['CANCELLED', 'Anunciante cancel\u00F3 antes de publicaci\u00F3n'], [2000, 7360]),
        ]
      }),

      para('Funcionalidades adicionales del advertiser dashboard:', { run: { bold: true } }),
      richBullet([{ text: 'AutoBuy: ', bold: true }, 'Reglas autom\u00E1ticas con presupuesto m\u00E1ximo, filtros de canal y trigger manual.']),
      richBullet([{ text: 'Listas favoritos: ', bold: true }, 'Agrupaci\u00F3n personalizada de canales para compra recurrente.']),
      richBullet([{ text: 'Cr\u00E9ditos campa\u00F1a: ', bold: true }, '\u20AC10 bonus por cada referido que se registre \u2014 aplicados autom\u00E1ticamente al pagar.']),
      richBullet([{ text: 'Campaign Analytics: ', bold: true }, 'Timeline de clics, breakdown por dispositivo/geo/referrer.']),

      heading2('2.2 Flujo del Creador'),
      bulletItem('Registro con selecci\u00F3n de sub-tipo: individual o agencia.'),
      bulletItem('Registro de canal en 5 pasos guiados: plataforma \u2192 conexi\u00F3n API \u2192 info \u2192 verificaci\u00F3n por test post \u2192 confirmaci\u00F3n.'),
      richBullet([{ text: 'Verificaci\u00F3n por test post: ', bold: true }, 'se genera un TrackingLink tipo verification. El creador publica el link en su canal. Al alcanzar 3 clics \u00FAnicos (dedup por IP, ventana 1h) en 48 horas, el canal se verifica autom\u00E1ticamente.']),
      richBullet([{ text: 'WhatsApp Baileys: ', bold: true }, 'vinculaci\u00F3n via QR code, listado de newsletters, audit log inmutable.']),
      richBullet([{ text: 'Channel claim: ', bold: true }, 'reclamar canales descubiertos por el sistema a\u00F1adiendo token a la descripci\u00F3n de Telegram.']),
      bulletItem('Dashboard redise\u00F1ado nivel Semrush: analytics con gr\u00E1ficos, CPM simulator, earnings con datos reales, channels con charts, requests con chat moderado.'),

      heading2('2.3 Beta Access'),
      para('Los dashboards /advertiser/* y /creator/* est\u00E1n protegidos por un flag betaAccess almacenado en MongoDB (no solo variable de entorno). Los tres usuarios de demo (admin/creator/advertiser @adflow.com) tienen betaAccess: true por seed. Los nuevos usuarios ven BetaGatePage hasta que se les activa manualmente o desde admin.'),

      heading2('2.4 Canal Explorer \u2014 P\u00E1gina p\u00FAblica de inteligencia'),
      para('Ruta /channel/:id que muestra el perfil p\u00FAblico de un canal con: CAS Score con gauge radial, breakdown por 5 factores, BenchmarkBar CTR + CPM vs nicho, historial de 90 d\u00EDas de CAS (gr\u00E1fico recharts), estad\u00EDsticas agregadas, y CTA de contrataci\u00F3n.'),
      richBullet([{ text: 'Privacy guard: ', bold: true }, 'ning\u00FAn dato de propietario, email ni advertiser expuesto.']),
      richBullet([{ text: 'Rate-limited: ', bold: true }, '10 req/10s burst + 100 req/hora, cacheado en Vercel Edge (max-age 3600).']),

      heading2('2.5 Rankings y Niche Intelligence'),
      bulletItem('Leaderboard LIVE por categor\u00EDa: finanzas, marketing, tecnolog\u00EDa, cripto, salud, educaci\u00F3n, lifestyle, entretenimiento.'),
      bulletItem('Medallas top 3 (gold/silver/bronze), delta badges con cambio porcentual.'),
      bulletItem('Niche Intelligence: trends de CAS/precio/suscriptores (30d/90d), supply/demand, top/bottom canales.'),

      heading2('2.6 Estado de integraciones por plataforma'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 5000, 2360],
        rows: [
          makeHeaderRow(['Plataforma', 'Estado', 'Pendiente'], [2000, 5000, 2360]),
          makeRow(['Telegram', 'Registro operativo (Bot Token) + MTProto intel + claim', 'Bot notificaciones'], [2000, 5000, 2360]),
          makeRow(['Discord', 'Registro operativo (Invite/Webhook)', 'Bot publicaci\u00F3n'], [2000, 5000, 2360]),
          makeRow(['WhatsApp', 'Registro + verificaci\u00F3n OCR + Baileys QR link', 'Business API envio'], [2000, 5000, 2360]),
          makeRow(['Instagram', 'Registro operativo', 'Meta Graph API'], [2000, 5000, 2360]),
          makeRow(['Newsletter', 'Registro + LinkedIn discovery (486 seeds)', 'Env\u00EDo directo'], [2000, 5000, 2360]),
          makeRow(['Facebook', 'Registro operativo', 'Graph API'], [2000, 5000, 2360]),
          makeRow(['LinkedIn', 'OAuth + m\u00E9tricas creator/org + newsletter sync', 'Publicaci\u00F3n nativa'], [2000, 5000, 2360]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 3. ARQUITECTURA T\u00C9CNICA
      // ═══════════════════════════════════════════════════════
      heading1('3. Arquitectura t\u00E9cnica a alto nivel'),

      heading2('3.1 Stack tecnol\u00F3gico \u2014 Estado auditado 16 abr 2026'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2200, 5000, 2160],
        rows: [
          makeHeaderRow(['Capa', 'Tecnolog\u00EDa', 'Estado'], [2200, 5000, 2160]),
          statusRow(['Runtime', 'Node.js >= 16', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Backend', 'Express 4.18 \u2014 API REST + middleware pipeline', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Base de datos', 'MongoDB (Mongoose 7.5) + JSON file store de respaldo', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Auth usuarios', 'JWT (access 15m + refresh 7d) + bcryptjs + Google OAuth 2.0', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Auth Partner API', 'HMAC SHA-256 + timing-safe compare + audit log', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Beta access', 'Flag betaAccess en Usuario (DB-stored, no solo env)', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Pagos', 'Stripe 13.5 \u2014 Checkout, escrow PaymentIntents, captura diferida', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Cr\u00E9ditos campa\u00F1a', 'campaignCreditsBalance en Usuario, auto-aplicado en payCampaign', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Tiempo real', 'Socket.io 4.7 \u2014 notificaciones push in-app', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Frontend', 'React 18 + React Router 6 + Vite 4 + TailwindCSS 3.3', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Design system', 'CSS variables (light/dark), tokens sem\u00E1nticos, DM Sans + JetBrains Mono', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Gr\u00E1ficos', 'recharts ^3.8.1', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Email', 'Nodemailer 6.9 (SMTP Hostinger) \u2014 welcome + referral + recordatorio', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['OCR WhatsApp', 'Tesseract.js (lazy-loaded, wasm 30MB) \u2014 swap path Cloud Vision', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['WhatsApp Baileys', 'QR link, newsletters, audit log \u2014 requiere VPS (no serverless)', 'en-progreso'], [2200, 5000, 2160], 2),
          statusRow(['SEO / Blog', '19 HTMLs indexables + calculadora + FAQPage + HowTo schema', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Seguridad', 'Helmet, CORS, HPP, rate limiting, mongo-sanitize, xss-clean', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['CI/CD', 'GitHub Actions (.github/workflows/ci.yml)', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Deploy', 'Vercel serverless (Hobby plan \u2014 1 cron/d\u00EDa m\u00E1ximo)', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Scoring Engine v2', 'channelScoringV2.js \u2014 funci\u00F3n pura, sin queries, testeable sin DB', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Snapshots', 'CanalScoreSnapshot (90 d\u00EDas, sin TTL) + CampaignMetricsV2', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Channel Discovery', '7 scrapers + MTProto + rotaci\u00F3n keywords + massive seed job', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['LinkedIn Pipeline', 'OAuth + creator/org metrics + newsletter discovery (486 seeds)', 'operativo'], [2200, 5000, 2160], 2),
          statusRow(['Chat moderation', 'Filtro email/tel\u00E9fono/URL/crypto/tarjetas + rate limit 3s/60h', 'operativo'], [2200, 5000, 2160], 2),
        ]
      }),

      heading2('3.2 Proyectos en Vercel'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          makeHeaderRow(['Proyecto', 'Descripci\u00F3n'], [2600, 6760]),
          makeRow(['adflow-unified', 'Producci\u00F3n principal. Rama main. \u00DAltimo deploy: 16 abr 2026.'], [2600, 6760]),
          makeRow(['channelad-staging', 'Staging para Getalink. BD: channelad_staging. Live desde 8 abr 2026.'], [2600, 6760]),
          makeRow(['cas-simulator', 'Herramienta interna de simulaci\u00F3n del CAS Score.'], [2600, 6760]),
        ]
      }),

      heading2('3.3 Entornos'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          makeHeaderRow(['Entorno', 'Configuraci\u00F3n'], [2200, 7160]),
          makeRow(['Producci\u00F3n', 'adflow-unified.vercel.app \u2014 MongoDB Atlas (channelad o adflow)'], [2200, 7160]),
          makeRow(['Staging', 'channelad-staging.vercel.app \u2014 MongoDB Atlas channelad_staging'], [2200, 7160]),
          makeRow(['Local (dev)', 'Frontend Vite :3000 \u2192 Backend Express :5000 \u2192 MongoDB local o Atlas'], [2200, 7160]),
          makeRow(['Cron l\u00EDmite', 'Vercel Hobby: 1 cron/d\u00EDa. Scoring: 03:00 UTC. Snapshot: 03:30 UTC.'], [2200, 7160]),
        ]
      }),

      heading2('3.4 Estructura de directorios'),
      codeBlock('CHANNELAD/'),
      codeBlock('\u251C\u2500\u2500 api/                    # Entry point Vercel serverless'),
      codeBlock('\u251C\u2500\u2500 app.js                  # Config Express: middleware, rutas, static'),
      codeBlock('\u251C\u2500\u2500 server.js               # HTTP server + Socket.io + cron jobs'),
      codeBlock('\u251C\u2500\u2500 config/'),
      codeBlock('\u2502   \u251C\u2500\u2500 config.js           # Config centralizada'),
      codeBlock('\u2502   \u251C\u2500\u2500 database.js         # Retry MongoDB Atlas'),
      codeBlock('\u2502   \u251C\u2500\u2500 commissions.js      # Config de comisiones'),
      codeBlock('\u2502   \u2514\u2500\u2500 nicheBenchmarks.js  # NICHE_BENCHMARKS para scoring v2'),
      codeBlock('\u251C\u2500\u2500 models/                 # 32 schemas Mongoose'),
      codeBlock('\u251C\u2500\u2500 controllers/            # 25 controladores'),
      codeBlock('\u251C\u2500\u2500 routes/                 # 32 archivos de rutas'),
      codeBlock('\u251C\u2500\u2500 middleware/             # 8 middlewares (auth JWT, partner SHA-256, rate limit...)'),
      codeBlock('\u251C\u2500\u2500 services/               # 35 servicios de negocio'),
      codeBlock('\u2502   \u2514\u2500\u2500 scrapers/           # 7 scrapers de descubrimiento'),
      codeBlock('\u251C\u2500\u2500 lib/                    # messageModeration.js (filtro chat)'),
      codeBlock('\u251C\u2500\u2500 jobs/                   # massiveSeedJob, telegramIntelJob'),
      codeBlock('\u251C\u2500\u2500 workers/                # whatsappWorker.js (Baileys)'),
      codeBlock('\u251C\u2500\u2500 src/                    # Frontend React'),
      codeBlock('\u2502   \u251C\u2500\u2500 ui/'),
      codeBlock('\u2502   \u2502   \u251C\u2500\u2500 components/     # 39 componentes (16 base + 11 landing + 10 scoring + 2 shared)'),
      codeBlock('\u2502   \u2502   \u2514\u2500\u2500 pages/          # 79 p\u00E1ginas React'),
      codeBlock('\u2502   \u2514\u2500\u2500 auth/               # AuthContext (betaAccess, Google, referral)'),
      codeBlock('\u251C\u2500\u2500 .github/workflows/      # CI/CD GitHub Actions'),
      codeBlock('\u251C\u2500\u2500 scripts/                # Seed, migration, build-blog, scraping tools'),
      codeBlock('\u251C\u2500\u2500 content/blog/           # 12+ art\u00EDculos Markdown (fuente para HTMLs)'),
      codeBlock('\u2514\u2500\u2500 tests/                  # 28 archivos test Jest'),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 3.5 SCORING ENGINE
      // ═══════════════════════════════════════════════════════
      heading2('3.5 Flujo del scoring engine v2.0 (extremo a extremo)'),
      para('El scoring es la pieza m\u00E1s compleja y el principal diferencial t\u00E9cnico:'),
      richBullet([{ text: 'Campa\u00F1a \u2192 PUBLISHED: ', bold: true }, 'initCampaignMetrics() crea doc CampaignMetricsV2, scheduleSnapshotWindows() registra 5 timestamps (1h/6h/24h/72h/7d).']),
      richBullet([{ text: 'Cron diario 03:30 UTC: ', bold: true }, 'captura snapshots cuya ventana ha elapsed, detectarAnomaliaFraude() en cada snapshot, flagFraude + log si CTR fuera de rango.']),
      richBullet([{ text: 'Campa\u00F1a \u2192 COMPLETED: ', bold: true }, 'captureFinalSnapshot() PRIMERO, luego recalcularCASCanal() con calcularCAS() [funci\u00F3n pura, sin queries, sin await].']),
      richBullet([{ text: 'Cron diario 03:00 UTC: ', bold: true }, 'todos canales verificados/activos en batches de 25 (concurrencia 10), Promise.allSettled, ScoringCronLog por ejecuci\u00F3n.']),
      richBullet([{ text: 'GET /api/channels/:id/intelligence: ', bold: true }, 'p\u00FAblico, sin auth, privacy guard, cache Vercel Edge 3600s, rate limit 10/10s + 100/h.']),

      heading2('3.6 Modelo de datos \u2014 Relaciones clave'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [3600, 1200, 4560],
        rows: [
          makeHeaderRow(['Relaci\u00F3n', 'Card.', 'Nota'], [3600, 1200, 4560]),
          makeRow(['Usuario \u2192 Canal', '1:N', 'Un creator tiene N canales'], [3600, 1200, 4560]),
          makeRow(['Usuario \u2192 Campaign', '1:N', 'Un advertiser crea N campa\u00F1as'], [3600, 1200, 4560]),
          makeRow(['Canal \u2192 Campaign', '1:N', 'Un canal recibe N campa\u00F1as'], [3600, 1200, 4560]),
          makeRow(['Campaign \u2192 CampaignMetricsV2', '1:1', 'Snapshots temporales (1h/6h/24h/72h/7d)'], [3600, 1200, 4560]),
          makeRow(['Canal \u2192 CanalScoreSnapshot', '1:N', 'Historial indefinido de scoring (version:2)'], [3600, 1200, 4560]),
          makeRow(['Campaign \u2192 Transacci\u00F3n', '1:N', 'Movimientos financieros'], [3600, 1200, 4560]),
          makeRow(['Campaign \u2192 Dispute', '1:1', 'Disputa por campa\u00F1a'], [3600, 1200, 4560]),
          makeRow(['Campaign \u2192 TrackingLink', '1:1', '3 formatos: domain/custom/short'], [3600, 1200, 4560]),
          makeRow(['Usuario \u2192 AutoBuyRule', '1:N', 'Reglas de compra autom\u00E1tica'], [3600, 1200, 4560]),
          makeRow(['Usuario \u2192 BaileysSession', '1:1', 'Sesi\u00F3n WhatsApp Baileys (QR link)'], [3600, 1200, 4560]),
          makeRow(['Canal \u2192 claimed/claimedBy', '0:1', 'Claim de canal descubierto (Telegram)'], [3600, 1200, 4560]),
          makeRow(['ScrapingRotation', 'cursor', 'Posici\u00F3n en pool de 115+ keywords'], [3600, 1200, 4560]),
          makeRow(['SeenChannel', 'dedup', 'Cache TTL para canales ya vistos'], [3600, 1200, 4560]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 4. VOLUMEN DE C\u00D3DIGO
      // ═══════════════════════════════════════════════════════
      heading1('4. Volumen de c\u00F3digo y complejidad'),

      heading2('4.1 M\u00E9tricas de m\u00F3dulos \u2014 Estado real (16 abr 2026)'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [3200, 1600, 4560],
        rows: [
          makeHeaderRow(['M\u00F3dulo', 'Cantidad', 'Detalle'], [3200, 1600, 4560]),
          makeRow(['Modelos Mongoose', '32', '22 originales + BaileysSession, BotToken, ChannelCandidate, ChannelMetrics, JobLog, Review, ScrapingRotation, SeenChannel, WhatsAppAuditLog, WhatsAppVerification'], [3200, 1600, 4560]),
          makeRow(['Controladores', '25', '15 originales + analytics, baileys, channels, claim, oauth, onboarding, platformConnect, push, review, scoring'], [3200, 1600, 4560]),
          makeRow(['Archivos de rutas', '32', '19 originales + adminDashboard, baileys, channelCandidates, channels, invoices, nicheIntelligence, oauth, onboarding, partnerWebhook, payouts, referrals, reviews, telegramIntel'], [3200, 1600, 4560]),
          makeRow(['Servicios de negocio', '42', '35 core + 7 scrapers (cheetahGroups, disboard, igrupos, tdirectory, telegramCryptoGroups, wachannelsfinder, xtea)'], [3200, 1600, 4560]),
          makeRow(['Middlewares', '8', 'auth, partnerAuth, partnerIdempotency, partnerRequestContext, rateLimiter, requestMetrics, notImplemented, validarCampos'], [3200, 1600, 4560]),
          makeRow(['Componentes React', '39', '16 base + 11 landing + 10 scoring + 2 shared'], [3200, 1600, 4560]),
          makeRow(['P\u00E1ginas React', '79', '29 originales + 50 nuevas (admin 8, advertiser 12, creator 9, blog 20, rankings, niche, claim, marketplace, legal 5, landing 3)'], [3200, 1600, 4560]),
          makeRow(['Endpoints REST', '237+', 'Core + Partner API + Admin + Intelligence + Rankings + OAuth + Baileys'], [3200, 1600, 4560]),
          makeRow(['Archivos test', '28', 'Jest (smoke + integraci\u00F3n)'], [3200, 1600, 4560]),
          makeRow(['Jobs background', '2', 'massiveSeedJob, telegramIntelJob'], [3200, 1600, 4560]),
          makeRow(['Workers', '1', 'whatsappWorker.js (Baileys)'], [3200, 1600, 4560]),
          makeRow(['Art\u00EDculos blog', '19+', 'HTMLs indexables + calculadora SPA + 12 Markdown source'], [3200, 1600, 4560]),
          makeRow(['Scrapers', '7', 'Rotaci\u00F3n con 115+ keywords en 7 verticales'], [3200, 1600, 4560]),
        ]
      }),

      heading2('4.2 M\u00F3dulos de mayor complejidad'),

      heading3('Scoring Engine v2.0 \u2014 channelScoringV2.js'),
      richBullet([{ text: 'Arquitectura: ', bold: true }, 'Funci\u00F3n pura \u2014 recibe datos, devuelve score. Sin queries, sin await. Testeable sin MongoDB.']),
      richBullet([{ text: 'Factores CAS: ', bold: true }, 'Attention (25%), Intent (15%), Trust (20%), Performance (25%), Liquidity (15%).']),
      richBullet([{ text: 'M\u00E9tricas: ', bold: true }, 'CAS, CAF, CTF, CER, CVS, CAP, CPMDinamico.']),
      richBullet([{ text: 'Versioning: ', bold: true }, 'version:2 en CanalScoreSnapshot. Sin TTL (moat temporal).']),
      richBullet([{ text: 'Orquestador: ', bold: true }, 'batches de 25, concurrencia 10, Promise.allSettled.']),

      heading3('Channel Discovery Pipeline'),
      richBullet([{ text: '7 scrapers: ', bold: true }, 'CheetahGroups, Disboard, Igrupos, TDirectory, TelegramCryptoGroups, WAChannelsFinder, XTea.']),
      richBullet([{ text: 'MTProto: ', bold: true }, 'GramJS para Telegram (channels.GetFullChannel, contacts.Search).']),
      richBullet([{ text: 'Rotaci\u00F3n: ', bold: true }, '115+ keywords, 60/run (MTProto) + 30/run (Lyzem), cursor persistente.']),
      richBullet([{ text: 'Dedup: ', bold: true }, 'SeenChannel con TTL diferenciado (1d-90d seg\u00FAn raz\u00F3n de filtrado).']),
      richBullet([{ text: 'Massive seed: ', bold: true }, '3 fases (keywords \u2192 social graph \u2192 m\u00E9tricas), FloodWait handling, progress polling.']),

      heading3('Chat Moderation \u2014 lib/messageModeration.js'),
      richBullet([{ text: 'Filtros: ', bold: true }, 'email, tel\u00E9fono, URLs, links Telegram/WhatsApp, handles sociales, crypto addresses, tarjetas de pago.']),
      richBullet([{ text: 'Rate limit: ', bold: true }, '3s cooldown entre mensajes, 60 mensajes/hora, 2000 chars m\u00E1ximo.']),

      heading3('LinkedIn Monetization Pipeline'),
      richBullet([{ text: 'Creator metrics: ', bold: true }, 'followerGrowth 7d/30d/lifetime, post analytics.']),
      richBullet([{ text: 'Org metrics: ', bold: true }, 'page views (overview/careers/jobs/lifeAt), network sizes.']),
      richBullet([{ text: 'Newsletter discovery: ', bold: true }, '66 editorial seeds + 406 scrapeadas (ohmynewst) + 20 LinkedIn newsletter profiles.']),
      richBullet([{ text: 'Taxonomy: ', bold: true }, '12 nichos, keyword scoring, detecci\u00F3n de provider (substack, beehiiv, mailchimp, kit, ghost, linkedin).']),

      heading3('WhatsApp Baileys'),
      richBullet([{ text: 'Session: ', bold: true }, 'QR code (90s), credenciales encriptadas, newsletter discovery.']),
      richBullet([{ text: 'Audit log: ', bold: true }, 'Inmutable, registra acci\u00F3n/IP/user-agent/timestamp.']),
      richBullet([{ text: 'Limitaci\u00F3n: ', bold: true }, 'Requiere Node persistente (VPS/Railway/Fly.io). En Vercel solo lee estado cacheado.']),

      heading2('4.3 CPM de referencia por plataforma'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2400, 3480, 3480],
        rows: [
          makeHeaderRow(['Plataforma', 'CPM (EUR/1.000 views)', 'Precio m\u00EDnimo (EUR)'], [2400, 3480, 3480]),
          makeRow(['Newsletter', '20', '80'], [2400, 3480, 3480]),
          makeRow(['Instagram', '15', '80'], [2400, 3480, 3480]),
          makeRow(['WhatsApp', '12', '60'], [2400, 3480, 3480]),
          makeRow(['Facebook', '10', '40'], [2400, 3480, 3480]),
          makeRow(['Telegram', '8', '50'], [2400, 3480, 3480]),
          makeRow(['Discord', '5', '30'], [2400, 3480, 3480]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 5. API REFERENCE
      // ═══════════════════════════════════════════════════════
      heading1('5. API Reference \u2014 Endpoints auditados'),
      para('Base URL: /api  \u00B7  Auth usuarios: Bearer JWT  \u00B7  Auth partners: X-Partner-Key + HMAC SHA-256'),

      heading2('Autenticaci\u00F3n y registro'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 3200, 5260],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 3200, 5260]),
          makeRow(['POST', '/api/auth/registro', 'Registro (creator/advertiser) \u2014 incluye referralCode y tipoPerfil'], [900, 3200, 5260]),
          makeRow(['POST', '/api/auth/login', 'JWT access + refresh'], [900, 3200, 5260]),
          makeRow(['POST', '/api/auth/google', 'Google Sign-In \u2014 login/registro one-click (20 req/15min)'], [900, 3200, 5260]),
          makeRow(['POST', '/api/auth/refresh-token', 'Renueva access token'], [900, 3200, 5260]),
          makeRow(['GET', '/api/auth/perfil', 'Perfil \u2014 incluye betaAccess, campaignCredits, tipoPerfil'], [900, 3200, 5260]),
          makeRow(['GET', '/api/auth/verificar-email/:token', 'Verificaci\u00F3n \u2014 devuelve JWT fresco'], [900, 3200, 5260]),
          makeRow(['POST', '/api/auth/reenviar-verificacion', 'Rate-limited: 3 req/5min'], [900, 3200, 5260]),
          makeRow(['POST', '/api/auth/cambiar-password', 'Autenticado'], [900, 3200, 5260]),
        ]
      }),

      heading2('Canales'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 3800, 4660],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 3800, 4660]),
          makeRow(['GET', '/api/channels', 'Marketplace p\u00FAblico \u2014 filtros, paginaci\u00F3n, b\u00FAsqueda'], [900, 3800, 4660]),
          makeRow(['GET', '/api/channels/rankings', 'Leaderboard por categor\u00EDa + delta badges'], [900, 3800, 4660]),
          makeRow(['GET', '/api/channels/:id', 'Detalle de canal'], [900, 3800, 4660]),
          makeRow(['GET', '/api/channels/:id/intelligence', 'Perfil p\u00FAblico 90 d\u00EDas CAS \u2014 rate-limited, Edge cache'], [900, 3800, 4660]),
          makeRow(['GET', '/api/channels/:id/snapshots', 'Historial de snapshots con LinkedIn intel'], [900, 3800, 4660]),
          makeRow(['POST', '/api/canales', 'Crear canal (creator autenticado)'], [900, 3800, 4660]),
          makeRow(['POST', '/api/canales/:id/claim/init', 'Iniciar claim \u2014 genera token de verificaci\u00F3n'], [900, 3800, 4660]),
          makeRow(['POST', '/api/canales/:id/claim/verify', 'Verificar claim v\u00EDa MTProto (lee descripci\u00F3n)'], [900, 3800, 4660]),
          makeRow(['GET', '/api/canales/claimed/mine', 'Mis canales reclamados'], [900, 3800, 4660]),
        ]
      }),

      heading2('Campa\u00F1as'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 3800, 4660],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 3800, 4660]),
          makeRow(['GET', '/api/campaigns', 'Mis campa\u00F1as'], [900, 3800, 4660]),
          makeRow(['POST', '/api/campaigns', 'Crear campa\u00F1a (DRAFT) + tracking link format'], [900, 3800, 4660]),
          makeRow(['PUT', '/api/campaigns/:id/confirm', 'Confirmar pago \u2014 server-side pricing + cr\u00E9ditos + calendario'], [900, 3800, 4660]),
          makeRow(['PUT', '/api/campaigns/:id/publish', 'Publicar (PAID \u2192 PUBLISHED) \u2014 creator'], [900, 3800, 4660]),
          makeRow(['PUT', '/api/campaigns/:id/complete', 'Completar \u2192 libera escrow + recalcula CAS'], [900, 3800, 4660]),
          makeRow(['PUT', '/api/campaigns/:id/cancel', 'Cancelar campa\u00F1a'], [900, 3800, 4660]),
          makeRow(['POST', '/api/campaigns/:id/chat', 'Chat moderado (filtro + rate limit 3s/60h)'], [900, 3800, 4660]),
        ]
      }),

      heading2('Tracking'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 3800, 4660],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 3800, 4660]),
          makeRow(['POST', '/api/tracking/links', 'Crear link trackeable (3 formatos)'], [900, 3800, 4660]),
          makeRow(['GET', '/api/tracking/links/:id/analytics', 'Analytics detallados'], [900, 3800, 4660]),
          makeRow(['GET', '/t/:code', 'Redirect short hash'], [900, 3800, 4660]),
          makeRow(['GET', '/r/:code', 'Redirect custom slug'], [900, 3800, 4660]),
          makeRow(['GET', '/go/*', 'Redirect domain visible'], [900, 3800, 4660]),
        ]
      }),

      heading2('WhatsApp Baileys'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 3800, 4660],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 3800, 4660]),
          makeRow(['POST', '/api/baileys/link', 'Iniciar sesi\u00F3n QR (10/hora)'], [900, 3800, 4660]),
          makeRow(['GET', '/api/baileys/session', 'Estado de sesi\u00F3n actual'], [900, 3800, 4660]),
          makeRow(['GET', '/api/baileys/newsletters', 'Newsletters descubiertos'], [900, 3800, 4660]),
          makeRow(['POST', '/api/baileys/link-canal', 'Vincular newsletter a Canal'], [900, 3800, 4660]),
          makeRow(['DELETE', '/api/baileys/session', 'Revocar sesi\u00F3n'], [900, 3800, 4660]),
          makeRow(['GET', '/api/baileys/audit-log', 'Audit log paginado'], [900, 3800, 4660]),
        ]
      }),

      heading2('Partner API \u2014 17 endpoints operativos'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 4400, 4060],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/auth', 'Auth SHA-256 \u2014 session token'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/health', 'Health check'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/channels', 'Listado canales con scores'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/channels/:id', 'Detalle canal'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/campaigns', 'Listado campa\u00F1as'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/campaigns', 'Crear campa\u00F1a'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/campaigns/:id', 'Detalle campa\u00F1a'], [900, 4400, 4060]),
          makeRow(['PUT', '/api/partners/campaigns/:id', 'Actualizar (solo DRAFT)'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/campaigns/:id/payment-session', 'Sesi\u00F3n de pago Stripe'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/campaigns/:id/confirm-payment', 'Confirmar pago'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/campaigns/:id/publish', 'Publicar'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/campaigns/:id/complete', 'Completar + liberar escrow'], [900, 4400, 4060]),
          makeRow(['POST', '/api/partners/campaigns/:id/cancel', 'Cancelar'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/campaigns/:id/metrics', 'M\u00E9tricas'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/stats', 'Agregados por periodo'], [900, 4400, 4060]),
          makeRow(['GET', '/api/partners/billing', 'Historial transacciones + balance'], [900, 4400, 4060]),
        ]
      }),

      heading2('Admin Dashboard'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [900, 3800, 4660],
        rows: [
          makeHeaderRow(['M\u00E9todo', 'Ruta', 'Descripci\u00F3n'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/overview', 'KPIs globales: users, channels, campaigns, revenue'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/users', 'Lista usuarios con search/filter/ban'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/channels', 'Canales con CAS scores'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/campaigns', 'Gesti\u00F3n de campa\u00F1as'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/disputes', 'Disputas + resoluci\u00F3n'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/finances', 'Revenue + transacciones'], [900, 3800, 4660]),
          makeRow(['GET', '/api/admin/dashboard/scoring', 'Scoring logs + distribuci\u00F3n'], [900, 3800, 4660]),
          makeRow(['POST', '/api/admin/scoring/run', 'Ejecuta scoring v2 (cron 03:00 UTC)'], [900, 3800, 4660]),
          makeRow(['POST', '/api/admin/metrics/capture', 'Captura snapshots (cron 03:30 UTC)'], [900, 3800, 4660]),
        ]
      }),

      heading2('Otros grupos de endpoints'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          makeHeaderRow(['Ruta', 'Descripci\u00F3n'], [3000, 6360]),
          makeRow(['/api/disputes', 'Abrir, mensajes, resoluci\u00F3n admin'], [3000, 6360]),
          makeRow(['/api/lists', 'CRUD listas de favoritos'], [3000, 6360]),
          makeRow(['/api/autobuy', 'Reglas de compra autom\u00E1tica'], [3000, 6360]),
          makeRow(['/api/transacciones', 'Historial de pagos, reembolsos, comisiones'], [3000, 6360]),
          makeRow(['/api/estadisticas', 'KPIs de dashboard (advertiser y creator)'], [3000, 6360]),
          makeRow(['/api/notifications', 'Notificaciones in-app (CRUD, marcar le\u00EDdas)'], [3000, 6360]),
          makeRow(['/api/files', 'Upload/download (Multer + Sharp)'], [3000, 6360]),
          makeRow(['/api/niche/:nicho/stats|trends', 'Niche Intelligence (stats + trends 30d/90d)'], [3000, 6360]),
          makeRow(['/api/oauth/linkedin/*', 'LinkedIn OAuth callback + token exchange'], [3000, 6360]),
          makeRow(['/api/channel-candidates', 'Admin review de canales descubiertos'], [3000, 6360]),
          makeRow(['/api/reviews', 'Reviews y ratings de canales'], [3000, 6360]),
          makeRow(['/api/onboarding', 'Flujo de onboarding por plataforma'], [3000, 6360]),
          makeRow(['/health', 'Health check global'], [3000, 6360]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 6. COMMITS CLAVE
      // ═══════════════════════════════════════════════════════
      heading1('6. Historial de commits clave en producci\u00F3n'),
      para('Commits m\u00E1s significativos desplegados desde la v2.0 (10 abr):'),

      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [1200, 8160],
        rows: [
          makeHeaderRow(['Fecha', 'Commit + Impacto'], [1200, 8160]),
          makeRow(['16 abr', 'feat: publication calendar + chat moderation + purchase flow hardening'], [1200, 8160]),
          makeRow(['16 abr', 'feat: Google Sign-In (OAuth 2.0) for one-click login/register'], [1200, 8160]),
          makeRow(['16 abr', 'feat: WhatsApp channel linking via Baileys + scraping rotation system'], [1200, 8160]),
          makeRow(['16 abr', 'fix: SPA routing + self-contained email verification function'], [1200, 8160]),
          makeRow(['15 abr', 'fix: blog SEO \u2014 unblock 19 indexable HTMLs + CTR titles + HowTo schema'], [1200, 8160]),
          makeRow(['15 abr', 'feat: creator profile sub-type \u2014 individual vs agencia'], [1200, 8160]),
          makeRow(['15 abr', 'feat: LinkedIn monetization pipeline + newsletter discovery'], [1200, 8160]),
          makeRow(['15 abr', 'fix: scoring cron loops within Vercel 60s budget'], [1200, 8160]),
          makeRow(['14 abr', 'feat: admin dashboard routes, API service updates, layout improvements'], [1200, 8160]),
          makeRow(['14 abr', 'feat: creator dashboard redesign \u2014 Semrush-level, score consolidation'], [1200, 8160]),
          makeRow(['14 abr', 'fix: restore purple/green brand colors + PageSpeed optimizations'], [1200, 8160]),
          makeRow(['13 abr', 'feat: campaign analytics page \u2014 click timeline, device/geo/referrer breakdown'], [1200, 8160]),
          makeRow(['13 abr', 'feat: 3 tracking link formats \u2014 domain visible, custom slug, short hash'], [1200, 8160]),
          makeRow(['13 abr', 'feat: campaign creation flow \u2014 channel selection \u2192 content \u2192 submit'], [1200, 8160]),
          makeRow(['13 abr', 'feat: channel claim system \u2014 unclaimed \u2192 claimed via Telegram description'], [1200, 8160]),
          makeRow(['13 abr', 'feat: massive seed job \u2014 bulk channel discovery with 80+ keywords'], [1200, 8160]),
          makeRow(['13 abr', 'feat: replace TGStat API with 3 free discovery sources'], [1200, 8160]),
          makeRow(['13 abr', 'feat: light mode + rebuild channel/rankings/claim/admin pages'], [1200, 8160]),
          makeRow(['13 abr', 'feat: new design system + base components + explore page rebuild'], [1200, 8160]),
          makeRow(['13 abr', 'feat: NavBar redesign, landing accent update, SEO, massive seed done'], [1200, 8160]),
          makeRow(['12 abr', 'feat: channel intel pipeline, TGStat discovery, explore/rankings/profile/admin UI'], [1200, 8160]),
          makeRow(['11 abr', 'feat: blog interactive price calculator + income estimator page'], [1200, 8160]),
          makeRow(['11 abr', 'feat: comprehensive blog SEO overhaul + author branding'], [1200, 8160]),
          makeRow(['11 abr', 'fix: block dashboard until email verified + fix serverless email'], [1200, 8160]),
          makeRow(['11 abr', 'fix: referral code collision + campaign credits double-spend'], [1200, 8160]),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 7. ROADMAP
      // ═══════════════════════════════════════════════════════
      heading1('7. Roadmap de producto \u2014 Estado real'),

      heading2('7.1 Completado y en producci\u00F3n'),

      // Backend core
      heading3('Backend core'),
      bulletItem('Backend REST API completo \u2014 32 archivos de rutas, 25 controladores, 42 servicios', 'roadmap-done'),
      bulletItem('Autenticaci\u00F3n JWT (access 15m + refresh 7d) + verificaci\u00F3n email + Google OAuth 2.0', 'roadmap-done'),
      bulletItem('32 modelos Mongoose \u2014 incluyendo BaileysSession, ChannelCandidate, ScrapingRotation, etc.', 'roadmap-done'),
      bulletItem('Sistema de pagos Stripe \u2014 checkout, escrow PaymentIntents, captura diferida, cr\u00E9ditos de campa\u00F1a', 'roadmap-done'),
      bulletItem('Ciclo de campa\u00F1a completo: DRAFT \u2192 PAID \u2192 PUBLISHED \u2192 COMPLETED (+ EXPIRED, DISPUTED, CANCELLED)', 'roadmap-done'),
      bulletItem('Cron diario: scoring 03:00 UTC + snapshot capture 03:30 UTC', 'roadmap-done'),

      // Scoring & Intelligence
      heading3('Scoring & Intelligence'),
      bulletItem('Scoring Engine v2.0 \u2014 funci\u00F3n pura, CAS, CAF, CTF, CER, CVS, CAP, CPMDinamico', 'roadmap-done'),
      bulletItem('CanalScoreSnapshot \u2014 90 d\u00EDas historial, sin TTL, version:2', 'roadmap-done'),
      bulletItem('CampaignMetricsV2 \u2014 snapshots 1h/6h/24h/72h/7d con detecci\u00F3n de fraude', 'roadmap-done'),
      bulletItem('Public Intelligence API \u2014 /api/channels/:id/intelligence, privacy guard, Edge cache', 'roadmap-done'),
      bulletItem('Rankings por categor\u00EDa + delta badges + Niche Intelligence (trends 30d/90d)', 'roadmap-done'),

      // Discovery
      heading3('Channel Discovery'),
      bulletItem('7 scrapers con rotaci\u00F3n de 115+ keywords en 7 verticales', 'roadmap-done'),
      bulletItem('Massive seed job: 3 fases (keywords + social graph + m\u00E9tricas)', 'roadmap-done'),
      bulletItem('Channel claim v\u00EDa token en descripci\u00F3n de Telegram (MTProto)', 'roadmap-done'),
      bulletItem('SeenChannel dedup con TTL diferenciado por raz\u00F3n de filtrado', 'roadmap-done'),

      // Integrations
      heading3('Integraciones'),
      bulletItem('Partner API completa \u2014 17 endpoints, auth SHA-256, rate limit por partner (Getalink)', 'roadmap-done'),
      bulletItem('Staging para Getalink \u2014 channelad-staging.vercel.app, BD separada', 'roadmap-done'),
      bulletItem('Google Sign-In (OAuth 2.0) \u2014 one-click login/register, skip email verification', 'roadmap-done'),
      bulletItem('WhatsApp Baileys \u2014 QR link, newsletters, audit log (requiere VPS)', 'roadmap-done'),
      bulletItem('LinkedIn monetization pipeline \u2014 OAuth + m\u00E9tricas + newsletter discovery (486 seeds)', 'roadmap-done'),
      bulletItem('WhatsApp OCR verification \u2014 Tesseract.js con swap path Cloud Vision', 'roadmap-done'),

      // UI & UX
      heading3('UI & UX'),
      bulletItem('Light mode + design system: CSS variables, tokens sem\u00E1nticos, DM Sans + JetBrains Mono', 'roadmap-done'),
      bulletItem('79 p\u00E1ginas React + 39 componentes (10 scoring, 11 landing, 16 base, 2 shared)', 'roadmap-done'),
      bulletItem('Admin dashboard completo: 7 p\u00E1ginas (overview, users, channels, campaigns, disputes, finances, scoring)', 'roadmap-done'),
      bulletItem('Creator dashboard redise\u00F1o Semrush: analytics, earnings, channels, requests con chat moderado', 'roadmap-done'),
      bulletItem('Flujo creaci\u00F3n campa\u00F1a: wizard 3 pasos + calendario interactivo + 3 formatos tracking link', 'roadmap-done'),
      bulletItem('Campaign Analytics: timeline clics, breakdown dispositivo/geo/referrer', 'roadmap-done'),
      bulletItem('Canal Explorer con CAS gauge, breakdown, benchmarks, historial 90d', 'roadmap-done'),
      bulletItem('Creator sub-types: individual vs agencia (modelo + UI)', 'roadmap-done'),
      bulletItem('Anonimizaci\u00F3n de canal para usuarios no autenticados', 'roadmap-done'),

      // Otros
      heading3('Marketing & Compliance'),
      bulletItem('Blog SEO: 19 HTMLs indexables + calculadora + FAQPage + HowTo schema + sitemap 29 URLs', 'roadmap-done'),
      bulletItem('Sistema de referidos + \u20AC10 cr\u00E9ditos por invitaci\u00F3n + beta access flag', 'roadmap-done'),
      bulletItem('Email automation: bienvenida con referral, recordatorio 48h, match campa\u00F1a', 'roadmap-done'),
      bulletItem('Pol\u00EDtica de Privacidad + Data Processing Page (RGPD arts. 13/14)', 'roadmap-done'),
      bulletItem('CI/CD GitHub Actions + Jest tests \u2014 0 regresiones', 'roadmap-done'),
      bulletItem('Chat moderation: filtro email/tel/URL/crypto/tarjetas + rate limit', 'roadmap-done'),

      heading2('7.2 Pr\u00F3ximas iteraciones \u2014 Pendiente'),
      richBullet([{ text: '\uD83D\uDD34 ', color: RED_TXT }, { text: 'Generar y entregar API keys SHA-256 a Getalink', bold: true }, ' (desbloqueado desde el staging live)'], 'roadmap-pending'),
      richBullet([{ text: '\uD83D\uDD34 ', color: RED_TXT }, { text: 'Test E2E con Getalink en staging', bold: true }, ' \u2014 previo a firma del contrato'], 'roadmap-pending'),
      richBullet([{ text: '\uD83D\uDFE1 ', color: YELLOW_TXT }, { text: 'Firmar contrato Getalink', bold: true }, ' (4 Anexos redactados: SLA, GDPR/DPA, definiciones, comisiones)'], 'roadmap-pending'),
      richBullet([{ text: '\uD83D\uDFE1 ', color: YELLOW_TXT }, { text: 'Documentaci\u00F3n Swagger/OpenAPI', bold: true }, ' completa del Partner API'], 'roadmap-pending'),
      richBullet([{ text: '\uD83D\uDFE1 ', color: YELLOW_TXT }, { text: '\u00CDndice MongoDB: { categoria: 1, CAS: 1 }', bold: true }, ' \u2014 necesario para posici\u00F3n en nicho'], 'roadmap-pending'),
      richBullet([{ text: '\uD83D\uDFE1 ', color: YELLOW_TXT }, { text: 'Panel admin avanzado', bold: true }, ' \u2014 moderaci\u00F3n de canales, m\u00E9tricas globales'], 'roadmap-pending'),
      richBullet([{ text: '\uD83D\uDFE1 ', color: YELLOW_TXT }, { text: 'Analytics avanzados', bold: true }, ' \u2014 reportes exportables CSV/PDF'], 'roadmap-pending'),
      bulletItem('Bots nativos Telegram y Discord para publicaci\u00F3n automatizada', 'roadmap-pending'),
      bulletItem('WhatsApp Business API \u2014 integraci\u00F3n real con env\u00EDo', 'roadmap-pending'),
      bulletItem('Meta Graph API \u2014 Instagram Broadcasts integraci\u00F3n', 'roadmap-pending'),
      bulletItem('Sistema de reviews y ratings para canales', 'roadmap-pending'),
      bulletItem('PWA con notificaciones push nativas', 'roadmap-pending'),
      bulletItem('Primeras campa\u00F1as reales \u2014 necesario para GMV antes de inversores', 'roadmap-pending'),
      bulletItem('Identificar partners API 2 y 3 \u2014 narrativa inversora', 'roadmap-pending'),
      bulletItem('Product Hunt launch', 'roadmap-pending'),

      heading2('7.3 Mantenimiento continuo'),
      bulletItem('Crons Vercel: scoring 03:00 UTC + snapshot capture 03:30 UTC. Para granularidad horaria: GitHub Actions o cron-job.org con CRON_SECRET.', 'maint'),
      bulletItem('CI/CD GitHub Actions \u2014 jest smoke + integraci\u00F3n en cada push a main', 'maint'),
      bulletItem('Monitorizaci\u00F3n de errores en producci\u00F3n (logs Winston / Vercel dashboard)', 'maint'),
      bulletItem('Webhooks Stripe: confirmaci\u00F3n de pagos, fallos, reembolsos', 'maint'),
      bulletItem('Audit log del Partner API \u2014 revisar con cada nueva integraci\u00F3n', 'maint'),
      bulletItem('Rate limiting por partner \u2014 ajustar seg\u00FAn SLA', 'maint'),
      bulletItem('Migraciones MongoDB al a\u00F1adir campos de schema', 'maint'),
      bulletItem('npm audit \u2014 especial atenci\u00F3n a Stripe SDK y dependencias de seguridad', 'maint'),
      bulletItem('Backup MongoDB Atlas \u2014 pol\u00EDtica de retenci\u00F3n de snapshots', 'maint'),
      bulletItem('GDPR compliance \u2014 registro de tratamientos antes del primer usuario real', 'maint'),
      bulletItem('Art\u00EDculos blog \u2014 publicaci\u00F3n escalonada hasta mayo 2026, luego nuevo ciclo', 'maint'),
      bulletItem('WhatsApp Baileys sessions \u2014 monitorizar reconexiones y expirations', 'maint'),
      bulletItem('Scraping rotation \u2014 a\u00F1adir keywords nuevos, verificar dedup TTLs', 'maint'),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════
      // 8. ENTORNO DE DESARROLLO
      // ═══════════════════════════════════════════════════════
      heading1('8. Entorno de desarrollo'),

      heading2('Quick start'),
      codeBlock('git clone git@github.com:xipol1/ADFLOW.git && cd ADFLOW'),
      codeBlock('npm install'),
      codeBlock('cp .env.example .env   # Editar MONGODB_URI, JWT_SECRET, STRIPE_*'),
      codeBlock('npm run dev:full        # Backend :5000 + Frontend :3000 en paralelo'),
      codeBlock('npm test                # Jest tests (smoke + integraci\u00F3n)'),

      heading2('Variables de entorno'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [3400, 5960],
        rows: [
          makeHeaderRow(['Variable', 'Descripci\u00F3n'], [3400, 5960]),
          makeRow(['MONGODB_URI', 'URI Atlas (prod: channelad, staging: channelad_staging)'], [3400, 5960]),
          makeRow(['JWT_SECRET', 'M\u00EDnimo 32 chars \u2014 access token'], [3400, 5960]),
          makeRow(['JWT_REFRESH_SECRET', 'M\u00EDnimo 32 chars \u2014 refresh token'], [3400, 5960]),
          makeRow(['STRIPE_SECRET_KEY', 'sk_test_... para desarrollo'], [3400, 5960]),
          makeRow(['STRIPE_PUBLISHABLE_KEY', 'pk_test_... para desarrollo'], [3400, 5960]),
          makeRow(['PLATFORM_COMMISSION_RATE', '0.10 (10%)'], [3400, 5960]),
          makeRow(['FRONTEND_URL', 'http://localhost:3000 en desarrollo'], [3400, 5960]),
          makeRow(['CRON_SECRET', 'Header seguridad para /api/admin/scoring/run y /api/admin/metrics/capture'], [3400, 5960]),
          makeRow(['GOOGLE_CLIENT_ID', 'Google OAuth 2.0 \u2014 backend validation'], [3400, 5960]),
          makeRow(['VITE_GOOGLE_CLIENT_ID', 'Google OAuth 2.0 \u2014 frontend button (si no presente, bot\u00F3n oculto)'], [3400, 5960]),
          makeRow(['LINKEDIN_CLIENT_ID', 'LinkedIn OAuth 2.0 \u2014 metrics pipeline'], [3400, 5960]),
          makeRow(['LINKEDIN_CLIENT_SECRET', 'LinkedIn OAuth 2.0 \u2014 metrics pipeline'], [3400, 5960]),
          makeRow(['META_APP_ID', 'Meta OAuth 2.0 \u2014 Facebook/Instagram/WhatsApp'], [3400, 5960]),
          makeRow(['META_APP_SECRET', 'Meta OAuth 2.0 \u2014 Facebook/Instagram/WhatsApp'], [3400, 5960]),
          makeRow(['ENCRYPTION_KEY', 'AES-256 \u2014 exactamente 32 caracteres \u2014 Baileys credentials'], [3400, 5960]),
          makeRow(['TELEGRAM_API_ID', 'MTProto API \u2014 channel intel + claim verification'], [3400, 5960]),
          makeRow(['TELEGRAM_API_HASH', 'MTProto API \u2014 channel intel + claim verification'], [3400, 5960]),
          makeRow(['NODEMAILER_* / SMTP_*', 'Credenciales Hostinger (producci\u00F3n usa SMTP real)'], [3400, 5960]),
        ]
      }),

      heading2('Usuarios de prueba (seed con betaAccess: true)'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2000, 4360, 3000],
        rows: [
          makeHeaderRow(['Rol', 'Email', 'Password'], [2000, 4360, 3000]),
          makeRow(['Admin', 'admin@adflow.com', 'Admin2026x'], [2000, 4360, 3000]),
          makeRow(['Creator', 'creator@adflow.com', 'Creator2026x'], [2000, 4360, 3000]),
          makeRow(['Advertiser', 'advertiser@adflow.com', 'Advert2026x'], [2000, 4360, 3000]),
        ]
      }),

      heading2('Scripts disponibles'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          makeHeaderRow(['Comando', 'Descripci\u00F3n'], [3000, 6360]),
          makeRow(['npm start', 'Producci\u00F3n: node server.js'], [3000, 6360]),
          makeRow(['npm run dev', 'Desarrollo backend: nodemon server.js'], [3000, 6360]),
          makeRow(['npm run frontend:dev', 'Vite dev server (HMR)'], [3000, 6360]),
          makeRow(['npm run dev:full', 'Backend + frontend en paralelo'], [3000, 6360]),
          makeRow(['npm run build', 'Build frontend (Vite \u2192 dist/)'], [3000, 6360]),
          makeRow(['npm test', 'Jest tests (smoke + integraci\u00F3n)'], [3000, 6360]),
          makeRow(['npm run lint', 'ESLint check'], [3000, 6360]),
          makeRow(['npm run migrate:roles', 'Migraci\u00F3n de roles en DB'], [3000, 6360]),
        ]
      }),

      heading2('Repos y proyectos Vercel relevantes'),
      new Table({
        width: { size: TABLE_WIDTH, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          makeHeaderRow(['Recurso', 'Detalle'], [2600, 6760]),
          makeRow(['GitHub repo', 'github.com/xipol1/ADFLOW (public) \u2014 rama main'], [2600, 6760]),
          makeRow(['Producci\u00F3n', 'adflow-unified.vercel.app \u2014 prj_55GJaPy2JCB8jom1nMCcC3BF3uuj'], [2600, 6760]),
          makeRow(['Staging Getalink', 'channelad-staging.vercel.app \u2014 prj_E9wzrr7FEOVEY8ljSdpTWcKsmHnL'], [2600, 6760]),
          makeRow(['CAS Simulator', 'cas-simulator (Vercel) \u2014 prj_oBptF28h4ZBVn64hrD7w5KDWlvII'], [2600, 6760]),
          makeRow(['Notion HQ', 'ChannelAd HQ \u2014 33bad1cfb6df8162b030c8da4e5687f4'], [2600, 6760]),
        ]
      }),

      // Final line
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [
          new TextRun({ text: 'ChannelAd \u2014 channelad.io \u2014 Documento confidencial \u2014 Uso interno \u2014 Auditado 16 abr 2026', size: 18, font: 'Arial', color: GRAY, italics: true })
        ]
      }),

    ] // end children
  }] // end sections
});

// Write to file
const OUTPUT = 'C:/Users/win/Desktop/Adflow Gestion/ChannelAd_TechnicalBriefing_Devs_v3.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`Written to ${OUTPUT} (${(buffer.length / 1024).toFixed(0)} KB)`);
});
