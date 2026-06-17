const nodemailer = require('nodemailer');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.ready = this.inicializar();
    this.templateCache = new Map();
  }

  async inicializar() {
    try {
      const service = (config.email.service || '').toLowerCase();

      if (service === 'gmail') {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.email.auth.user,
            pass: config.email.auth.pass
          },
          secure: true,
          tls: {
            rejectUnauthorized: false
          }
        });
      } else if (service === 'smtp') {
        this.transporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: {
            user: config.email.auth.user,
            pass: config.email.auth.pass
          },
          tls: {
            rejectUnauthorized: false
          }
        });
      } else if (service === 'ethereal') {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      }

      if (config.server.environment !== 'test') {
        await this.verificarConexion();
      }
    } catch (error) {
      console.error('Error al inicializar el servicio de email:', error?.message || error);
      this.transporter = null;
    }
  }

  async verificarConexion() {
    try {
      if (!this.transporter) return false;
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Error al conectar con servidor de email:', error?.message || error);
      return false;
    }
  }

  // True once init has finished and a transporter is configured. Callers that
  // need to refuse work when email is dead (e.g. registration without ability
  // to send the verification link) should await this before deciding.
  async isOperational() {
    await this.ready;
    return Boolean(this.transporter);
  }

  async enviarEmail(opciones) {
    await this.ready;

    if (!this.transporter) {
      throw new Error('Servicio de email no disponible');
    }

    const opcionesEmail = {
      from: `"${config.email.from.name}" <${config.email.from.address}>`,
      to: opciones.para,
      subject: opciones.asunto,
      html: opciones.html,
      text: opciones.texto,
      replyTo: opciones.replyTo,
      attachments: opciones.adjuntos || []
    };

    const resultado = await this.transporter.sendMail(opcionesEmail);
    const previewUrl = nodemailer.getTestMessageUrl(resultado);

    return {
      exito: true,
      messageId: resultado.messageId,
      previewUrl: config.server.environment === 'development' ? previewUrl : null
    };
  }

  // ─── Template rendering system ────────────────────────────────────

  /**
   * Render a template by name with variables.
   * Loads the base layout, injects the specific template content into {{CONTENT}},
   * then replaces all {{variable}} placeholders.
   */
  async renderTemplate(templateName, variables = {}) {
    try {
      const baseHtml = await this._loadTemplateFile('base');
      const contentHtml = await this._loadTemplateFile(templateName);

      // Inject content into base layout
      let html = baseHtml.replace(/{{CONTENT}}/g, contentHtml);

      // Extract preheader from content comment if present
      const preheaderMatch = contentHtml.match(/<!--\s*Preheader:\s*(.*?)\s*-->/);
      const preheader = preheaderMatch ? preheaderMatch[1] : '';
      html = html.replace(/{{PREHEADER}}/g, preheader);

      // Replace user-provided variables. Values are HTML-escaped because some
      // (ad copy, advertiser/user display names) are attacker-controlled and
      // would otherwise allow stored→email HTML injection. Only the per-variable
      // values are escaped — the trusted {{CONTENT}} layout slot (merged above)
      // and template-authored entities like &euro; are never passed through here,
      // so nothing gets double-encoded. The replacer is a function so '$' runs
      // in user content (e.g. "$&", "$1") are inserted literally rather than
      // interpreted as String.replace substitution patterns.
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const safeValue = this._escapeHtml(value);
        html = html.replace(regex, () => safeValue);
      }

      // Replace global app variables
      html = html.replace(/{{APP_NAME}}/g, config.app.nombre || 'ChannelAd');
      html = html.replace(/{{APP_URL}}/g, config.frontend.url || '');
      html = html.replace(/{{SUPPORT_EMAIL}}/g, config.email.support || '');
      html = html.replace(/{{CURRENT_YEAR}}/g, String(new Date().getFullYear()));

      // Clean up any remaining unreplaced variables
      html = html.replace(/{{[^}]+}}/g, '');

      return html;
    } catch (error) {
      console.error(`Error al renderizar plantilla ${templateName}:`, error?.message || error);
      // Fallback: try loading template without base
      return this.cargarPlantilla(templateName, variables);
    }
  }

  /**
   * Load a raw template file from disk (with simple caching in production).
   */
  async _loadTemplateFile(templateName) {
    const cacheKey = templateName;
    if (config.server.environment === 'production' && this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }

    const rutaPlantilla = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const contenido = await fs.readFile(rutaPlantilla, 'utf8');

    if (config.server.environment === 'production') {
      this.templateCache.set(cacheKey, contenido);
    }

    return contenido;
  }

  /**
   * Legacy template loader — kept for backward compatibility.
   * For new code, use renderTemplate() instead.
   */
  async cargarPlantilla(nombrePlantilla, variables = {}) {
    try {
      const rutaPlantilla = path.join(__dirname, '..', 'templates', 'emails', `${nombrePlantilla}.html`);
      let contenido = await fs.readFile(rutaPlantilla, 'utf8');

      for (const [variable, valor] of Object.entries(variables)) {
        const regex = new RegExp(`{{${variable}}}`, 'g');
        // HTML-escape per-variable values here too: this legacy loader is the
        // fallback path of renderTemplate(), and must not reopen the
        // stored→email injection hole when it runs.
        const safeValor = this._escapeHtml(valor);
        contenido = contenido.replace(regex, () => safeValor);
      }

      contenido = contenido.replace(/{{APP_NAME}}/g, config.app.nombre);
      contenido = contenido.replace(/{{APP_URL}}/g, config.frontend.url);
      contenido = contenido.replace(/{{SUPPORT_EMAIL}}/g, config.email.support || '');
      contenido = contenido.replace(/{{CURRENT_YEAR}}/g, String(new Date().getFullYear()));

      return contenido;
    } catch (error) {
      console.error(`Error al cargar plantilla ${nombrePlantilla}:`, error?.message || error);
      return this.generarPlantillaBasica(variables);
    }
  }

  generarPlantillaBasica(variables) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${config.app.nombre}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #6366f1; color: white; padding: 20px; text-align: center;">
            <h1>${config.app.nombre}</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            ${variables.contenido || 'Contenido del email'}
          </div>
          <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p>&copy; ${new Date().getFullYear()} ${config.app.nombre}. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ─── Existing email methods (updated to use renderTemplate) ───────

  async enviarEmailVerificacion(email, nombre, token) {
    const verificationUrl = `${config.frontend.url}/verificar-email/${token}`;

    // Try the rich template first. If it fails or returns an empty/trivial
    // fallback (which means the template files were not bundled into the
    // serverless function), fall back to a hardcoded inline HTML that
    // guarantees a working verification link. This prevents the "email
    // silently doesn't send" class of bugs in serverless environments
    // where fs.readFile isn't traced by the NFT bundler.
    let html;
    try {
      html = await this.renderTemplate('verificacion', {
        nombre,
        verificationUrl,
        expiresIn: '24 horas'
      });
      // Detect the "generarPlantillaBasica" fallback or empty output and
      // replace with our reliable inline HTML that actually contains the link.
      if (!html || !html.includes(verificationUrl)) {
        html = this._buildInlineVerificationHtml(nombre, verificationUrl);
      }
    } catch (err) {
      console.warn('enviarEmailVerificacion: template failed, using inline fallback:', err?.message || err);
      html = this._buildInlineVerificationHtml(nombre, verificationUrl);
    }

    return this.enviarEmail({
      para: email,
      asunto: `Verifica tu cuenta en ${config.app.nombre}`,
      html
    });
  }

  /**
   * Inline HTML fallback for the verification email. Used when template
   * files are not available at runtime (e.g. Vercel individual functions
   * where templates/** isn't in the bundle). Fully self-contained.
   */
  _buildInlineVerificationHtml(nombre, verificationUrl) {
    const appName = config.app.nombre || 'Channelad';
    const safeName = String(nombre || '').trim() || 'Hola';
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Verifica tu cuenta en ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:40px 40px 24px 40px;text-align:center;">
              <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;">${appName}</h1>
              <p style="margin:0;font-size:14px;color:#86868b;">Marketplace de publicidad en comunidades</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#1d1d1f;">Hola ${safeName},</h2>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1d1d1f;">Gracias por registrarte en ${appName}. Para activar tu cuenta y empezar a usar la plataforma, haz click en el botón de abajo para verificar tu email.</p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#86868b;">Este enlace expira en 24 horas.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto;">
                <tr>
                  <td align="center" bgcolor="#7C3AED" style="border-radius:10px;">
                    <a href="${verificationUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background:#7C3AED;">Verificar mi email</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 8px 0;font-size:13px;color:#86868b;">Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
              <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${verificationUrl}" target="_blank" style="color:#7C3AED;text-decoration:underline;">${verificationUrl}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px 40px;border-top:1px solid #f0f0f5;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#86868b;text-align:center;">Si no has creado una cuenta en ${appName}, puedes ignorar este email.</p>
              <p style="margin:0;font-size:11px;color:#a1a1a6;text-align:center;">© ${year} ${appName}. Todos los derechos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async enviarEmailRecuperacion(email, nombre, token) {
    const resetUrl = `${config.frontend.url}/restablecer-password/${token}`;

    const html = await this.renderTemplate('recuperacion', {
      nombre,
      resetUrl,
      expiresIn: '1 hora'
    });

    return this.enviarEmail({
      para: email,
      asunto: `Recupera tu contrase\u00f1a - ${config.app.nombre}`,
      html
    });
  }

  // ─── New transactional email methods ──────────────────────────────

  /**
   * Send welcome email after registration.
   */
  async enviarBienvenida(user) {
    const referralCode = user.referralCode || '';
    const html = await this.renderTemplate('bienvenida', {
      nombre: user.nombre,
      email: user.email,
      rol: user.tipoUsuario === 'creador' ? 'Creador de Contenido' : user.rol === 'creator' ? 'Creador de Contenido' : 'Anunciante',
      dashboardUrl: `${config.frontend.url}/dashboard`,
      referralCode,
      referralLink: referralCode ? `${config.frontend.url}/auth/register?ref=${referralCode}` : '',
    });

    return this.enviarEmail({
      para: user.email,
      asunto: `\u00a1Bienvenido a ${config.app.nombre}!`,
      html
    });
  }

  /**
   * Notify creator that a new campaign was created for their channel.
   */
  async enviarCampanaCreada(campaign, creator) {
    const html = await this.renderTemplate('campana-creada', {
      creatorName: creator.nombre,
      advertiserName: campaign.anunciante?.nombre || campaign.advertiserName || 'Anunciante',
      channelName: campaign.canal?.nombre || campaign.channelName || 'Canal',
      content: campaign.contenido || campaign.descripcion || '',
      price: this._formatPrice(campaign.precio || campaign.price),
      deadline: this._formatDate(campaign.fechaLimite || campaign.deadline),
      campaignUrl: `${config.frontend.url}/campanas/${campaign._id || campaign.id}`
    });

    return this.enviarEmail({
      para: creator.email,
      asunto: `Nueva campa\u00f1a para tu canal - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Confirm payment to the advertiser.
   */
  async enviarCampanaPagada(campaign, advertiser) {
    const html = await this.renderTemplate('campana-pagada', {
      advertiserName: advertiser.nombre,
      channelName: campaign.canal?.nombre || campaign.channelName || 'Canal',
      price: this._formatPrice(campaign.precio || campaign.price),
      campaignUrl: `${config.frontend.url}/campanas/${campaign._id || campaign.id}`
    });

    return this.enviarEmail({
      para: advertiser.email,
      asunto: `Pago confirmado - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Notify advertiser that the campaign content was published.
   */
  async enviarCampanaPublicada(campaign, advertiser) {
    const html = await this.renderTemplate('campana-publicada', {
      advertiserName: advertiser.nombre,
      channelName: campaign.canal?.nombre || campaign.channelName || 'Canal',
      publishedAt: this._formatDate(campaign.fechaPublicacion || campaign.publishedAt || new Date()),
      campaignUrl: `${config.frontend.url}/campanas/${campaign._id || campaign.id}`
    });

    return this.enviarEmail({
      para: advertiser.email,
      asunto: `\u00a1Campa\u00f1a publicada! - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Notify users that a campaign has been completed.
   * `users` can be a single user object or an array [creator, advertiser].
   */
  async enviarCampanaCompletada(campaign, users) {
    const userList = Array.isArray(users) ? users : [users];
    const results = [];

    for (const user of userList) {
      const isCreator = user.tipoUsuario === 'creador';
      const price = campaign.precio || campaign.price || 0;
      const { DEFAULT_COMMISSION_RATE } = require('../config/commissions');
      const commission = campaign.comision || (price * DEFAULT_COMMISSION_RATE);
      const netAmount = isCreator ? (price - commission) : price;

      const html = await this.renderTemplate('campana-completada', {
        nombre: user.nombre,
        channelName: campaign.canal?.nombre || campaign.channelName || 'Canal',
        price: this._formatPrice(price),
        netAmount: this._formatPrice(netAmount),
        stats: campaign.estadisticas || campaign.stats || 'Estad\u00edsticas disponibles en el panel.',
        campaignUrl: `${config.frontend.url}/campanas/${campaign._id || campaign.id}`
      });

      results.push(
        this.enviarEmail({
          para: user.email,
          asunto: `Campa\u00f1a completada - ${config.app.nombre}`,
          html
        })
      );
    }

    return Promise.all(results);
  }

  /**
   * Notify a user that a campaign was cancelled.
   */
  async enviarCampanaCancelada(campaign, user) {
    const html = await this.renderTemplate('campana-cancelada', {
      nombre: user.nombre,
      channelName: campaign.canal?.nombre || campaign.channelName || 'Canal',
      reason: campaign.motivoCancelacion || campaign.reason || 'No especificado',
      refundAmount: this._formatPrice(campaign.montoReembolso || campaign.refundAmount || 0)
    });

    return this.enviarEmail({
      para: user.email,
      asunto: `Campa\u00f1a cancelada - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Notify a user that a dispute was opened.
   */
  async enviarDisputaAbierta(dispute, user) {
    const html = await this.renderTemplate('disputa-abierta', {
      nombre: user.nombre,
      campaignName: dispute.campana?.nombre || dispute.campaignName || 'Campa\u00f1a',
      reason: dispute.motivo || dispute.reason || '',
      disputeUrl: `${config.frontend.url}/disputas/${dispute._id || dispute.id}`
    });

    return this.enviarEmail({
      para: user.email,
      asunto: `Disputa abierta - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Notify a user that a dispute was resolved.
   */
  async enviarDisputaResuelta(dispute, user) {
    const html = await this.renderTemplate('disputa-resuelta', {
      nombre: user.nombre,
      campaignName: dispute.campana?.nombre || dispute.campaignName || 'Campa\u00f1a',
      resolution: dispute.resolucion || dispute.resolution || '',
      outcome: dispute.resultado || dispute.outcome || ''
    });

    return this.enviarEmail({
      para: user.email,
      asunto: `Disputa resuelta - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Notify a creator that they received a new review.
   */
  async enviarNuevaResena(review, creator) {
    const rating = review.puntuacion || review.rating || 0;
    const starsHtml = '\u2605'.repeat(Math.round(rating)) + '\u2606'.repeat(5 - Math.round(rating));

    const html = await this.renderTemplate('nueva-resena', {
      creatorName: creator.nombre,
      channelName: review.canal?.nombre || review.channelName || 'Canal',
      rating: starsHtml,
      comment: review.comentario || review.comment || '',
      reviewUrl: `${config.frontend.url}/canales/${review.canalId || review.canal?._id || ''}`
    });

    return this.enviarEmail({
      para: creator.email,
      asunto: `Nueva rese\u00f1a en tu canal - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Confirm that a withdrawal has been processed.
   */
  async enviarRetiroProcesado(retiro, user) {
    const html = await this.renderTemplate('retiro-procesado', {
      nombre: user.nombre,
      amount: this._formatPrice(retiro.monto || retiro.amount),
      method: retiro.metodo || retiro.method || 'Transferencia bancaria',
      estimatedArrival: retiro.llegadaEstimada || retiro.estimatedArrival || '3-5 d\u00edas h\u00e1biles'
    });

    return this.enviarEmail({
      para: user.email,
      asunto: `Retiro procesado - ${config.app.nombre}`,
      html
    });
  }

  /**
   * Notify creator that their channel was verified.
   */
  async enviarCanalVerificado(canal, creator) {
    const html = await this.renderTemplate('canal-verificado', {
      creatorName: creator.nombre,
      channelName: canal.nombre || canal.channelName || 'Canal',
      platform: canal.plataforma || canal.platform || 'YouTube',
      dashboardUrl: `${config.frontend.url}/dashboard`
    });

    return this.enviarEmail({
      para: creator.email,
      asunto: `\u00a1Tu canal ha sido verificado! - ${config.app.nombre}`,
      html
    });
  }

  // ─���─ Referral email methods ────────────��───────────────────────────

  /**
   * Notify referrer that someone registered with their referral code.
   */
  async enviarReferidoRegistrado(referrer, referidoNombre, totalReferidos, creditosAcumulados) {
    const html = await this.renderTemplate('referido-registro', {
      nombre: referrer.nombre || 'Usuario',
      referidoNombre: referidoNombre || 'Un nuevo usuario',
      totalReferidos: String(totalReferidos || 0),
      creditosAcumulados: this._formatPrice(creditosAcumulados || 0),
    });

    return this.enviarEmail({
      para: referrer.email,
      asunto: `Nuevo referido registrado - ${config.app.nombre}`,
      html,
    });
  }

  /**
   * Notify referrer that a referred user completed a campaign and they earned credits.
   */
  async enviarComisionReferral(referrer, referidoNombre, creditoGenerado, valorCampana, creditosTotales, nivelActual) {
    const html = await this.renderTemplate('referido-comision', {
      nombre: referrer.nombre || 'Usuario',
      referidoNombre: referidoNombre || 'Un referido',
      creditoGenerado: this._formatPrice(creditoGenerado || 0),
      valorCampana: this._formatPrice(valorCampana || 0),
      creditosTotales: this._formatPrice(creditosTotales || 0),
      nivelActual: (nivelActual || 'normal').charAt(0).toUpperCase() + (nivelActual || 'normal').slice(1),
    });

    return this.enviarEmail({
      para: referrer.email,
      asunto: `Has ganado creditos por referido - ${config.app.nombre}`,
      html,
    });
  }

  // ─── Internal team notifications ──────────────────────────────────

  /**
   * Heads-up to the team: a new user just registered. Sent to
   * config.email.adminNotify (contact@channelad.io by default) on every
   * signup — both email/password (registro) and Google (googleLogin).
   *
   * Best-effort: callers wrap this in try/catch so a failed or unconfigured
   * notification never blocks the actual registration.
   */
  async enviarAvisoNuevoRegistro(user, meta = {}) {
    const to = (config.email.adminNotify || '').trim();
    if (!to) return { exito: false, skipped: true };

    const appName = config.app.nombre || 'Channelad';
    const rolLabel = user.rol === 'creator'
      ? (user.tipoPerfil === 'agencia' ? 'Creator (agencia)' : 'Creator')
      : 'Advertiser';
    const fuente = meta.source === 'google' ? 'Google' : 'Email / contraseña';

    const flags = [];
    if (meta.founderApplied) flags.push('Candidato a Fundador (bot token)');
    if (meta.referralApplied) flags.push('Vino por código de referido');

    const rows = [
      ['Email', user.email],
      ['Nombre', user.nombre || '—'],
      ['Rol', rolLabel],
      ['Alta vía', fuente],
      ['Fecha', this._formatDateTime(new Date())],
    ];
    if (flags.length) rows.push(['Notas', flags.join(' · ')]);

    const rowsHtml = rows.map(([k, v]) =>
      `<tr>
        <td style="padding:8px 16px;color:#86868b;font-size:13px;white-space:nowrap;border-bottom:1px solid #f0f0f5;">${this._escapeHtml(k)}</td>
        <td style="padding:8px 16px;color:#1d1d1f;font-size:14px;font-weight:600;border-bottom:1px solid #f0f0f5;">${this._escapeHtml(v)}</td>
      </tr>`
    ).join('');

    const dashboardUrl = `${config.frontend.url || 'https://channelad.io'}/dashboard`;
    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Nuevo registro en ${appName}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 16px 32px;">
          <p style="margin:0 0 4px 0;font-size:13px;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Nuevo registro</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#1d1d1f;">Alta de usuario en ${appName}</h1>
        </td></tr>
        <tr><td style="padding:8px 16px 24px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rowsHtml}</table>
        </td></tr>
        <tr><td style="padding:0 32px 32px 32px;">
          <a href="${dashboardUrl}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background:#7C3AED;">Abrir panel</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    return this.enviarEmail({
      para: to,
      asunto: `Nuevo registro en ${appName}: ${user.email} (${rolLabel})`,
      html,
    });
  }

  // ─── Helpers ───────────────────────────────────────────────���──────

  // ─── Email 3: Profile reminder ─────────────────────────────────────

  /**
   * Send a reminder to creators with incomplete channel profiles.
   * Triggered by the scheduler in campaignCron.js.
   */
  async enviarRecordatorioPerfil(email, nombre) {
    const html = await this.renderTemplate('recordatorio-perfil', {
      nombre: nombre || email.split('@')[0],
      linkPerfil: `${config.frontend.url}/dashboard/perfil`,
    });

    return this.enviarEmail({
      para: email,
      asunto: `${nombre || 'Hola'}, tu perfil está incompleto — no podemos asignarte campañas todavía`,
      html,
    });
  }

  // ─── Email 4: Campaign available for channel ──────────────────────

  /**
   * Notify a channel owner that a new campaign proposal is available.
   * Triggered from the campaign-assignment flow.
   */
  async enviarCampanaDisponible(email, datos) {
    const html = await this.renderTemplate('campana-disponible', {
      nombre: datos.nombre,
      nombreCanal: datos.nombreCanal,
      nombreAnunciante: datos.nombreAnunciante,
      tipoCampana: datos.tipoCampana,
      presupuesto: this._formatPrice(datos.presupuesto),
      fechaPropuesta: datos.fechaPropuesta,
      linkCampana: datos.linkCampana,
    });

    return this.enviarEmail({
      para: email,
      asunto: `Nueva propuesta de campaña para ${datos.nombreCanal} — ${this._formatPrice(datos.presupuesto)}€`,
      html,
    });
  }

  /**
   * Welcome a user into their freshly activated paid (or trialing) plan.
   * Inline HTML — the marketing copy lives next to the feature list it
   * references, so changes don't require touching a template file.
   *
   * Called from the subscription webhook on customer.subscription.created
   * (trialing or active).
   */
  async enviarBienvenidaPlanPro(user, planLabel, trialEnd) {
    const trialLine = trialEnd
      ? `Tu prueba gratis termina el <strong>${this._formatDate(trialEnd)}</strong>. Hasta entonces tienes acceso completo sin cargo.`
      : '';
    const subject = trialEnd
      ? `Tu prueba de ${planLabel} ha empezado`
      : `Bienvenido a ${planLabel}`;
    const url = `${config.frontend?.url || 'https://channelad.io'}/account/billing`;
    const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#111;line-height:1.55">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:800;margin:0 0 12px">${subject}</h1>
        <p>Hola ${user.nombre || ''},</p>
        <p>Ya tienes acceso a <strong>${planLabel}</strong>. Estas son las funciones que acabas de desbloquear:</p>
        <ul style="margin:12px 0 20px;padding-left:18px">
          <li>Comisión rebajada al 15% (solo Advertiser Pro)</li>
          <li>Bulk Launcher / Autobuy ilimitado</li>
          <li>Lookalike, niche heatmap, audience insights</li>
          <li>Atribución multi-touch con ventana 90d</li>
          <li>Soporte prioritario</li>
        </ul>
        ${trialLine ? `<p style="padding:12px;border-radius:8px;background:#f5f3ff;border:1px solid #ddd6fe;color:#5b21b6">${trialLine}</p>` : ''}
        <p><a href="${url}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#7C3AED;color:#fff;text-decoration:none;font-weight:600">Ver mi plan</a></p>
        <p style="color:#6b7280;font-size:13px;margin-top:32px">¿Dudas? Responde a este correo y te ayudamos.</p>
      </div>
    </body></html>`;
    return this.enviarEmail({ para: user.email, asunto: subject, html });
  }

  /**
   * Heads-up email: trial ends in N days. Triggered by Stripe's
   * customer.subscription.trial_will_end (fires 3 days before trial_end).
   */
  async enviarTrialAcabaEn(user, planLabel, trialEnd) {
    const subject = `Tu prueba de ${planLabel} acaba pronto`;
    const url = `${config.frontend?.url || 'https://channelad.io'}/account/billing`;
    const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#111;line-height:1.55">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 12px">${subject}</h1>
        <p>Hola ${user.nombre || ''},</p>
        <p>Tu prueba gratuita de <strong>${planLabel}</strong> termina el <strong>${this._formatDate(trialEnd)}</strong>.</p>
        <p>Para seguir disfrutando de ${planLabel} sin interrupciones, añade un método de pago desde tu panel:</p>
        <p><a href="${url}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#7C3AED;color:#fff;text-decoration:none;font-weight:600">Añadir método de pago</a></p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">Si no quieres continuar, no tienes que hacer nada — pasarás automáticamente al plan Free.</p>
      </div>
    </body></html>`;
    return this.enviarEmail({ para: user.email, asunto: subject, html });
  }

  /**
   * Escape a value for safe interpolation into an HTML email body. Guards
   * against stored→email HTML injection from advertiser/user-controlled fields
   * (ad copy, display names, dispute reasons). Escapes the five HTML-significant
   * characters; URLs and numbers pass through unchanged except for `&` (which is
   * correctly encoded as `&amp;` inside both text and href attributes).
   */
  _escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _formatPrice(amount) {
    if (amount == null) return '0.00';
    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  _formatDate(date) {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  _formatDateTime(date) {
    const d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

module.exports = new EmailService();
