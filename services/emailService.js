const nodemailer = require('nodemailer');
const config = require('../config/config');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.ready = this.inicializar();
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

      await this.crearPlantillasDefecto();

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
          <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
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

  async enviarEmailVerificacion(email, nombre, token) {
    const urlVerificacion = `${config.frontend.url}/verificar-email/${token}`;

    const contenido = await this.cargarPlantilla('verificacion', {
      nombre,
      urlVerificacion,
      token
    });

    return this.enviarEmail({
      para: email,
      asunto: `Verifica tu cuenta en ${config.app.nombre}`,
      html: contenido
    });
  }

  async enviarEmailRecuperacion(email, nombre, token) {
    const urlRecuperacion = `${config.frontend.url}/restablecer-password/${token}`;

    const contenido = await this.cargarPlantilla('recuperacion', {
      nombre,
      urlRecuperacion,
      token,
      tiempoExpiracion: '1 hora'
    });

    return this.enviarEmail({
      para: email,
      asunto: `Recupera tu contraseña - ${config.app.nombre}`,
      html: contenido
    });
  }

  async crearPlantillasDefecto() {
    const plantillas = {
      'verificacion.html': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verificar Email - {{APP_NAME}}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #007bff; color: white; padding: 20px; text-align: center;">
              <h1>{{APP_NAME}}</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <h2>¡Hola {{nombre}}!</h2>
              <p>Gracias por registrarte en {{APP_NAME}}. Para completar tu registro, necesitas verificar tu dirección de email.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="{{urlVerificacion}}" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">Verificar Email</a>
              </p>
              <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #666;">{{urlVerificacion}}</p>
              <p><strong>Este enlace expirará en 24 horas.</strong></p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; {{CURRENT_YEAR}} {{APP_NAME}}. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'recuperacion.html': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recuperar Contraseña - {{APP_NAME}}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
              <h1>{{APP_NAME}}</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <h2>¡Hola {{nombre}}!</h2>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="{{urlRecuperacion}}" style="display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px;">Restablecer Contraseña</a>
              </p>
              <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #666;">{{urlRecuperacion}}</p>
              <p><strong>Este enlace expirará en {{tiempoExpiracion}}.</strong></p>
              <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            </div>
            <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; {{CURRENT_YEAR}} {{APP_NAME}}. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const directorioTemplates = path.join(__dirname, '..', 'templates', 'emails');
    await fs.mkdir(directorioTemplates, { recursive: true });

    for (const [nombre, contenido] of Object.entries(plantillas)) {
      const rutaArchivo = path.join(directorioTemplates, nombre);
      try {
        await fs.access(rutaArchivo);
      } catch {
        await fs.writeFile(rutaArchivo, contenido.trim());
      }
    }
  }
}

module.exports = new EmailService();

