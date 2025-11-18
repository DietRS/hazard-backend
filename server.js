// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");   // ✅ Brevo API
const HazardForm = require("./models/HazardForm");

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(cors({
  origin: [
    "http://localhost:3000", // local dev
    "https://hazard-frontend-neon.vercel.app" // ✅ your Vercel frontend URL
  ],
  methods: ["GET", "POST"]
}));

// Debug logging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.send("Backend is running on Render");
});

// Ping route
app.get("/ping", (req, res) => {
  console.log("✅ Ping received from frontend");
  res.json({ message: "Backend is reachable" });
});

// ✅ Brevo email helper
async function sendEmail({ to, subject, html }) {
  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: { email: process.env.NOTIFY_FROM },   // must be verified in Brevo
      to: [{ email: to }],
      subject,
      htmlContent: html
    }, {
      headers: { "api-key": process.env.BREVO_API_KEY }
    });
    console.log("✅ Email sent via Brevo");
  } catch (err) {
    console.error("❌ Error sending email via Brevo:", err.response?.data || err.message);
  }
}

// ✅ Hazard form submission route
app.post("/submit-form", async (req, res) => {
  try {
    const prefix = (req.body.representativeCompany || "GEN")
      .substring(0, 3)
      .toUpperCase();
    const formNumber = `${prefix}-${Date.now()}`;

    const hazardForm = new HazardForm({ ...req.body, formNumber });
    await hazardForm.save();

    const html = `
      <h2 style="text-align:center;">SITE SPECIFIC HAZARD ASSESSMENT</h2>
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <tr style="background:#f2f2f2;">
          <td style="border:1px solid #000; padding:8px;"><strong>Company/Client:</strong> ${req.body.company}</td>
          <td style="border:1px solid #000; padding:8px;"><strong>Job Description:</strong> ${req.body.jobDescription}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px;"><strong>Location/L.S.D.:</strong> ${req.body.location}</td>
          <td style="border:1px solid #000; padding:8px;"><strong>Date:</strong> ${req.body.date}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px;"><strong>Client Emergency Contact:</strong> ${req.body.clientEmergencyContact}</td>
          <td style="border:1px solid #000; padding:8px;"><strong>Supervisor Name:</strong> ${req.body.supervisorName}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px;"><strong>Representative Company:</strong> ${req.body.representativeCompany}</td>
          <td style="border:1px solid #000; padding:8px;"><strong>Representative Emergency Contact:</strong> ${req.body.representativeEmergencyContact}</td>
        </tr>
      </table>

      <h3>Hazards and Controls</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <tr style="background:#d9d9d9;">
          <th style="border:1px solid #000; padding:6px;">Hazard</th>
          <th style="border:1px solid #000; padding:6px;">Controls</th>
        </tr>
        ${Object.entries(req.body.hazardControls || {})
          .map(([hazard, controls]) => `
            <tr>
              <td style="border:1px solid #000; padding:6px;">${hazard}</td>
              <td style="border:1px solid #000; padding:6px;">${controls.join(", ")}</td>
            </tr>
          `).join("")}
      </table>

      <h3>PPE Required</h3>
      <p>${(req.body.ppe || []).join(", ")}</p>

      <h3>Additional Hazards</h3>
      <p>${req.body.additionalHazards}</p>

      <h3>Additional Controls</h3>
      <p>${req.body.additionalControls}</p>

      <h3>Tailgate / Safety Meeting</h3>
      <p>${req.body.tailgateMeeting}</p>

      <h3>Representatives</h3>
      <ul>
        ${(req.body.representatives || []).map(r => `<li>${r}</li>`).join("")}
      </ul>

      <h3>Acknowledgement</h3>
      <p>
        I acknowledge that I have participated in the hazard assessment and understand the hazards,
        controls, and PPE requirements for this job. I agree to follow all safety procedures and
        use the required protective equipment.
      </p>

      <h3>Signatures</h3>
      <table style="width:100%; border-collapse:collapse; text-align:center;">
        <tr>
          <td style="border:1px solid #000; padding:10px;">
            <strong>Worker</strong><br/>
            <img src="${req.body.workerSignature}" style="max-height:80px;"/><br/>
          </td>
          <td style="border:1px solid #000; padding:10px;">
            <strong>Client</strong><br/>
            <img src="${req.body.clientSignature}" style="max-height:80px;"/><br/>
            <small>Contact: ${req.body.clientContactNumber}</small>
          </td>
          <td style="border:1px solid #000; padding:10px;">
            <strong>Supervisor</strong><br/>
            <img src="${req.body.supervisorSignature}" style="max-height:80px;"/><br/>
            <small>Contact: ${req.body.supervisorContactNumber}</small>
          </td>
        </tr>
      </table>
    `;

    await sendEmail({
      to: process.env.NOTIFY_TO,
      subject: `Hazard Assessment Form ${formNumber}`,
      html
    });

    res.json({ success: true, formNumber });
  } catch (err) {
    console.error("❌ Error submitting form:", err);
    res.status(500).json({ success: false, error: "Submission failed" });
  }
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
