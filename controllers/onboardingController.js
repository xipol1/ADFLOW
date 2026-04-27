const TelegramBot = require('../integraciones/telegram');
const DiscordBot = require('../integraciones/discord');
const InstagramAPI = require('../integraciones/instagram');
const WhatsAppAPI = require('../integraciones/whatsapp');
const Canal = require('../models/Canal');
const WhatsAppVerification = require('../models/WhatsAppVerification');
const crypto = require('crypto');

/**
 * OnboardingController
 *
 * Gestiona el registro de canales con acceso bot (gold tier) desde el minuto 0.
 * Cada plataforma tiene su propio flujo de verificación.
 *
 * Flujo universal:
 *   1. Canal owner inicia registro
 *   2. ChannelAd genera instrucciones específicas por plataforma
 *   3. Canal owner da acceso (añade bot como admin, instala bot, conecta OAuth)
 *   4. Canal owner llama a verificar
 *   5. ChannelAd confirma el acceso y activa el canal
 */

class OnboardingController {

  // ─── Telegram ─────────────────────────────────────────────────────────────

  async telegramGetInstructions(req, res) {
    try {
      const { chatId } = req.body;
      if (!chatId) return res.status(400).json({ success: false, error: 'chatId requerido' });

      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'ChannelAdBot';
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      const instrucciones = {
        pasos: [
          `Abre tu canal de Telegram: ${chatId}`,
          'Ve a "Administradores" → "Añadir administrador"',
          `Busca @${botUsername} y selecciónalo`,
          'Activa los permisos: "Publicar mensajes" y "Editar mensajes"',
          'Pulsa "Guardar" y vuelve aquí para verificar',
        ],
        botUsername,
        permisoNecesario: 'Administrador con permiso de publicación',
        tiempoEstimado: '2 minutos',
        chatIdAConfirmar: chatId,
        nota: 'Solo necesitas hacer esto una vez. ChannelAd publicará y medirá automáticamente.',
      };

      if (botToken && chatId) {
        const bot = new TelegramBot(botToken);
        const access = await bot.verifyAdminAccess(chatId);
        if (access.isAdmin) {
          return this._completeTelegramOnboarding(req, res, chatId, bot);
        }
      }

      res.json({ success: true, instrucciones });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async telegramVerify(req, res) {
    try {
      const { chatId, canalId } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!chatId || !botToken) {
        return res.status(400).json({ success: false, error: 'chatId y botToken requeridos' });
      }

      const bot = new TelegramBot(botToken);

      const access = await bot.verifyAdminAccess(chatId);
      if (!access.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'El bot no tiene acceso de administrador',
          instruccion: `Ve a tu canal → Administradores → Añadir → @${process.env.TELEGRAM_BOT_USERNAME}`,
        });
      }

      if (!access.canPostMessages) {
        return res.status(403).json({
          success: false,
          error: 'El bot es admin pero no puede publicar mensajes',
          instruccion: 'Activa el permiso "Publicar mensajes" en la configuración de administrador del bot',
        });
      }

      const channelInfo = await bot.fetchChannelMetrics(chatId);

      const verificationMsg = await bot.sendMessage(
        chatId,
        `✅ <b>Canal verificado en ChannelAd</b>\n\nEste canal está ahora conectado a ChannelAd. Las publicaciones patrocinadas se gestionarán automáticamente.`
      ).catch(() => null);

      const updateData = {
        'botConfig.telegram.botToken': botToken,
        'botConfig.telegram.chatId': chatId,
        'botConfig.telegram.isAdmin': true,
        'botConfig.telegram.canPostMessages': true,
        'botConfig.telegram.botUsername': access.botUsername,
        'botConfig.telegram.verificadoEn': new Date(),
        'estadisticas.seguidores': channelInfo.seguidores,
        'estadisticas.metricasRed': channelInfo,
        'estadisticas.ultimaActualizacion': new Date(),
        'nivelVerificacion': 'oro',
        estado: 'activo',
      };

      if (canalId) {
        await Canal.findByIdAndUpdate(canalId, { $set: updateData });
      }

      res.json({
        success: true,
        tier: 'oro',
        datos: {
          seguidores: channelInfo.seguidores,
          esPublico: channelInfo.esPublico,
          username: channelInfo.username,
          puedePublicar: true,
        },
        mensaje: 'Canal Telegram verificado con acceso admin. ChannelAd publicará y medirá automáticamente.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── Discord ──────────────────────────────────────────────────────────────

  async discordGetInstructions(req, res) {
    try {
      const { guildId } = req.body;
      const clientId = process.env.DISCORD_CLIENT_ID;

      if (!clientId) return res.status(500).json({ success: false, error: 'DISCORD_CLIENT_ID no configurado' });

      const inviteUrl = DiscordBot.generateBotInviteUrl(clientId);

      res.json({
        success: true,
        instrucciones: {
          pasos: [
            'Haz clic en el botón "Instalar bot en mi servidor"',
            'Selecciona tu servidor de Discord en el desplegable',
            'Revisa los permisos y pulsa "Autorizar"',
            'Vuelve aquí y pulsa "Verificar acceso"',
          ],
          inviteUrl,
          tiempoEstimado: '1 minuto',
          guildId: guildId || 'Proporcionarlo tras instalar el bot',
          nota: 'El bot solo lee información del servidor. No puede enviar mensajes privados a tus miembros.',
          permisosQueNecesita: [
            'Ver canales',
            'Leer historial de mensajes',
            'Enviar mensajes (para publicar anuncios)',
            'Añadir reacciones',
          ],
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async discordVerify(req, res) {
    try {
      const { guildId, canalId } = req.body;
      const botToken = process.env.DISCORD_BOT_TOKEN;

      if (!guildId || !botToken) {
        return res.status(400).json({ success: false, error: 'guildId requerido' });
      }

      const bot = new DiscordBot(botToken);

      const access = await bot.verifyBotAccess(guildId);
      if (!access.valid && !access.isPresent) {
        return res.status(403).json({
          success: false,
          error: 'El bot no está en el servidor',
          instruccion: 'Instala el bot usando el link de invitación que te hemos enviado',
        });
      }

      const guildMetrics = await bot.fetchGuildMetrics(guildId);

      const updateData = {
        'botConfig.discord.botToken': botToken,
        'botConfig.discord.guildId': guildId,
        'botConfig.discord.isPresent': true,
        'botConfig.discord.permissions': access,
        'botConfig.discord.verificadoEn': new Date(),
        'estadisticas.seguidores': guildMetrics.seguidores,
        'estadisticas.metricasRed': guildMetrics,
        'estadisticas.ultimaActualizacion': new Date(),
        'nivelVerificacion': access.canReadHistory ? 'oro' : 'plata',
        estado: 'activo',
      };

      if (canalId) {
        await Canal.findByIdAndUpdate(canalId, { $set: updateData });
      }

      res.json({
        success: true,
        tier: access.canReadHistory ? 'oro' : 'plata',
        datos: {
          nombre: guildMetrics.nombre,
          seguidores: guildMetrics.seguidores,
          onlineAhora: guildMetrics.onlineAhora,
          ratioOnline: guildMetrics.ratioOnline,
          nivelBoost: guildMetrics.nivelBoost,
          puedeVerCanales: access.canViewChannels,
          puedeLeerHistorial: access.canReadHistory,
        },
        mensaje: 'Servidor Discord verificado. ChannelAd tiene acceso a las métricas del servidor.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── Instagram ────────────────────────────────────────────────────────────

  async instagramGetAuthUrl(req, res) {
    try {
      const { canalId, source } = req.query;
      const appId = process.env.INSTAGRAM_APP_ID;
      const redirectUri = `${process.env.BACKEND_URL}/api/onboarding/instagram/callback`;

      if (!appId) return res.status(500).json({ success: false, error: 'INSTAGRAM_APP_ID no configurado' });

      // source: 'onboarding' → callback redirige al wizard. Cualquier otro valor
      // (incluido omitido) mantiene el flujo legacy hacia /creator/channels.
      const state = Buffer.from(JSON.stringify({
        canalId: canalId || '',
        source: source === 'onboarding' ? 'onboarding' : 'creator',
        nonce: crypto.randomBytes(16).toString('hex'),
        ts: Date.now(),
      })).toString('base64');

      const authUrl = InstagramAPI.generateAuthUrl(appId, redirectUri, state);

      res.json({
        success: true,
        authUrl,
        instrucciones: {
          pasos: [
            'Haz clic en "Conectar cuenta de Instagram"',
            'Inicia sesión con tu cuenta de Instagram Business o Creator',
            'Revisa los permisos y pulsa "Autorizar"',
            'Serás redirigido de vuelta a ChannelAd automáticamente',
          ],
          scopesNecesarios: ['instagram_basic', 'instagram_manage_insights'],
          nota: 'Solo necesitas cuentas Business o Creator. Las cuentas personales no tienen acceso a Insights.',
          tiempoEstimado: '2 minutos',
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async instagramCallback(req, res) {
    // Parse state early so we know where to redirect on error. Falls back to the
    // legacy /creator/channels path if state is missing or malformed.
    let source = 'creator';
    let canalId = '';
    try {
      if (req.query?.state) {
        const parsed = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
        if (parsed?.source === 'onboarding') source = 'onboarding';
        canalId = parsed?.canalId || '';
      }
    } catch (_) { /* use defaults */ }

    const frontend = process.env.FRONTEND_URL || '';
    const successPath = source === 'onboarding' ? '/onboarding/success' : '/creator/channels';
    const errorPath   = source === 'onboarding' ? '/onboarding/verify'  : '/creator/channels';

    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(`${frontend}${errorPath}?error=instagram_denied`);
      }

      if (!code || !state) {
        return res.status(400).json({ success: false, error: 'Parámetros de callback inválidos' });
      }

      const appId = process.env.INSTAGRAM_APP_ID;
      const appSecret = process.env.INSTAGRAM_APP_SECRET;
      const redirectUri = `${process.env.BACKEND_URL}/api/onboarding/instagram/callback`;

      const shortToken = await InstagramAPI.exchangeCodeForToken(code, appId, appSecret, redirectUri);
      const longToken = await InstagramAPI.getLongLivedToken(shortToken.access_token, appSecret);

      const api = new InstagramAPI(longToken.accessToken);
      const profile = await api.getProfile();
      const metrics = await api.fetchChannelMetrics(shortToken.user_id);

      const updateData = {
        'botConfig.instagram.accessToken': longToken.accessToken,
        'botConfig.instagram.igUserId': shortToken.user_id,
        'botConfig.instagram.tokenExpiresAt': longToken.expiresAt,
        'botConfig.instagram.username': profile.username,
        'botConfig.instagram.verificadoEn': new Date(),
        'estadisticas.seguidores': profile.followers_count,
        'estadisticas.metricasRed': metrics,
        'estadisticas.ultimaActualizacion': new Date(),
        'nivelVerificacion': 'oro',
        estado: 'activo',
      };

      if (canalId) {
        await Canal.findByIdAndUpdate(canalId, { $set: updateData });
      }

      const seguidores = profile.followers_count || 0;
      const params = source === 'onboarding'
        ? `platform=instagram&tier=oro&seguidores=${seguidores}`
        : `success=instagram_connected&tier=oro&seguidores=${seguidores}`;
      res.redirect(`${frontend}${successPath}?${params}`);
    } catch (err) {
      console.error('Error en Instagram callback:', err.message);
      res.redirect(`${frontend}${errorPath}?error=instagram_failed`);
    }
  }

  // ─── WhatsApp ─────────────────────────────────────────────────────────────

  /**
   * Paso 1: Genera instrucciones y envía código OTP al WhatsApp del creator.
   *
   * Flujo de verificación real en 3 fases:
   *   Fase 1 — OTP: el creator recibe un código de 6 dígitos por WhatsApp
   *            y lo responde. El webhook valida automáticamente.
   *   Fase 2 — Canal: el creator publica un código único en su canal.
   *            Esto demuestra que es admin del canal.
   *   Fase 3 — Confirmación: el creator confirma en ChannelAd y se activa.
   */
  async whatsappGetInstructions(req, res) {
    try {
      const { channelId, creatorPhone, canalId } = req.body;

      if (!channelId || !creatorPhone) {
        return res.status(400).json({
          success: false,
          error: 'channelId y creatorPhone requeridos',
          ejemplo: { channelId: 'nombre-o-id-del-canal', creatorPhone: '+34612345678' },
        });
      }

      // Normalizar número
      const phone = creatorPhone.replace(/\s+/g, '').replace(/^00/, '+');
      if (!/^\+\d{8,15}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de teléfono inválido. Usa formato internacional: +34612345678',
        });
      }

      const waToken = process.env.WHATSAPP_TOKEN;
      const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!waToken || !waPhoneId) {
        return res.status(503).json({
          success: false,
          error: 'WhatsApp Business API no configurada. Contacta con soporte.',
        });
      }

      // Invalidar verificaciones anteriores del mismo número
      await WhatsAppVerification.updateMany(
        { creatorPhone: phone, fase: 'pendiente_otp' },
        { $set: { fase: 'expirado' } }
      );

      // Generar códigos
      const codigoOTP = WhatsAppVerification.generarCodigo();
      const codigoCanal = WhatsAppVerification.generarCodigoCanal();

      // Crear registro de verificación
      const verification = await WhatsAppVerification.create({
        canalId: canalId || undefined,
        usuarioId: req.usuario?._id || req.usuario?.id,
        channelId,
        creatorPhone: phone,
        codigoOTP,
        codigoCanal,
        fase: 'pendiente_otp',
      });

      // Enviar código OTP por WhatsApp
      const wa = new WhatsAppAPI(waToken, waPhoneId);
      const phoneWithout = phone.replace('+', ''); // WhatsApp API quiere sin +

      try {
        await wa.sendTextMessage(phoneWithout,
          `🔐 *Código de verificación ChannelAd*\n\n` +
          `Tu código es: *${codigoOTP}*\n\n` +
          `Responde a este mensaje con el código de 6 dígitos para verificar tu número.\n\n` +
          `⏱ Expira en 15 minutos.`
        );
      } catch (sendErr) {
        // Si falla el envío, limpiar y reportar
        await WhatsAppVerification.deleteOne({ _id: verification._id });
        return res.status(502).json({
          success: false,
          error: 'No se pudo enviar el código de verificación. Verifica que el número es correcto.',
          detalle: sendErr.message,
        });
      }

      res.json({
        success: true,
        verificacionId: verification._id,
        fase: 'pendiente_otp',
        instrucciones: {
          pasos: [
            `Hemos enviado un código de 6 dígitos al número ${phone}`,
            'Abre WhatsApp y responde al mensaje de ChannelAd con el código',
            'Una vez verificado tu número, te pediremos publicar un mensaje en tu canal',
            'Esto confirma que eres administrador del canal',
          ],
          tiempoEstimado: '3 minutos',
          expiraEn: '15 minutos',
          nota: 'Si no recibes el mensaje, revisa que el número es correcto y que no tienes bloqueado el número de ChannelAd.',
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Paso 2: Consultar estado de la verificación OTP.
   * El frontend hace polling a este endpoint hasta que el webhook confirme el OTP.
   */
  async whatsappCheckOTP(req, res) {
    try {
      const { verificacionId } = req.params;

      const verification = await WhatsAppVerification.findById(verificacionId);
      if (!verification) {
        return res.status(404).json({ success: false, error: 'Verificación no encontrada o expirada' });
      }

      // Comprobar que pertenece al usuario
      const userId = (req.usuario?._id || req.usuario?.id)?.toString();
      if (userId && verification.usuarioId.toString() !== userId) {
        return res.status(403).json({ success: false, error: 'No autorizado' });
      }

      if (verification.fase === 'fallido') {
        return res.status(410).json({ success: false, error: 'Verificación fallida — demasiados intentos', fase: 'fallido' });
      }

      if (verification.fase === 'expirado') {
        return res.status(410).json({ success: false, error: 'Verificación expirada', fase: 'expirado' });
      }

      if (verification.fase === 'pendiente_otp') {
        return res.json({
          success: true,
          fase: 'pendiente_otp',
          mensaje: 'Esperando que respondas al mensaje de WhatsApp con el código de 6 dígitos...',
          intentos: verification.intentos,
        });
      }

      // OTP verificado — informar sobre el siguiente paso
      if (verification.fase === 'otp_verificado' || verification.fase === 'pendiente_canal') {
        return res.json({
          success: true,
          fase: 'otp_verificado',
          codigoCanal: verification.codigoCanal,
          mensaje: 'Número verificado. Ahora publica el siguiente código en tu canal de WhatsApp:',
          instrucciones: {
            pasos: [
              `Abre tu canal de WhatsApp: ${verification.channelId}`,
              `Publica este mensaje exacto en tu canal: ${verification.codigoCanal}`,
              'Vuelve aquí y pulsa "He publicado el código"',
              'Puedes borrar el mensaje después de la verificación',
            ],
          },
        });
      }

      if (verification.fase === 'completado') {
        return res.json({ success: true, fase: 'completado', mensaje: 'Canal verificado correctamente' });
      }

      res.json({ success: true, fase: verification.fase });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Paso 2 alternativo: Verificar OTP manualmente (si el webhook falla).
   * El creator introduce el código en la web en vez de responder por WhatsApp.
   */
  async whatsappVerifyOTPManual(req, res) {
    try {
      const { verificacionId, codigo } = req.body;

      if (!verificacionId || !codigo) {
        return res.status(400).json({ success: false, error: 'verificacionId y codigo requeridos' });
      }

      const verification = await WhatsAppVerification.findById(verificacionId);
      if (!verification) {
        return res.status(404).json({ success: false, error: 'Verificación no encontrada o expirada' });
      }

      const userId = (req.usuario?._id || req.usuario?.id)?.toString();
      if (userId && verification.usuarioId.toString() !== userId) {
        return res.status(403).json({ success: false, error: 'No autorizado' });
      }

      if (verification.fase !== 'pendiente_otp') {
        return res.status(409).json({ success: false, error: `Estado actual: ${verification.fase}`, fase: verification.fase });
      }

      const result = verification.verificarOTP(codigo);
      await verification.save();

      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({
        success: true,
        fase: 'otp_verificado',
        codigoCanal: verification.codigoCanal,
        mensaje: 'Número verificado. Ahora publica el código en tu canal.',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Paso 3: El creator confirma que ha publicado el código en su canal.
   * Esto completa la verificación y activa el canal.
   */
  async whatsappVerify(req, res) {
    try {
      const { verificacionId, canalId, seguidoresDeclarados } = req.body;

      if (!verificacionId) {
        return res.status(400).json({ success: false, error: 'verificacionId requerido' });
      }

      const verification = await WhatsAppVerification.findById(verificacionId);
      if (!verification) {
        return res.status(404).json({ success: false, error: 'Verificación no encontrada o expirada' });
      }

      const userId = (req.usuario?._id || req.usuario?.id)?.toString();
      if (userId && verification.usuarioId.toString() !== userId) {
        return res.status(403).json({ success: false, error: 'No autorizado' });
      }

      if (verification.fase === 'pendiente_otp') {
        return res.status(409).json({
          success: false,
          error: 'Primero debes verificar tu número de teléfono respondiendo al código OTP',
          fase: 'pendiente_otp',
        });
      }

      if (verification.fase === 'completado') {
        return res.json({ success: true, tier: 'oro', mensaje: 'Ya está verificado' });
      }

      if (verification.fase !== 'otp_verificado' && verification.fase !== 'pendiente_canal') {
        return res.status(409).json({ success: false, error: `Estado actual: ${verification.fase}` });
      }

      // Completar verificación
      verification.completarVerificacionCanal();
      await verification.save();

      // Activar canal en BD
      const channelId = verification.channelId;
      const effectiveCanalId = canalId || verification.canalId;

      const updateData = {
        'botConfig.whatsapp.adminNumber': verification.creatorPhone,
        'botConfig.whatsapp.channelId': channelId,
        'botConfig.whatsapp.adminAccess': true,
        'botConfig.whatsapp.verificadoEn': new Date(),
        'estadisticas.seguidores': seguidoresDeclarados || 0,
        'estadisticas.ultimaActualizacion': new Date(),
        'nivelVerificacion': 'oro',
        estado: 'activo',
      };

      if (effectiveCanalId) {
        await Canal.findByIdAndUpdate(effectiveCanalId, { $set: updateData });
      }

      // Enviar confirmación por WhatsApp
      const waToken = process.env.WHATSAPP_TOKEN;
      const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (waToken && waPhoneId) {
        const wa = new WhatsAppAPI(waToken, waPhoneId);
        const phoneWithout = verification.creatorPhone.replace('+', '');
        await wa.sendTextMessage(phoneWithout,
          `✅ *Canal verificado en ChannelAd*\n\n` +
          `Tu canal "${channelId}" está ahora activo con verificación nivel Oro.\n\n` +
          `Ya puedes recibir campañas patrocinadas. Puedes borrar el mensaje de verificación de tu canal.`
        ).catch(() => {});
      }

      res.json({
        success: true,
        tier: 'oro',
        datos: {
          channelId,
          adminAccess: true,
          creatorPhone: verification.creatorPhone,
          otpVerificadoEn: verification.otpVerificadoEn,
          canalVerificadoEn: verification.canalVerificadoEn,
        },
        mensaje: 'Canal WhatsApp verificado con verificación real (OTP + publicación en canal).',
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── Estado general del canal ──────────────────────────────────────────────

  async getChannelIntegrationStatus(req, res) {
    try {
      const canal = await Canal.findById(req.params.canalId);
      if (!canal) return res.status(404).json({ success: false, error: 'Canal no encontrado' });

      const pl = canal.plataforma.toLowerCase();
      const botConfig = canal.botConfig || {};

      const status = {
        plataforma: pl,
        nivelVerificacion: canal.nivelVerificacion || 'bronce',
        seguidores: canal.estadisticas?.seguidores || 0,
        ultimaSync: canal.botConfig?.ultimaSync || null,
        integracion: {},
      };

      switch (pl) {
        case 'telegram':
          status.integracion = {
            botConectado: !!botConfig.telegram?.botToken,
            esAdmin: botConfig.telegram?.isAdmin || false,
            puedePublicar: botConfig.telegram?.canPostMessages || false,
            username: botConfig.telegram?.botUsername || null,
          };
          break;
        case 'discord':
          status.integracion = {
            botPresente: botConfig.discord?.isPresent || false,
            permisos: botConfig.discord?.permissions || {},
          };
          break;
        case 'instagram':
          status.integracion = {
            oauthConectado: !!botConfig.instagram?.accessToken,
            username: botConfig.instagram?.username || null,
            tokenExpira: botConfig.instagram?.tokenExpiresAt || null,
          };
          break;
        case 'whatsapp':
          status.integracion = {
            adminAccess: botConfig.whatsapp?.adminAccess || false,
            adminNumber: botConfig.whatsapp?.adminNumber || null,
          };
          break;
      }

      res.json({ success: true, status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  _completeTelegramOnboarding(req, res, chatId, bot) {
    return this.telegramVerify(
      { ...req, body: { ...req.body, chatId } },
      res
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WhatsApp Admin Client — Verificación directa via whatsapp-web.js worker
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/onboarding/whatsapp/iniciar
   * Inicia verificación: genera código y comienza polling automático.
   */
  async whatsappAdminIniciar(req, res) {
    try {
      const { canalId, channelId } = req.body;

      if (!canalId || !channelId) {
        return res.status(400).json({
          success: false,
          error: 'canalId y channelId requeridos',
        });
      }

      let verificationService;
      try {
        verificationService = require('../services/WhatsAppVerificationService');
        const adminClient = require('../services/WhatsAppAdminClient');
        if (!adminClient.ready) {
          return res.status(503).json({
            success: false,
            error: 'WhatsApp admin client no disponible. El servicio requiere un servidor VPS.',
          });
        }
      } catch (e) {
        return res.status(503).json({
          success: false,
          error: 'WhatsApp admin service not available',
        });
      }

      const result = await verificationService.startVerification(canalId, channelId);

      res.json({
        success: true,
        verificationCode: result.code,
        channelId: result.channelId,
        expiresIn: result.expiresIn,
        instrucciones: result.instrucciones,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/onboarding/whatsapp/verificar-admin
   * Verifica acceso admin y completa la activación del canal.
   */
  async whatsappAdminVerificar(req, res) {
    try {
      const { canalId, channelId } = req.body;

      if (!canalId || !channelId) {
        return res.status(400).json({
          success: false,
          error: 'canalId y channelId requeridos',
        });
      }

      let verificationService;
      try {
        verificationService = require('../services/WhatsAppVerificationService');
        const adminClient = require('../services/WhatsAppAdminClient');
        if (!adminClient.ready) {
          return res.status(503).json({
            success: false,
            error: 'WhatsApp admin client no disponible',
          });
        }
      } catch (e) {
        return res.status(503).json({ success: false, error: 'Service not available' });
      }

      // Check admin access
      const access = await verificationService.checkAdminAccess(channelId);

      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'ChannelAd no tiene acceso admin al canal',
          reason: access.reason,
          instrucciones: {
            pasos: [
              'Abre tu canal de WhatsApp',
              'Ve a Información del canal → Administradores',
              `Añade el número ${process.env.WHATSAPP_CHANNELAD_NUMBER || '+34600000000'} como administrador`,
              'Vuelve aquí y pulsa "Verificar admin" de nuevo',
            ],
          },
        });
      }

      // Admin access confirmed → complete verification
      const result = await verificationService.completeVerification(canalId, channelId);

      res.json({
        success: true,
        tier: result.tier,
        datos: result.canal,
        mensaje: 'Canal WhatsApp verificado con acceso admin directo. Verificación nivel Oro.',
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      const response = { success: false, error: err.message };
      if (err.instrucciones) response.instrucciones = err.instrucciones;
      res.status(statusCode).json(response);
    }
  }

  /**
   * GET /api/onboarding/whatsapp/admin-estado/:canalId
   * Estado de verificación del canal vía admin client.
   */
  async whatsappAdminEstado(req, res) {
    try {
      const { canalId } = req.params;

      const canal = await Canal.findById(canalId);
      if (!canal) return res.status(404).json({ success: false, error: 'Canal no encontrado' });

      const botConfig = canal.botConfig?.whatsapp || {};
      const channelId = botConfig.channelId || canal.identificadorCanal;

      const status = {
        canalId,
        plataforma: 'whatsapp',
        nivelVerificacion: canal.nivelVerificacion || 'bronce',
        estado: canal.estado,
        integracion: {
          adminAccess: botConfig.adminAccess || false,
          channelId: botConfig.channelId || null,
          channelName: botConfig.channelName || null,
          seguidoresVerificados: botConfig.seguidoresVerificados || 0,
          verificadoEn: botConfig.verificadoEn || null,
          ultimaLectura: botConfig.ultimaLectura || null,
        },
        adminClientReady: false,
        verificacionActiva: null,
      };

      // Check if admin client is available
      try {
        const adminClient = require('../services/WhatsAppAdminClient');
        status.adminClientReady = adminClient.ready;

        if (adminClient.ready && channelId) {
          const verificationService = require('../services/WhatsAppVerificationService');
          status.verificacionActiva = await verificationService.getVerificationStatus(channelId);
        }
      } catch (_) {}

      res.json({ success: true, status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/onboarding/whatsapp/publicar/:campaignMetricsId
   * Publica un anuncio en el canal vía admin client y programa snapshots.
   */
  async whatsappPublicar(req, res) {
    try {
      const { campaignMetricsId } = req.params;

      const CampaignMetrics = require('../models/CampaignMetrics');
      const cm = await CampaignMetrics.findById(campaignMetricsId)
        .populate('anuncioId')
        .populate('canalId');

      if (!cm) return res.status(404).json({ success: false, error: 'CampaignMetrics no encontrado' });
      if (cm.plataforma !== 'whatsapp') {
        return res.status(400).json({ success: false, error: 'No es una campaña de WhatsApp' });
      }

      const canal = cm.canalId;
      const channelId = canal.botConfig?.whatsapp?.channelId;
      if (!channelId) {
        return res.status(400).json({ success: false, error: 'Canal sin channelId configurado' });
      }

      let adminClient;
      try {
        adminClient = require('../services/WhatsAppAdminClient');
        if (!adminClient.ready) {
          return res.status(503).json({ success: false, error: 'WhatsApp admin client no disponible' });
        }
      } catch (e) {
        return res.status(503).json({ success: false, error: 'Service not available' });
      }

      // Build content from anuncio
      const anuncio = cm.anuncioId;
      const content = {
        text: anuncio?.contenido?.texto || req.body.text || '',
        mediaUrl: anuncio?.contenido?.archivosMultimedia?.[0]?.url || req.body.mediaUrl || null,
        caption: req.body.caption || null,
      };

      if (!content.text && !content.mediaUrl) {
        return res.status(400).json({ success: false, error: 'Contenido vacío — se necesita text o mediaUrl' });
      }

      // Publish via admin client
      const result = await adminClient.publishToChannel(channelId, content);

      // Save to CampaignMetrics
      cm.postId = result.messageId;
      cm.publicadoEn = new Date();
      cm.fuenteDatos = 'admin_directo';
      cm.whatsappData = {
        ...(cm.whatsappData || {}),
        adminAccess: true,
        messageId: result.messageId,
      };

      // Schedule metric snapshots
      const whatsappPoller = require('../services/WhatsAppMetricsPoller');
      await whatsappPoller.scheduleSnapshots(cm._id);

      await cm.save();

      res.json({
        success: true,
        messageId: result.messageId,
        publicadoEn: cm.publicadoEn,
        proximaLectura: cm.proximaSync,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new OnboardingController();
