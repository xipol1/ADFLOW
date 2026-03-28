const mongoose = require('mongoose');

const ChannelListSchema = new mongoose.Schema(
  {
    propietario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', index: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '', trim: true },
    canales: { type: [mongoose.Schema.Types.ObjectId], ref: 'Canal', default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.models.ChannelList || mongoose.model('ChannelList', ChannelListSchema);

