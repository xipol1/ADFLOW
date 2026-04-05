/**
 * Invoice Service — Generates HTML invoices for transactions.
 * Lightweight approach: returns styled HTML that the browser can print to PDF.
 */

const config = require('../config/config');

/**
 * Generate an HTML invoice for a transaction.
 * @param {Object} transaction - Populated Transaccion document
 * @param {Object} user - The requesting user
 * @returns {string} Complete HTML document
 */
function generateInvoiceHTML(transaction, user) {
  const appName = config.app.nombre || 'Channelad';
  const txId = String(transaction._id || '').slice(-8).toUpperCase();
  const date = transaction.paidAt || transaction.createdAt || new Date();
  const dateStr = new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const amount = Number(transaction.amount || 0);
  const tipo = transaction.tipo || 'pago';
  const status = transaction.status || 'pending';
  const description = transaction.description || `Transaccion ${tipo}`;

  const commissionRate = 0.10;
  const commission = tipo === 'pago' ? +(amount * commissionRate).toFixed(2) : 0;
  const subtotal = amount;
  const total = amount;

  const advertiserName = transaction.advertiser?.nombre || transaction.advertiser?.email || user?.nombre || user?.email || '';
  const creatorName = transaction.creator?.nombre || transaction.creator?.email || '';

  const statusLabels = {
    pending: 'Pendiente', escrow: 'En escrow', paid: 'Pagado',
    refunded: 'Reembolsado', failed: 'Fallido',
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factura ${txId} — ${appName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; } .logo span { color: #7c3aed; }
    .invoice-num { text-align: right; } .invoice-num h2 { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; } .invoice-num p { font-size: 20px; font-weight: 700; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 32px; } .party { width: 45%; } .party h3 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; } .party p { font-size: 14px; line-height: 1.6; }
    .meta { display: flex; gap: 40px; margin-bottom: 32px; } .meta-item h3 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; } .meta-item p { font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; } th { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; } td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; } td:last-child, th:last-child { text-align: right; }
    .totals { display: flex; justify-content: flex-end; } .totals-box { width: 280px; } .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; } .totals-row.total { font-size: 18px; font-weight: 800; padding-top: 12px; border-top: 2px solid #1e293b; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-paid { background: rgba(16,185,129,0.1); color: #059669; } .status-pending { background: rgba(245,158,11,0.1); color: #d97706; } .status-escrow { background: rgba(59,130,246,0.1); color: #2563eb; } .status-refunded { background: rgba(239,68,68,0.1); color: #dc2626; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer">Imprimir / Guardar como PDF</button>
  </div>

  <div class="header">
    <div class="logo">Channel<span>ad</span></div>
    <div class="invoice-num">
      <h2>Factura</h2>
      <p>#${txId}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>De</h3>
      <p><strong>${appName}</strong><br>channelad.io<br>NIF: Pendiente</p>
    </div>
    <div class="party">
      <h3>Para</h3>
      <p><strong>${advertiserName}</strong>${creatorName ? `<br>Creador: ${creatorName}` : ''}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><h3>Fecha</h3><p>${dateStr}</p></div>
    <div class="meta-item"><h3>Estado</h3><p><span class="status status-${status}">${statusLabels[status] || status}</span></p></div>
    <div class="meta-item"><h3>Tipo</h3><p>${tipo.charAt(0).toUpperCase() + tipo.slice(1)}</p></div>
  </div>

  <table>
    <thead><tr><th>Concepto</th><th>Importe</th></tr></thead>
    <tbody>
      <tr><td>${description}</td><td>${subtotal.toFixed(2)} EUR</td></tr>
      ${commission > 0 ? `<tr><td>Comision plataforma (${(commissionRate * 100).toFixed(0)}%)</td><td>-${commission.toFixed(2)} EUR</td></tr>` : ''}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal</span><span>${subtotal.toFixed(2)} EUR</span></div>
      ${commission > 0 ? `<div class="totals-row"><span>Comision</span><span>-${commission.toFixed(2)} EUR</span></div>` : ''}
      <div class="totals-row total"><span>Total</span><span>${total.toFixed(2)} EUR</span></div>
    </div>
  </div>

  <div class="footer">
    <p>${appName} — channelad.io — Todos los derechos reservados ${new Date().getFullYear()}</p>
    <p style="margin-top:4px">Este documento es una factura simplificada. Para factura completa con IVA, contacta soporte.</p>
  </div>
</body>
</html>`;
}

module.exports = { generateInvoiceHTML };
