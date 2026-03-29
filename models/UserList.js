const mongoose = require('mongoose');

const UserListSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canal' }]
  },
  { timestamps: true }
);

// One user can't have duplicate list names
UserListSchema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.UserList || mongoose.model('UserList', UserListSchema);
