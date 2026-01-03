const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const path = require("path");

// ===============================
// 🔐 OPENROUTER CONFIG
// ===============================
const OPENROUTER_API_KEY = "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";
const PORT = 3000;

// ===============================
// FETCH (node-fetch safe import)
// ===============================
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// ===============================
// AI ANALYZER FUNCTION (SAFE)
// ===============================
async function analyzeResumeAI(resumeText, jobRole) {
  const prompt = `
You are an ATS resume analyzer.

Job Role: ${jobRole}

Resume Content:
${resumeText}

STRICT RULES:
- Respond ONLY in valid JSON
- No explanation
- No markdown

JSON FORMAT:
{
  "atsScore": number,
  "matchedSkills": [],
  "missingSkills": [],
  "suggestions": []
}
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "AI Resume Analyzer"
  },
  body: JSON.stringify({
    model: "openai/gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an ATS resume analyzer. Respond clearly and accurately."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0,
    max_tokens: 800
  })
});

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Empty AI response");
  }

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    console.error("❌ RAW AI RESPONSE:", text);
    throw new Error("AI did not return valid JSON");
  }

  return JSON.parse(match[0]);
}

// ===============================
// EXPRESS APP SETUP
// ===============================
const app = express();
app.use(cors());

// ===============================
// SERVE FRONTEND
// ===============================
const frontendPath = path.join(__dirname, "public");

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ===============================
// FILE UPLOAD
// ===============================
const upload = multer();

// ===============================
// ANALYZE API
// ===============================
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file required" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const jobRole = req.body.role || "General";

    const result = await analyzeResumeAI(pdfData.text, jobRole);
    res.json(result);

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.status(500).json({
      error: "AI Resume Analysis Failed",
      details: error.message
    });
  }
});

// ===============================
// HEALTH CHECK
// ===============================
app.get("/api", (req, res) => {
  res.send("✅ Backend API running");
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
