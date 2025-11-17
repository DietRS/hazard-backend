require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const HazardForm = require('./models/HazardForm');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: 'http://192.168.1.75:3000' })); // allow your phone frontend

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  serverSelectionTimeoutMS: 30000
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err.message));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
});

app.post('/submit-form', async (req, res) => {
  try {
    const {
      company, location, jobDescription, date,
      hazards = [], hazardControls = {},
      ppe = [], additionalHazards = '', additionalControls = '',
      tailgateMeeting = '',
      representatives = [],
      representativeEmergencyContact = '',
      clientEmergencyContact = '',
      workerSignature = '',
      clientName = '', clientSignature = '',
      supervisorName = '', supervisorSignature = ''
    } = req.body;

    if (!company || !location || !jobDescription || !date) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const formNumber = `${ymd}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const doc = new HazardForm({
      formNumber, company, location, jobDescription, date,
      hazards, hazardControls, ppe, additionalHazards, additionalControls,
      tailgateMeeting, representatives,
      representativeEmergencyContact, clientEmergencyContact,
      workerSignature, clientName, clientSignature, supervisorName, supervisorSignature
    });

    const saved = await doc.save();

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFY_TO || process.env.GMAIL_USER,
      subject: `Hazard Assessment Form ${formNumber}`,
      html: `
        <h2>Site Specific Hazard Assessment</h2>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Job Description:</strong> ${jobDescription}</p>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Date:</strong> ${date}</p>

        <h3>Hazards and Controls</h3>
        <ul>
          ${hazards.map(hazard => `
            <li>
              <strong>${hazard}</strong>
              ${hazardControls[hazard] && hazardControls[hazard].length > 0
                ? `<ul>${hazardControls[hazard].map(c => `<li>${c}</li>`).join('')}</ul>`
                : ''
              }
            </li>
          `).join('')}
        </ul>

        <h3>PPE Required</h3>
        <ul>${ppe.map(p => `<li>${p}</li>`).join('')}</ul>

        <h3>Additional Hazards</h3>
        <p>${additionalHazards}</p>

        <h3>Additional Controls</h3>
        <p>${additionalControls}</p>

        <h3>Tailgate / Safety Meeting</h3>
        <p>${tailgateMeeting}</p>

        <h3>PowerServ Representatives</h3>
        <ul>${representatives.map(r => `<li>${r}</li>`).join('')}</ul>
        <p><strong>Representative Emergency Contact #:</strong> ${representativeEmergencyContact}</p>
        ${workerSignature ? `<img src="${workerSignature}" alt="Representative Signature" style="border:1px solid #000; width:200px;" />` : ''}

        <h3>Client</h3>
        <p>${clientName}</p>
        <p><strong>Client Emergency Contact #:</strong> ${clientEmergencyContact}</p>
        ${clientSignature ? `<img src="${clientSignature}" alt="Client Signature" style="border:1px solid #000; width:200px;" />` : ''}

        <h3>Supervisor</h3>
        <p>${supervisorName}</p>
        ${supervisorSignature ? `<img src="${supervisorSignature}" alt="Supervisor Signature" style="border:1px solid #000; width:200px;" />` : ''}
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, formNumber, id: saved._id.toString() });
  } catch (err) {
    console.error('❌ Error in /submit-form:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 HazardApp backend running on port ${PORT}`));
