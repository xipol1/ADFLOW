const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/**
 * Clase para el sistema de comisiones y billetera para creadores
 */
class SistemaComisiones {
  constructor(stripeAPI, paypalAPI, cryptoAPI) {
    this.stripeAPI = stripeAPI;
    this.paypalAPI = paypalAPI;
    this.cryptoAPI = cryptoAPI;
    this.comisionPorcentaje = 10; // Comisión predeterminada del 10%
    this.comisionMinima = 1; // Comisión mínima en USD
  }

  /**
   * Establece el porcentaje de comisión de la plataforma
   * @param {number} porcentaje - Porcentaje de comisión (0-100)
   */
  setComisionPorcentaje(porcentaje) {
    if (porcentaje < 0 || porcentaje > 100) {
      throw new Error('El porcentaje de comisión debe estar entre 0 y 100');
    }
    this.comisionPorcentaje = porcentaje;
  }

  /**
   * Establece la comisión mínima de la plataforma
   * @param {number} minima - Comisión mínima en USD
   */
  setComisionMinima(minima) {
    if (minima < 0) {
      throw new Error('La comisión mínima no puede ser negativa');
    }
    this.comisionMinima = minima;
  }

  /**
   * Calcula la comisión para una transacción
   * @param {number} monto - Monto de la transacción
   * @param {string} moneda - Moneda de la transacción (USD, EUR, etc.)
   * @param {string} tipoCanal - Tipo de canal (telegram, whatsapp, instagram, discord)
   * @param {string} tipoAnuncio - Tipo de anuncio (post, story, mención, etc.)
   * @returns {Object} Detalles de la comisión
   */
  calcularComision(monto, moneda = 'USD', tipoCanal, tipoAnuncio) {
    // Aplicar ajustes según el tipo de canal y anuncio
    let porcentajeAjustado = this.comisionPorcentaje;
    
    // Ajustar comisión según el tipo de canal
    switch (tipoCanal) {
      case 'telegram':
        porcentajeAjustado -= 1; // 1% menos para Telegram
        break;
      case 'instagram':
        porcentajeAjustado += 2; // 2% más para Instagram
        break;
      case 'discord':
        porcentajeAjustado -= 2; // 2% menos para Discord
        break;
      default:
        // Sin ajuste para otros canales
        break;
    }
    
    // Ajustar comisión según el tipo de anuncio
    switch (tipoAnuncio) {
      case 'post':
        // Sin ajuste para posts estándar
        break;
      case 'story':
        porcentajeAjustado -= 1; // 1% menos para stories
        break;
      case 'mencion':
        porcentajeAjustado += 1; // 1% más para menciones
        break;
      case 'destacado':
        porcentajeAjustado += 3; // 3% más para anuncios destacados
        break;
      default:
        // Sin ajuste para otros tipos
        break;
    }
    
    // Asegurar que el porcentaje esté en un rango válido
    porcentajeAjustado = Math.max(1, Math.min(porcentajeAjustado, 30));
    
    // Calcular comisión
    let comision = (monto * porcentajeAjustado) / 100;
    
    // Aplicar comisión mínima
    comision = Math.max(comision, this.comisionMinima);
    
    // Asegurar que la comisión no supere el monto total
    comision = Math.min(comision, monto * 0.5); // Máximo 50% del monto
    
    // Calcular monto neto para el creador
    const montoNeto = monto - comision;
    
    return {
      montoTotal: monto,
      moneda,
      comisionPorcentaje: porcentajeAjustado,
      comisionMonto: comision,
      montoNeto,
      tipoCanal,
      tipoAnuncio
    };
  }

  /**
   * Procesa un pago y distribuye los fondos entre la plataforma y el creador
   * @param {Object} pagoData - Datos del pago
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async procesarPago(pagoData) {
    try {
      const {
        metodo, // 'stripe', 'paypal', 'crypto'
        monto,
        moneda,
        tipoCanal,
        tipoAnuncio,
        anuncianteId,
        creadorId,
        detallesPago
      } = pagoData;
      
      // Calcular comisión
      const comisionInfo = this.calcularComision(monto, moneda, tipoCanal, tipoAnuncio);
      
      // Generar ID de transacción
      const transaccionId = uuidv4();
      
      // Procesar pago según el método
      let resultadoPago;
      
      switch (metodo) {
        case 'stripe':
          resultadoPago = await this.procesarPagoStripe(detallesPago, comisionInfo, transaccionId);
          break;
        case 'paypal':
          resultadoPago = await this.procesarPagoPayPal(detallesPago, comisionInfo, transaccionId);
          break;
        case 'crypto':
          resultadoPago = await this.procesarPagoCrypto(detallesPago, comisionInfo, transaccionId);
          break;
        default:
          throw new Error(`Método de pago no soportado: ${metodo}`);
      }
      
      // Crear registro de transacción
      const transaccion = {
        id: transaccionId,
        fecha: new Date(),
        anuncianteId,
        creadorId,
        metodo,
        montoTotal: comisionInfo.montoTotal,
        moneda: comisionInfo.moneda,
        comisionPorcentaje: comisionInfo.comisionPorcentaje,
        comisionMonto: comisionInfo.comisionMonto,
        montoNeto: comisionInfo.montoNeto,
        tipoCanal,
        tipoAnuncio,
        estado: 'completado',
        detallesPago: resultadoPago
      };
      
      // Actualizar billetera del creador
      await this.actualizarBilleteraCreador(creadorId, comisionInfo.montoNeto, moneda);
      
      return {
        transaccion,
        comisionInfo,
        resultadoPago
      };
    } catch (error) {
      console.error('Error al procesar pago:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un pago con Stripe
   * @param {Object} detallesPago - Detalles del pago con Stripe
   * @param {Object} comisionInfo - Información de la comisión
   * @param {string} transaccionId - ID de la transacción
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async procesarPagoStripe(detallesPago, comisionInfo, transaccionId) {
    try {
      const {
        paymentIntentId,
        customerId,
        paymentMethodId,
        description
      } = detallesPago;
      
      // Si ya tenemos un paymentIntentId, capturarlo
      if (paymentIntentId) {
        const paymentIntent = await this.stripeAPI.confirmPaymentIntent(paymentIntentId);
        return {
          id: paymentIntent.id,
          estado: paymentIntent.status,
          metodo: 'stripe'
        };
      }
      
      // Crear un nuevo intento de pago
      const paymentIntent = await this.stripeAPI.createPaymentIntent({
        amount: Math.round(comisionInfo.montoTotal * 100), // Convertir a centavos
        currency: comisionInfo.moneda.toLowerCase(),
        customer: customerId,
        payment_method: paymentMethodId,
        description: description || `Pago por anuncio en ${comisionInfo.tipoCanal}`,
        metadata: {
          transaccionId,
          tipoCanal: comisionInfo.tipoCanal,
          tipoAnuncio: comisionInfo.tipoAnuncio,
          comisionPorcentaje: comisionInfo.comisionPorcentaje.toString(),
          comisionMonto: comisionInfo.comisionMonto.toString()
        },
        confirm: true
      });
      
      return {
        id: paymentIntent.id,
        estado: paymentIntent.status,
        metodo: 'stripe'
      };
    } catch (error) {
      console.error('Error al procesar pago con Stripe:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un pago con PayPal
   * @param {Object} detallesPago - Detalles del pago con PayPal
   * @param {Object} comisionInfo - Información de la comisión
   * @param {string} transaccionId - ID de la transacción
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async procesarPagoPayPal(detallesPago, comisionInfo, transaccionId) {
    try {
      const {
        orderId,
        returnUrl,
        cancelUrl
      } = detallesPago;
      
      // Si ya tenemos un orderId, capturarlo
      if (orderId) {
        const captureResult = await this.paypalAPI.captureOrder(orderId);
        return {
          id: captureResult.id,
          estado: captureResult.status,
          metodo: 'paypal'
        };
      }
      
      // Crear una nueva orden
      const order = await this.paypalAPI.createOrder({
        intent: 'CAPTURE',
        purchaseUnits: [{
          referenceId: transaccionId,
          description: `Pago por anuncio en ${comisionInfo.tipoCanal}`,
          customId: transaccionId,
          amount: {
            currency_code: comisionInfo.moneda,
            value: comisionInfo.montoTotal.toString()
          }
        }],
        returnUrl: returnUrl,
        cancelUrl: cancelUrl
      });
      
      return {
        id: order.id,
        estado: order.status,
        metodo: 'paypal',
        approveUrl: order.links.find(link => link.rel === 'approve').href
      };
    } catch (error) {
      console.error('Error al procesar pago con PayPal:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un pago con criptomonedas
   * @param {Object} detallesPago - Detalles del pago con criptomonedas
   * @param {Object} comisionInfo - Información de la comisión
   * @param {string} transaccionId - ID de la transacción
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async procesarPagoCrypto(detallesPago, comisionInfo, transaccionId) {
    try {
      const {
        fromAddress,
        privateKey,
        toAddress,
        amount,
        txHash
      } = detallesPago;
      
      // Si ya tenemos un hash de transacción, verificarlo
      if (txHash) {
        const receipt = await this.cryptoAPI.getTransactionReceipt(txHash);
        return {
          id: txHash,
          estado: receipt.status ? 'confirmado' : 'fallido',
          metodo: 'crypto',
          blockNumber: receipt.blockNumber
        };
      }
      
      // Crear una nueva transacción
      const receipt = await this.cryptoAPI.sendTransaction({
        fromAddress,
        privateKey,
        toAddress,
        amount: amount || comisionInfo.montoTotal, // Monto en ETH
        gasLimit: 21000
      });
      
      return {
        id: receipt.transactionHash,
        estado: receipt.status ? 'confirmado' : 'fallido',
        metodo: 'crypto',
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error al procesar pago con criptomonedas:', error.message);
      throw error;
    }
  }

  /**
   * Actualiza la billetera de un creador
   * @param {string} creadorId - ID del creador
   * @param {number} monto - Monto a añadir
   * @param {string} moneda - Moneda del monto
   * @returns {Promise<Object>} Billetera actualizada
   */
  async actualizarBilleteraCreador(creadorId, monto, moneda) {
    try {
      // Aquí se implementaría la lógica para actualizar la billetera en la base de datos
      // Por ahora, simulamos la actualización
      console.log(`Actualizando billetera del creador ${creadorId}: +${monto} ${moneda}`);
      
      return {
        creadorId,
        montoAñadido: monto,
        moneda,
        fechaActualizacion: new Date()
      };
    } catch (error) {
      console.error('Error al actualizar billetera del creador:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el balance de la billetera de un creador
   * @param {string} creadorId - ID del creador
   * @returns {Promise<Object>} Balance de la billetera
   */
  async obtenerBalanceBilletera(creadorId) {
    try {
      // Aquí se implementaría la lógica para obtener el balance desde la base de datos
      // Por ahora, simulamos la obtención
      console.log(`Obteniendo balance de billetera del creador ${creadorId}`);
      
      return {
        creadorId,
        balances: [
          { moneda: 'USD', monto: 1000 },
          { moneda: 'EUR', monto: 850 },
          { moneda: 'ETH', monto: 0.5 }
        ],
        fechaActualizacion: new Date()
      };
    } catch (error) {
      console.error('Error al obtener balance de billetera:', error.message);
      throw error;
    }
  }

  /**
   * Solicita un retiro de fondos de la billetera
   * @param {Object} retiroData - Datos del retiro
   * @returns {Promise<Object>} Resultado del retiro
   */
  async solicitarRetiro(retiroData) {
    try {
      const {
        creadorId,
        metodo, // 'stripe', 'paypal', 'crypto', 'banco'
        monto,
        moneda,
        detallesRetiro
      } = retiroData;
      
      // Verificar balance disponible
      const billetera = await this.obtenerBalanceBilletera(creadorId);
      const balanceMoneda = billetera.balances.find(b => b.moneda === moneda);
      
      if (!balanceMoneda || balanceMoneda.monto < monto) {
        throw new Error(`Balance insuficiente para el retiro: ${balanceMoneda?.monto || 0} ${moneda}`);
      }
      
      // Generar ID de retiro
      const retiroId = uuidv4();
      
      // Procesar retiro según el método
      let resultadoRetiro;
      
      switch (metodo) {
        case 'stripe':
          resultadoRetiro = await this.procesarRetiroStripe(detallesRetiro, monto, moneda, retiroId);
          break;
        case 'paypal':
          resultadoRetiro = await this.procesarRetiroPayPal(detallesRetiro, monto, moneda, retiroId);
          break;
        case 'crypto':
          resultadoRetiro = await this.procesarRetiroCrypto(detallesRetiro, monto, moneda, retiroId);
          break;
        case 'banco':
          resultadoRetiro = await this.procesarRetiroBanco(detallesRetiro, monto, moneda, retiroId);
          break;
        default:
          throw new Error(`Método de retiro no soportado: ${metodo}`);
      }
      
      // Actualizar billetera del creador (restar el monto retirado)
      await this.actualizarBilleteraCreador(creadorId, -monto, moneda);
      
      // Crear registro de retiro
      const retiro = {
        id: retiroId,
        fecha: new Date(),
        creadorId,
        metodo,
        monto,
        moneda,
        estado: 'procesando',
        detallesRetiro: resultadoRetiro
      };
      
      return {
        retiro,
        resultadoRetiro
      };
    } catch (error) {
      console.error('Error al solicitar retiro:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un retiro con Stripe
   * @param {Object} detallesRetiro - Detalles del retiro con Stripe
   * @param {number} monto - Monto a retirar
   * @param {string} moneda - Moneda del retiro
   * @param {string} retiroId - ID del retiro
   * @returns {Promise<Object>} Resultado del retiro
   */
  async procesarRetiroStripe(detallesRetiro, monto, moneda, retiroId) {
    try {
      const {
        accountId // ID de la cuenta conectada en Stripe
      } = detallesRetiro;
      
      // Crear transferencia a la cuenta conectada
      const transfer = await this.stripeAPI.createTransfer({
        amount: Math.round(monto * 100), // Convertir a centavos
        currency: moneda.toLowerCase(),
        destinationAccountId: accountId,
        description: `Retiro de fondos - ID: ${retiroId}`,
        metadata: {
          retiroId
        }
      });
      
      return {
        id: transfer.id,
        estado: transfer.status,
        metodo: 'stripe'
      };
    } catch (error) {
      console.error('Error al procesar retiro con Stripe:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un retiro con PayPal
   * @param {Object} detallesRetiro - Detalles del retiro con PayPal
   * @param {number} monto - Monto a retirar
   * @param {string} moneda - Moneda del retiro
   * @param {string} retiroId - ID del retiro
   * @returns {Promise<Object>} Resultado del retiro
   */
  async procesarRetiroPayPal(detallesRetiro, monto, moneda, retiroId) {
    try {
      const {
        email // Email de PayPal del creador
      } = detallesRetiro;
      
      // Crear pago
      const payout = await this.paypalAPI.createPayout({
        batchId: `RETIRO_${retiroId}`,
        emailSubject: 'Retiro de fondos de la plataforma de monetización',
        emailMessage: 'Has recibido un retiro de fondos de tu billetera en la plataforma',
        items: [{
          recipientType: 'EMAIL',
          amount: {
            value: monto.toString(),
            currency: moneda
          },
          note: `Retiro de fondos - ID: ${retiroId}`,
          senderItemId: retiroId,
          receiver: email
        }]
      });
      
      return {
        id: payout.batch_header.payout_batch_id,
        estado: payout.batch_header.batch_status,
        metodo: 'paypal'
      };
    } catch (error) {
      console.error('Error al procesar retiro con PayPal:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un retiro con criptomonedas
   * @param {Object} detallesRetiro - Detalles del retiro con criptomonedas
   * @param {number} monto - Monto a retirar
   * @param {string} moneda - Moneda del retiro
   * @param {string} retiroId - ID del retiro
   * @returns {Promise<Object>} Resultado del retiro
   */
  async procesarRetiroCrypto(detallesRetiro, monto, moneda, retiroId) {
    try {
      const {
        address // Dirección de la billetera del creador
      } = detallesRetiro;
      
      // Obtener la cuenta de la plataforma para enviar los fondos
      const platformAccount = {
        address: process.env.CRYPTO_PLATFORM_ADDRESS,
        privateKey: process.env.CRYPTO_PLATFORM_PRIVATE_KEY
      };
      
      // Enviar transacción
      const receipt = await this.cryptoAPI.sendTransaction({
        fromAddress: platformAccount.address,
        privateKey: platformAccount.privateKey,
        toAddress: address,
        amount: monto, // Monto en ETH
        gasLimit: 21000
      });
      
      return {
        id: receipt.transactionHash,
        estado: receipt.status ? 'confirmado' : 'fallido',
        metodo: 'crypto',
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error al procesar retiro con criptomonedas:', error.message);
      throw error;
    }
  }

  /**
   * Procesa un retiro a cuenta bancaria
   * @param {Object} detallesRetiro - Detalles del retiro a banco
   * @param {number} monto - Monto a retirar
   * @param {string} moneda - Moneda del retiro
   * @param {string} retiroId - ID del retiro
   * @returns {Promise<Object>} Resultado del retiro
   */
  async procesarRetiroBanco(detallesRetiro, monto, moneda, retiroId) {
    try {
      const {
        nombreBanco,
        numeroCuenta,
        titularCuenta,
        codigoSwift
      } = detallesRetiro;
      
      // Aquí se implementaría la lógica para procesar transferencias bancarias
      // Por ahora, simulamos el proceso
      console.log(`Procesando retiro bancario: ${monto} ${moneda} a ${titularCuenta} - ${numeroCuenta} (${nombreBanco})`);
      
      return {
        id: `BANCO_${retiroId}`,
        estado: 'procesando',
        metodo: 'banco',
        fechaEstimadaAcreditacion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 días después
      };
    } catch (error) {
      console.error('Error al procesar retiro bancario:', error.message);
      throw error;
    }
  }
}

module.exports = SistemaComisiones;
