const mongoose = require('mongoose');

const hazardFormSchema = new mongoose.Schema({
  formNumber: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  jobDescription: { type: String, required: true },
  date: { type: String, required: true },

  // Hazards and PPE
  hazards: { type: [String], default: [] },
  hazardControls: { type: Object, default: {} },
  ppe: { type: [String], default: [] },
  additionalHazards: { type: String, default: '' },
  additionalControls: { type: String, default: '' },

  // Meeting and representatives
  tailgateMeeting: { type: String, default: '' },
  representatives: { type: [String], default: [] },

  // Representative company + emergency contacts
  representativeCompany: { type: String, default: '' },   // NEW FIELD
  representativeEmergencyContact: { type: String, default: '' },
  clientEmergencyContact: { type: String, default: '' },

  // Signatures and names
  workerSignature: { type: String, default: '' },
  clientName: { type: String, default: '' },
  clientSignature: { type: String, default: '' },
  clientContactNumber: { type: String, default: '' },
  supervisorName: { type: String, default: '' },
  supervisorSignature: { type: String, default: '' },
  supervisorContactNumber: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('HazardForm', hazardFormSchema);
