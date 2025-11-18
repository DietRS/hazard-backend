// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
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

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ✅ Health check route
app.get("/health", (req, res) => {
  res.send("Backend is running on Render");
});

// ✅ Debug route to confirm frontend → backend connection
app.get("/ping", (req, res) => {
  console.log("✅ Ping received from frontend");
  res.json({ message: "Backend is reachable" });
});

// ✅ Hazard form submission route
app.post("/submit-form", async (req, res) => {
  try {
    const {
      company, location, jobDescription, date,
      hazards = [], hazardControls = {},
      ppe = [], additionalHazards = "", additionalControls = "",
      tailgateMeeting = "",
      representatives = [],
      representativeEmergencyContact = "",
      clientEmergencyContact = "",
      workerSignature = "",
      clientName = "", clientSignature = "",
      supervisorName = "", supervisorSignature = ""
    } = req.body;

    if (!company || !location || !jobDescription || !date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Generate unique form number
    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
    const formNumber = `${ymd}-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Save to MongoDB
    const doc = new HazardForm({
      formNumber, company, location, jobDescription, date,
      hazards, hazardControls, ppe, additionalHazards, additionalControls,
      tailgateMeeting, representatives,
      representativeEmergencyContact, clientEmergencyContact,
      workerSignature, clientName, clientSignature, supervisorName, supervisorSignature
    });

    const saved = await doc.save();
    console.log("✅ Form saved to MongoDB");

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFY_TO || process.env.GMAIL_USER,
      subject: `Hazard Assessment Form ${formNumber}`,
      html: `<h2>Site Specific Hazard Assessment</h2>
             <p><strong>Company:</strong> ${company}</p>
             <p><strong>Job Description:</strong> ${jobDescription}</p>
             <p><strong>Location:</strong> ${location}</p>
             <p><strong>Date:</strong> ${date}</p>`
    });

    console.log("✅ Email sent");
    res.status(200).json({ success: true, formNumber, id: saved._id.toString() });

  } catch (err) {
    console.error("❌ Error in /submit-form:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  serverSelectionTimeoutMS: 30000
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 HazardApp backend running on port ${PORT}`);
});
