const mongoose = require('mongoose');

const hazardFormSchema = new mongoose.Schema({
  formNumber: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  jobDescription: { type: String, required: true },
  date: { type: String, required: true },
  hazards: { type: [String], default: [] },
  ppe: { type: [String], default: [] },
  additionalHazards: { type: String, default: '' },
  additionalControls: { type: String, default: '' },
  supervisorName: { type: String, default: '' },
  clientName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('HazardForm', hazardFormSchema);
