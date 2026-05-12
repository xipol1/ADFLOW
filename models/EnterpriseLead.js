const mongoose = require('mongoose');

/**
 * Lead captured from the "Contact sales" CTA on /pricing for the
 * Enterprise tier. Admins triage these manually; once a deal is closed,
 * the corresponding Usuario.subscription is granted via the admin panel
 * (status='granted', plan='*_enterprise', grantedBy=admin._id).
 */
const EnterpriseLeadSchema = new mongoose.Schema(
  {
    // Optional — present when the lead is logged in.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['creator', 'advertiser'], required: true },
    company: { type: String, default: '', trim: true },
    estimatedMonthlySpend: { type: Number, default: 0 }, // advertiser-side
    estimatedChannels: { type: Number, default: 0 },     // creator-side
    message: { type: String, default: '', trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
      default: 'new',
      index: true,
    },
    notes: { type: String, default: '' }, // admin-only
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.EnterpriseLead ||
  mongoose.model('EnterpriseLead', EnterpriseLeadSchema);
