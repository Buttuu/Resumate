require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse/lib/pdf-parse");
const cors = require("cors");
const path = require("path");

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// serve frontend
const frontendPath = path.join(__dirname, "public");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// upload config
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ================= AI FUNCTION =================

async function analyzeResumeAI(resumeText, jobRole) {

  const trimmedText = resumeText.substring(0, 6000);

  const prompt = `
You are an ATS resume analyzer.

Job Role: ${jobRole}

Resume Content:
${trimmedText}

Return ONLY valid JSON.

{
  "atsScore": number,
  "matchedSkills": [],
  "missingSkills": [],
  "suggestions": []
}
`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ResuMate"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content: "You analyze resumes for ATS compatibility."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 700
      })
    }
  );

  const data = await response.json();

  if (!data.choices) {
    console.error("AI ERROR:", data);
    throw new Error(data.error?.message || "AI response invalid");
  }

  const text = data.choices[0].message.content;

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    console.error("RAW AI RESPONSE:", text);
    throw new Error("AI returned invalid format");
  }

  return JSON.parse(match[0]);
}

// ================= API =================

app.post("/analyze", upload.single("resume"), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ error: "Resume file required" });
    }

    const jobRole = req.body.role || "Software Developer";

    const pdfData = await pdfParse(req.file.buffer);

    const result = await analyzeResumeAI(pdfData.text, jobRole);

    res.json(result);

  } catch (error) {

    console.error("SERVER ERROR:", error.message);

    res.status(500).json({
      error: "Resume analysis failed",
      details: error.message
    });

  }

});

// health check
app.get("/api", (req, res) => {
  res.send("ResuMate backend running");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Loaded API Key:", process.env.OPENROUTER_API_KEY);
  
});
