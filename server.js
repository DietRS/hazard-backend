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
    const formData = req.body;

    // Generate unique form number
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
    const formNumber = `${ymd}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Save to MongoDB
    const hazardForm = new HazardForm({ ...formData, formNumber });
    await hazardForm.save();
    console.log("✅ Form saved to MongoDB");

    // Send notification email via Brevo
    await sendEmail({
  to: process.env.NOTIFY_TO,
  subject: `Hazard Assessment Form ${formNumber}`,
  html: `
    <h2>Site Specific Hazard Assessment</h2>
    <p><strong>Company:</strong> ${formData.company}</p>
    <p><strong>Job Description:</strong> ${formData.jobDescription}</p>
    <p><strong>Location:</strong> ${formData.location}</p>
    <p><strong>Date:</strong> ${formData.date}</p>
    <p><strong>Client Emergency Contact:</strong> ${formData.clientEmergencyContact}</p>

    <hr/>

    <h3>Client & Supervisor</h3>
    <p><strong>Client:</strong> ${formData.clientName}</p>
    <p><strong>Supervisor:</strong> ${formData.supervisorName}</p>

    <hr/>

    <h3>Signatures</h3>
    <table style="width:100%; text-align:center; border-collapse:collapse;">
      <tr>
        <td style="border:1px solid #ccc; padding:10px;">
          <strong>Worker</strong><br/>
          <img src="${formData.workerSignature}" alt="Worker Signature" style="max-height:80px;"/><br/>
        </td>
        <td style="border:1px solid #ccc; padding:10px;">
          <strong>Client</strong><br/>
          <img src="${formData.clientSignature}" alt="Client Signature" style="max-height:80px;"/><br/>
          <small>Contact: ${formData.clientContactNumber}</small>
        </td>
        <td style="border:1px solid #ccc; padding:10px;">
          <strong>Supervisor</strong><br/>
          <img src="${formData.supervisorSignature}" alt="Supervisor Signature" style="max-height:80px;"/><br/>
          <small>Contact: ${formData.representativeEmergencyContact}</small>
        </td>
      </tr>
    </table>
  `
});

    res.json({ success: true, formNumber });
  } catch (err) {
    console.error("❌ Error in /submit-form:", err);
    res.status(500).json({ success: false, error: err.message });
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
