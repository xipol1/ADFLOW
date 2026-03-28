const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, default: '', trim: true },
    activo: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Partner || mongoose.model('Partner', PartnerSchema);

