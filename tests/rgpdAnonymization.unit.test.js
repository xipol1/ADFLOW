// SPEC-B1 T014 — unit tests del anonymizationService (User Story 1).
// Escritos ANTES de T015 (AccountDeletionRequest), T016 (ReservedSlug) y
// T017 (anonymizationService). El spec exige TDD aquí: este archivo DEBE
// fallar al cargarse mientras `services/anonymizationService.js` no exista.
// Por eso NO se protege con try/catch sobre los requires — el error de
// "Cannot find module" es la condición de éxito de esta sesión TDD.
//
// Cubre los 5 bloques que tasks.md exige para T014:
//   (a) Las 6 categorías de PII de FR-009 sobreescritas correctamente.
//   (b) `referredBy` preservado en ambos sentidos.
//   (c) Tracking* records anonimizados (IP/UA/fingerprint neutros).
//   (d) Test forense — queries operativas no devuelven PII original (SC-004).
//   (e) FR-010 — Factura/Transaccion/Retiro preservados intactos.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.RGPD_TOKEN_SECRET = process.env.RGPD_TOKEN_SECRET || 'test-rgpd-token-secret';

const mongoose = require('mongoose');
const { useMongo } = require('./helpers/useMongo');

const Usuario = require('../models/Usuario');
const Tracking = require('../models/Tracking');
const TrackingFingerprint = require('../models/TrackingFingerprint');
const TrackingLink = require('../models/TrackingLink');
const Notificacion = require('../models/Notificacion');
const Factura = require('../models/Factura');
const Transaccion = require('../models/Transaccion');
const Retiro = require('../models/Retiro');

// Service aún no implementado (T017). Importarlo aquí garantiza que Jest
// falle al cargar este archivo si el módulo no existe — la prueba de que
// el TDD está pendiente de implementación, no de que haya un bug.
const anonymizationService = require('../services/anonymizationService');

// Datos PII representativos para poblar y luego verificar que han desaparecido.
function buildPiiPayload(suffix) {
  return {
    email: `victima-${suffix}@example.com`,
    password: 'hashed-not-real-password',
    nombre: 'Lucía',
    apellido: 'García Pérez',
    telegramUserId: `tg-${suffix}`,
    googleId: `gid-${suffix}`,
    channelUsername: `canal-${suffix}`,
    botVerified: true,
    twoFactorEnabled: true,
    twoFactorSecret: 'TOTP-SECRET-XYZ',
    twoFactorBackupCodes: ['code-1', 'code-2'],
    emailVerificationToken: 'ev-token',
    passwordResetToken: 'pr-token',
    pushSubscriptions: [{ endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } }],
    sesiones: [{
      tokenHash: 'sess-hash',
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(Date.now() + 86400000),
      userAgent: 'Mozilla/5.0 sensitive UA',
      ip: '85.10.20.30',
    }],
    datosFacturacion: {
      razonSocial: 'Lucía García SL',
      nif: 'B12345678',
      direccion: 'Calle Privada 7',
      cp: '28001',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      pais: 'ES',
      emailFacturacion: `facturas-${suffix}@example.com`,
      esEmpresa: false,
    },
    referralCode: `REF-${suffix}`,
  };
}

async function createPiiUser(suffix, extra = {}) {
  return Usuario.create({ ...buildPiiPayload(suffix), ...extra });
}

describe('Anonymization service — T014 unit suite', () => {
  useMongo();

  beforeEach(async () => {
    // Limpia colecciones tocadas para que cada test sea independiente. No
    // borramos índices ni esquemas.
    if (mongoose.connection?.readyState !== 1) return;
    await Promise.all([
      Usuario.deleteMany({}),
      Tracking.deleteMany({}),
      TrackingFingerprint.deleteMany({}),
      TrackingLink.deleteMany({}),
      Notificacion.deleteMany({}),
      Factura.deleteMany({}),
      Transaccion.deleteMany({}),
      Retiro.deleteMany({}),
    ]);
  });

  // ── (a) FR-009 — 6 categorías de PII ──────────────────────────────────
  describe('(a) FR-009 — las 6 categorías de PII se sobreescriben', () => {
    test('categoría 1: identidad personal (nombre, apellido, email, password)', async () => {
      const u = await createPiiUser('cat1');
      const originalEmail = u.email;

      await anonymizationService.anonymizeUser(u._id);
      const after = await Usuario.findById(u._id).lean();

      expect(after).not.toBeNull();
      expect(after.email).not.toBe(originalEmail);
      // Mapeo PII (data-model E-5): email = deleted-{_id}@anonymized.local.
      expect(after.email).toBe(`deleted-${u._id.toString()}@anonymized.local`);
      expect(after.nombre).toBe('Usuario');
      expect(after.apellido).toBe('eliminado');
      // Password no debe quedar vacío (sigue siendo required) pero no
      // debe coincidir con el original.
      expect(after.password).toBeTruthy();
      expect(after.password).not.toBe('hashed-not-real-password');
    });

    test('categoría 2: identidad OAuth y terceros', async () => {
      const u = await createPiiUser('cat2');

      await anonymizationService.anonymizeUser(u._id);
      const after = await Usuario.findById(u._id).lean();

      expect(after.googleId).toBeNull();
      expect(after.telegramUserId).toBeNull();
      expect(after.channelUsername).toBeNull();
      expect(after.botVerified).toBe(false);
    });

    test('categoría 3: datos fiscales personales', async () => {
      const u = await createPiiUser('cat3');

      await anonymizationService.anonymizeUser(u._id);
      const after = await Usuario.findById(u._id).lean();

      // Valores objetivo según data-model E-5 "Mapeo PII".
      expect(after.datosFacturacion.razonSocial).toBe('(eliminado)');
      expect(after.datosFacturacion.nif).toBe('XXXXXXXXX');
      expect(after.datosFacturacion.direccion).toBe('(eliminado)');
      expect(after.datosFacturacion.cp).toBe('');
      expect(after.datosFacturacion.ciudad).toBe('');
      expect(after.datosFacturacion.provincia).toBe('');
      expect(after.datosFacturacion.emailFacturacion).toBe('');
    });

    test('categoría 4: datos de agencia (cuando aplica)', async () => {
      const u = await createPiiUser('cat4', {
        tipoPerfil: 'agencia',
        agencia: {
          nombre: 'Acme Agency',
          sitioWeb: 'https://acme.example',
          cifNif: 'B99999999',
          numClientesEstimados: 5,
          numCanalesGestionados: 7,
        },
      });

      await anonymizationService.anonymizeUser(u._id);
      const after = await Usuario.findById(u._id).lean();

      expect(after.agencia.nombre).toBe('(eliminado)');
      expect(after.agencia.sitioWeb).toBe('');
      expect(after.agencia.cifNif).toBe('XXXXXXXXX');
    });

    test('categoría 5: credenciales y secretos', async () => {
      const u = await createPiiUser('cat5');

      await anonymizationService.anonymizeUser(u._id);
      const after = await Usuario.findById(u._id).lean();

      expect(after.twoFactorEnabled).toBe(false);
      expect(after.twoFactorSecret).toBeNull();
      expect(Array.isArray(after.twoFactorBackupCodes)).toBe(true);
      expect(after.twoFactorBackupCodes.length).toBe(0);
      expect(after.emailVerificationToken).toBeNull();
      expect(after.passwordResetToken).toBeNull();
      expect(Array.isArray(after.sesiones)).toBe(true);
      expect(after.sesiones.length).toBe(0);
      expect(Array.isArray(after.pushSubscriptions)).toBe(true);
      expect(after.pushSubscriptions.length).toBe(0);
    });

    test('categoría 6: identificadores recuperables (referralCode liberado)', async () => {
      const u = await createPiiUser('cat6');

      await anonymizationService.anonymizeUser(u._id);
      const after = await Usuario.findById(u._id).lean();

      // referralCode se libera para re-uso → null tras anonimización.
      expect(after.referralCode).toBeNull();
      // deletionStatus marcado como terminal.
      expect(after.deletionStatus).toBe('anonymized');
      expect(after.anonymizedAt).toBeInstanceOf(Date);
      expect(after.activo).toBe(false);
    });
  });

  // ── (b) referredBy preservado en ambos sentidos ────────────────────────
  describe('(b) referredBy se preserva tras anonimización', () => {
    test('referredBy del usuario anonimizado sigue apuntando al referidor', async () => {
      const referidor = await createPiiUser('ref-B');
      const A = await createPiiUser('ref-A', { referredBy: referidor._id });

      await anonymizationService.anonymizeUser(A._id);
      const after = await Usuario.findById(A._id).lean();

      expect(after.referredBy).toBeTruthy();
      expect(String(after.referredBy)).toBe(String(referidor._id));
    });

    test('referredBy de un tercero que apuntaba al anonimizado no se rompe', async () => {
      const A = await createPiiUser('ref-A2');
      const C = await createPiiUser('ref-C', { referredBy: A._id });

      await anonymizationService.anonymizeUser(A._id);
      const cAfter = await Usuario.findById(C._id).lean();

      // La ref ObjectId sigue siendo el mismo _id. Solo cambia la PII
      // visible cuando se popula el usuario anonimizado.
      expect(cAfter.referredBy).toBeTruthy();
      expect(String(cAfter.referredBy)).toBe(String(A._id));

      // Y popular trae el documento anonimizado, no null.
      const cPopulated = await Usuario.findById(C._id).populate('referredBy').lean();
      expect(cPopulated.referredBy).toBeTruthy();
      expect(String(cPopulated.referredBy._id)).toBe(String(A._id));
      expect(cPopulated.referredBy.deletionStatus).toBe('anonymized');
      expect(cPopulated.referredBy.email).toBe(`deleted-${A._id.toString()}@anonymized.local`);
    });
  });

  // ── (c) Tracking* records anonimizados ─────────────────────────────────
  describe('(c) Tracking* records: IP/UA/fingerprint a valores neutros', () => {
    test('TrackingLink.clicks[] ve IP y userAgent sobreescritos', async () => {
      const u = await createPiiUser('trk-link');
      const link = await TrackingLink.create({
        code: 'aBc123X',
        targetUrl: 'https://channelad.test/landing',
        createdBy: u._id,
        type: 'campaign',
        clicks: [
          {
            ip: '85.10.20.30',
            userAgent: 'Mozilla/5.0 sensitive UA',
            referer: 'https://referrer.test',
            country: 'ES',
            city: 'Madrid',
          },
          {
            ip: '85.10.20.31',
            userAgent: 'Curl/8.0',
            country: 'ES',
          },
        ],
      });

      await anonymizationService.anonymizeUser(u._id);
      const after = await TrackingLink.findById(link._id).lean();

      expect(after).not.toBeNull();
      for (const click of after.clicks) {
        // Valor objetivo según data-model "Modelos adicionales tocados".
        expect(click.ip).toBe('0.0.0.0');
        expect(click.userAgent).toBe('(eliminado)');
      }
      // _seenIps no debe contener IPs originales.
      const seen = Array.isArray(after._seenIps) ? after._seenIps : [];
      expect(seen).not.toContain('85.10.20.30');
      expect(seen).not.toContain('85.10.20.31');
    });

    test('Tracking documents asociados al campaign del usuario quedan neutros', async () => {
      // Tracking se enlaza por `campaign`, no directamente por `usuarioId`.
      // El servicio puede anonimizar vía TrackingLink → campaign → Tracking,
      // o bien por la relación de creador de TrackingLink. Verificamos que
      // tras anonimización, ningún Tracking asociado al usuario contiene la
      // IP original.
      const u = await createPiiUser('trk-direct');
      const link = await TrackingLink.create({
        code: 'xYz789Q',
        targetUrl: 'https://channelad.test/x',
        createdBy: u._id,
        type: 'campaign',
      });
      const fakeCampaign = new mongoose.Types.ObjectId();
      // Asocia el link a una campaign sintética.
      await TrackingLink.updateOne({ _id: link._id }, { $set: { campaign: fakeCampaign } });
      await Tracking.create({
        campaign: fakeCampaign,
        ip: '203.0.113.7',
      });

      await anonymizationService.anonymizeUser(u._id);

      // Cualquier Tracking que el servicio considere asociado al usuario
      // debe haber perdido la IP original.
      const trackings = await Tracking.find({ campaign: fakeCampaign }).lean();
      for (const t of trackings) {
        expect(t.ip).not.toBe('203.0.113.7');
      }
    });

    test('TrackingFingerprint pierde el fingerprint asociado', async () => {
      const u = await createPiiUser('trk-fp');
      const link = await TrackingLink.create({
        code: 'fpAbCdE',
        targetUrl: 'https://channelad.test/fp',
        createdBy: u._id,
      });
      await TrackingFingerprint.create({
        trackingLinkId: link._id,
        fingerprint: 'a1b2c3d4e5f6a1b2c3d4',
      });

      await anonymizationService.anonymizeUser(u._id);

      // Tras anonimización, el fingerprint asociado al link del usuario
      // no debe seguir siendo el valor original (se sobreescribe o se
      // elimina; ambas opciones cumplen FR-009).
      const fps = await TrackingFingerprint.find({ trackingLinkId: link._id }).lean();
      for (const fp of fps) {
        expect(fp.fingerprint).not.toBe('a1b2c3d4e5f6a1b2c3d4');
      }
    });
  });

  // ── (d) Test forense — queries operativas no devuelven PII original ────
  describe('(d) SC-004 — queries operativas no devuelven PII original', () => {
    test('findById select(email nombre telefono) no contiene PII original', async () => {
      const u = await createPiiUser('forense-1');
      const originalEmail = u.email;
      const originalNombre = u.nombre;

      await anonymizationService.anonymizeUser(u._id);
      const projection = await Usuario
        .findById(u._id)
        .select('email nombre apellido')
        .lean();

      expect(projection).not.toBeNull();
      expect(projection.email).not.toBe(originalEmail);
      expect(projection.nombre).not.toBe(originalNombre);
      // Y no contiene la cadena PII original como subcadena.
      expect(String(projection.email)).not.toMatch(/victima-forense-1/);
      expect(String(projection.nombre)).not.toMatch(/Lucía/);
    });

    test('findOne({email: originalEmail}) devuelve null', async () => {
      const u = await createPiiUser('forense-2');
      const originalEmail = u.email;

      await anonymizationService.anonymizeUser(u._id);
      const found = await Usuario.findOne({ email: originalEmail }).lean();

      expect(found).toBeNull();
    });

    test('búsqueda full-text por nombre original devuelve array vacío', async () => {
      const u = await createPiiUser('forense-3');

      await anonymizationService.anonymizeUser(u._id);
      const matches = await Usuario.find({ nombre: /Lucía/i }).lean();

      // Si hay otros usuarios con ese nombre en otros tests el beforeEach
      // los habría limpiado. Aquí solo este usuario existía con ese nombre.
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
    });

    test('búsqueda por nif original devuelve array vacío', async () => {
      const u = await createPiiUser('forense-4');

      await anonymizationService.anonymizeUser(u._id);
      const matches = await Usuario.find({ 'datosFacturacion.nif': 'B12345678' }).lean();

      expect(matches.length).toBe(0);
    });

    test('búsqueda por telegramUserId original devuelve array vacío', async () => {
      const u = await createPiiUser('forense-5');

      await anonymizationService.anonymizeUser(u._id);
      const matches = await Usuario.find({ telegramUserId: 'tg-forense-5' }).lean();

      expect(matches.length).toBe(0);
    });
  });

  // ── (e) FR-010 — preservación de contabilidad ──────────────────────────
  describe('(e) FR-010 — Factura/Transaccion/Retiro preservados intactos', () => {
    test('Factura.find({usuario}) devuelve los N documentos con campos contables intactos', async () => {
      const u = await createPiiUser('cont-fact');

      const transaccion = await Transaccion.create({
        advertiser: u._id,
        amount: 121,
        tipo: 'pago',
        status: 'paid',
      });

      const datosSnapshot = {
        razonSocial: 'Lucía García SL',
        nif: 'B12345678',
        direccion: 'Calle Privada 7',
        cp: '28001',
        ciudad: 'Madrid',
        provincia: 'Madrid',
        pais: 'ES',
        emailFacturacion: 'facturas-cont-fact@example.com',
        esEmpresa: false,
      };
      const emisor = {
        razonSocial: 'MICHI SOLUCIONS SL',
        nif: 'B00000000',
        direccion: 'Avda. Falsa 1',
        cp: '08001',
        ciudad: 'Barcelona',
        provincia: 'Barcelona',
        pais: 'ES',
        emailFacturacion: 'facturas@channelad.test',
        esEmpresa: true,
      };
      const facturasCreadas = await Promise.all([1, 2, 3].map((n) => Factura.create({
        numero: `A-2026-${String(n).padStart(4, '0')}-${u._id.toString().slice(-4)}`,
        serie: 'A',
        anio: 2026,
        correlativo: n,
        tipo: 'emitida',
        transaccion: transaccion._id,
        usuario: u._id,
        datosEmisor: emisor,
        datosReceptor: datosSnapshot,
        lineas: [{ concepto: `Servicio ${n}`, cantidad: 1, precioUnitario: 100, importe: 100 }],
        base: 100,
        ivaRate: 0.21,
        iva: 21,
        total: 121,
        ivaTreatment: 'iva_normal',
        fechaEmision: new Date('2026-03-01'),
      })));

      await anonymizationService.anonymizeUser(u._id);

      const facturas = await Factura.find({ usuario: u._id }).lean();
      expect(facturas.length).toBe(facturasCreadas.length);

      for (const original of facturasCreadas) {
        const persisted = facturas.find((f) => String(f._id) === String(original._id));
        expect(persisted).toBeDefined();
        // Campos contables intactos (FR-010).
        expect(persisted.numero).toBe(original.numero);
        expect(persisted.total).toBe(121);
        expect(persisted.iva).toBe(21);
        expect(persisted.base).toBe(100);
        expect(persisted.ivaRate).toBe(0.21);
        expect(new Date(persisted.fechaEmision).toISOString())
          .toBe(new Date('2026-03-01').toISOString());
        expect(Array.isArray(persisted.lineas)).toBe(true);
        expect(persisted.lineas.length).toBe(1);
        expect(persisted.lineas[0].concepto).toMatch(/^Servicio /);
        expect(persisted.lineas[0].importe).toBe(100);
      }
    });

    test('Transaccion.find({advertiser}) preserva amount/tipo/status', async () => {
      const u = await createPiiUser('cont-trans');
      const transCreadas = await Promise.all([
        Transaccion.create({ advertiser: u._id, amount: 50, tipo: 'pago', status: 'paid' }),
        Transaccion.create({ advertiser: u._id, amount: 200, tipo: 'recarga', status: 'paid' }),
      ]);

      await anonymizationService.anonymizeUser(u._id);

      const trans = await Transaccion.find({ advertiser: u._id }).lean();
      expect(trans.length).toBe(transCreadas.length);
      for (const original of transCreadas) {
        const persisted = trans.find((t) => String(t._id) === String(original._id));
        expect(persisted).toBeDefined();
        expect(persisted.amount).toBe(original.amount);
        expect(persisted.tipo).toBe(original.tipo);
        expect(persisted.status).toBe(original.status);
      }
    });

    test('Retiro.find({creator}) preserva amount/method/status', async () => {
      const u = await createPiiUser('cont-retiro');
      const retCreados = await Promise.all([
        Retiro.create({ creator: u._id, amount: 80, method: 'bank', status: 'completed' }),
        Retiro.create({ creator: u._id, amount: 150, method: 'paypal', status: 'pending' }),
      ]);

      await anonymizationService.anonymizeUser(u._id);

      const retiros = await Retiro.find({ creator: u._id }).lean();
      expect(retiros.length).toBe(retCreados.length);
      for (const original of retCreados) {
        const persisted = retiros.find((r) => String(r._id) === String(original._id));
        expect(persisted).toBeDefined();
        expect(persisted.amount).toBe(original.amount);
        expect(persisted.method).toBe(original.method);
        expect(persisted.status).toBe(original.status);
      }
    });
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
  });
});
