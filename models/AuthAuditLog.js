const mongoose = require('mongoose');

// Structured audit trail for authentication events. Use for forensics
// (when/where did this user sign up?), abuse detection (e.g. many failed
// logins from one IP), and answering "what happened to my account" tickets.
const AuthAuditLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'register.success',
        'register.failed',
        'login.success',
        'login.failed',
        'account.locked',
        '2fa.failed',
        'email.verified',
        'password.reset.requested',
        'password.reset.completed',
      ],
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null, index: true },
    email: { type: String, default: '', index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

AuthAuditLogSchema.index({ createdAt: -1 });
AuthAuditLogSchema.index({ email: 1, event: 1, createdAt: -1 });

module.exports = mongoose.models.AuthAuditLog || mongoose.model('AuthAuditLog', AuthAuditLogSchema);
