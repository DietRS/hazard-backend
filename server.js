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
    // Extract representative company prefix
    const prefix = (req.body.representativeCompany || "GEN")
      .substring(0, 3)
      .toUpperCase();

    // Generate unique form number with prefix
    const formNumber = `${prefix}-${Date.now()}`;

    // Save to MongoDB
    const hazardForm = new HazardForm({
      ...req.body,
      formNumber
    });
    await hazardForm.save();

    // Build email HTML
    const html = `
      <h2>Site Specific Hazard Assessment</h2>
      <p><strong>Company:</strong> ${req.body.company}</p>
      <p><strong>Job Description:</strong> ${req.body.jobDescription}</p>
      <p><strong>Location:</strong> ${req.body.location}</p>
      <p><strong>Date:</strong> ${req.body.date}</p>
      <p><strong>Client Emergency Contact:</strong> ${req.body.clientEmergencyContact}</p>
      <p><strong>Supervisor Name:</strong> ${req.body.supervisorName}</p>
      <p><strong>Representative Company:</strong> ${req.body.representativeCompany}</p>
      <p><strong>Representative Emergency Contact:</strong> ${req.body.representativeEmergencyContact}</p>

      <hr/>

      <h3>Hazards and Controls</h3>
      ${Object.entries(req.body.hazardControls || {})
        .map(([hazard, controls]) => `
          <p><strong>${hazard}:</strong> ${controls.join(", ")}</p>
        `).join("")}

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

      <hr/>

      <h3>Signatures</h3>
      <table style="width:100%; text-align:center; border-collapse:collapse;">
        <tr>
          <td style="border:1px solid #ccc; padding:10px;">
            <strong>Worker</strong><br/>
            <img src="${req.body.workerSignature}" alt="Worker Signature" style="max-height:80px;"/><br/>
          </td>
          <td style="border:1px solid #ccc; padding:10px;">
            <strong>Client</strong><br/>
            <img src="${req.body.clientSignature}" alt="Client Signature" style="max-height:80px;"/><br/>
            <small>Contact: ${req.body.clientContactNumber}</small>
          </td>
          <td style="border:1px solid #ccc; padding:10px;">
            <strong>Supervisor</strong><br/>
            <img src="${req.body.supervisorSignature}" alt="Supervisor Signature" style="max-height:80px;"/><br/>
            <small>Contact: ${req.body.supervisorContactNumber}</small>
          </td>
        </tr>
      </table>
    `;

    // Send email via Brevo
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
