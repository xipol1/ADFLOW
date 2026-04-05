const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const config = require('../config/config');

/**
 * Servicio de autenticación JWT
 */
class AuthService {
  /**
   * Generar token de acceso
   */
  static generarTokenAcceso(payload) {
    try {
      const tokenPayload = {
        id: payload.id,
        email: payload.email,
        rol: payload.rol,
        emailVerificado: payload.emailVerificado,
        iat: Math.floor(Date.now() / 1000)
      };

      return jwt.sign(
        tokenPayload,
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          algorithm: 'HS256'
        }
      );
    } catch (error) {
      console.error('Error al generar token de acceso:', error);
      throw error;
    }
  }

  /**
   * Generar token de refresco
   */
  static generarTokenRefresco(payload) {
    try {
      const tokenPayload = {
        id: payload.id,
        email: payload.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      };

      return jwt.sign(
        tokenPayload,
        config.jwt.refreshSecret,
        {
          expiresIn: config.jwt.refreshExpiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          algorithm: 'HS256'
        }
      );
    } catch (error) {
      console.error('Error al generar token de refresco:', error);
      throw error;
    }
  }

  /**
   * Verificar token de acceso
   */
  static verificarTokenAcceso(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256']
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      } else {
        throw new Error('Error al verificar token');
      }
    }
  }

  /**
   * Verificar token de refresco
   */
  static verificarTokenRefresco(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256']
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Tipo de token inválido');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token de refresco expirado');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token de refresco inválido');
      } else {
        throw new Error('Error al verificar token de refresco');
      }
    }
  }

  /**
   * Generar par de tokens (acceso + refresco)
   */
  static async generarTokens(usuario) {
    try {
      const payload = {
        id: usuario._id.toString(),
        email: usuario.email,
        rol: usuario.rol,
        emailVerificado: usuario.emailVerificado
      };

      const tokenAcceso = this.generarTokenAcceso(payload);
      const tokenRefresco = this.generarTokenRefresco(payload);

      // Guardar hash del token de refresco en la base de datos
      const hashTokenRefresco = crypto.createHash('sha256').update(tokenRefresco).digest('hex');
      
      await Usuario.findByIdAndUpdate(usuario._id, {
        $push: {
          'sesiones': {
            tokenHash: hashTokenRefresco,
            fechaCreacion: new Date(),
            fechaExpiracion: new Date(Date.now() + this.parseTimeToMs(config.jwt.refreshExpiresIn)),
            userAgent: '', // Se puede agregar desde el request
            ip: '' // Se puede agregar desde el request
          }
        }
      });

      return {
        tokenAcceso,
        tokenRefresco,
        expiresIn: config.jwt.expiresIn
      };
    } catch (error) {
      console.error('Error al generar tokens:', error);
      throw error;
    }
  }

  /**
   * Refrescar token de acceso
   */
  static async refrescarToken(tokenRefresco) {
    try {
      // Verificar token de refresco
      const decoded = this.verificarTokenRefresco(tokenRefresco);
      
      // Verificar que el token existe en la base de datos
      const hashToken = crypto.createHash('sha256').update(tokenRefresco).digest('hex');
      
      const usuario = await Usuario.findOne({
        _id: decoded.id,
        'sesiones.tokenHash': hashToken,
        'sesiones.fechaExpiracion': { $gt: new Date() }
      });

      if (!usuario) {
        throw new Error('Token de refresco inválido o expirado');
      }

      // Verificar que el usuario esté activo
      if (!usuario.activo) {
        throw new Error('Usuario inactivo');
      }

      // ── Refresh token rotation: revoke old, issue new pair ──
      const payload = {
        id: usuario._id.toString(),
        email: usuario.email,
        rol: usuario.rol,
        emailVerificado: usuario.emailVerificado
      };

      const nuevoTokenAcceso = this.generarTokenAcceso(payload);
      const nuevoTokenRefresco = this.generarTokenRefresco(payload);
      const nuevoHash = crypto.createHash('sha256').update(nuevoTokenRefresco).digest('hex');

      // Atomically remove old session and add new one
      await Usuario.findByIdAndUpdate(usuario._id, {
        $pull: { sesiones: { tokenHash: hashToken } },
      });
      await Usuario.findByIdAndUpdate(usuario._id, {
        $push: {
          sesiones: {
            tokenHash: nuevoHash,
            fechaCreacion: new Date(),
            fechaExpiracion: new Date(Date.now() + this.parseTimeToMs(config.jwt.refreshExpiresIn)),
            userAgent: '',
            ip: ''
          }
        },
        ultimaActividad: new Date()
      });

      return {
        tokenAcceso: nuevoTokenAcceso,
        tokenRefresco: nuevoTokenRefresco,
        expiresIn: config.jwt.expiresIn
      };
    } catch (error) {
      console.error('Error al refrescar token:', error);
      throw error;
    }
  }

  /**
   * Revocar token de refresco
   */
  static async revocarToken(tokenRefresco, usuarioId) {
    try {
      const hashToken = crypto.createHash('sha256').update(tokenRefresco).digest('hex');
      
      await Usuario.findByIdAndUpdate(usuarioId, {
        $pull: {
          'sesiones': { tokenHash: hashToken }
        }
      });

      return true;
    } catch (error) {
      console.error('Error al revocar token:', error);
      throw new Error('Error al revocar token');
    }
  }

  /**
   * Revocar todas las sesiones de un usuario
   */
  static async revocarTodasLasSesiones(usuarioId) {
    try {
      await Usuario.findByIdAndUpdate(usuarioId, {
        $set: { 'sesiones': [] }
      });

      return true;
    } catch (error) {
      console.error('Error al revocar todas las sesiones:', error);
      throw new Error('Error al revocar sesiones');
    }
  }

  /**
   * Limpiar sesiones expiradas
   */
  static async limpiarSesionesExpiradas() {
    try {
      const resultado = await Usuario.updateMany(
        {},
        {
          $pull: {
            'sesiones': {
              fechaExpiracion: { $lt: new Date() }
            }
          }
        }
      );

      console.log(`Sesiones expiradas limpiadas: ${resultado.modifiedCount} usuarios afectados`);
      return resultado;
    } catch (error) {
      console.error('Error al limpiar sesiones expiradas:', error);
      throw new Error('Error al limpiar sesiones');
    }
  }

  /**
   * Generar token de verificación de email
   */
  static generarTokenVerificacion() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generar token de recuperación de contraseña
   */
  static generarTokenRecuperacion() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash de contraseña
   */
  static async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(config.security.bcryptRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Error al hashear contraseña:', error);
      throw new Error('Error al procesar contraseña');
    }
  }

  /**
   * Comparar contraseña
   */
  static async compararPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error al comparar contraseña:', error);
      throw new Error('Error al verificar contraseña');
    }
  }

  /**
   * Validar fortaleza de contraseña
   */
  static validarFortalezaPassword(password) {
    const errores = [];

    if (password.length < 8) {
      errores.push('La contraseña debe tener al menos 8 caracteres');
    }

    if (!/[a-z]/.test(password)) {
      errores.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
      errores.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (!/\d/.test(password)) {
      errores.push('La contraseña debe contener al menos un número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errores.push('La contraseña debe contener al menos un carácter especial');
    }

    // Verificar patrones comunes débiles
    const patronesDebiles = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /(.)\1{3,}/ // 4 o más caracteres repetidos
    ];

    for (const patron of patronesDebiles) {
      if (patron.test(password)) {
        errores.push('La contraseña contiene patrones comunes débiles');
        break;
      }
    }

    return {
      esValida: errores.length === 0,
      errores,
      puntuacion: this.calcularPuntuacionPassword(password)
    };
  }

  /**
   * Calcular puntuación de fortaleza de contraseña (0-100)
   */
  static calcularPuntuacionPassword(password) {
    let puntuacion = 0;

    // Longitud
    if (password.length >= 8) puntuacion += 25;
    if (password.length >= 12) puntuacion += 10;
    if (password.length >= 16) puntuacion += 10;

    // Variedad de caracteres
    if (/[a-z]/.test(password)) puntuacion += 10;
    if (/[A-Z]/.test(password)) puntuacion += 10;
    if (/\d/.test(password)) puntuacion += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) puntuacion += 15;

    // Complejidad adicional
    if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) puntuacion += 5;
    if (/\d.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]|[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?].*\d/.test(password)) puntuacion += 5;

    return Math.min(puntuacion, 100);
  }

  /**
   * Extraer token del header Authorization
   */
  static extraerTokenDeHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const partes = authHeader.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return null;
    }

    return partes[1];
  }

  /**
   * Convertir tiempo string a milisegundos
   */
  static parseTimeToMs(timeString) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000
    };

    const match = timeString.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error('Formato de tiempo inválido');
    }

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Obtener información del token sin verificar
   */
  static decodificarToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      return null;
    }
  }

  /**
   * Verificar si un token está próximo a expirar
   */
  static estaProximoAExpirar(token, minutosAntes = 5) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const tiempoExpiracion = decoded.exp * 1000;
      const tiempoLimite = Date.now() + (minutosAntes * 60 * 1000);

      return tiempoExpiracion <= tiempoLimite;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener estadísticas de sesiones activas
   */
  static async obtenerEstadisticasSesiones() {
    try {
      const estadisticas = await Usuario.aggregate([
        {
          $project: {
            sesionesActivas: {
              $size: {
                $filter: {
                  input: '$sesiones',
                  cond: { $gt: ['$$this.fechaExpiracion', new Date()] }
                }
              }
            },
            rol: 1
          }
        },
        {
          $group: {
            _id: '$rol',
            totalUsuarios: { $sum: 1 },
            totalSesiones: { $sum: '$sesionesActivas' },
            promedioSesionesPorUsuario: { $avg: '$sesionesActivas' }
          }
        }
      ]);

      return estadisticas;
    } catch (error) {
      console.error('Error al obtener estadísticas de sesiones:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }
}

module.exports = AuthService;
