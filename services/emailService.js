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

      // Replace user-provided variables
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(value ?? ''));
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
        contenido = contenido.replace(regex, String(valor));
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
}

module.exports = new EmailService();
