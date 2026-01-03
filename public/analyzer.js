import fetch from "node-fetch";

// ===============================
// 🔐 OPENROUTER CONFIG
// ===============================
const OPENROUTER_API_KEY = "PASTE_YOUR_OPENROUTER_API_KEY_HERE";
const MODEL = "openai/gpt-4o-mini";

// ===============================
// AI RESUME ANALYSIS FUNCTION
// ===============================
export async function analyzeResumeAI(resumeText, jobRole) {
  const prompt = `
You are an ATS resume analyzer.

Job Role: ${jobRole}

Resume Content:
${resumeText}

Return ONLY valid JSON like this:
{
  "atsScore": number,
  "matchedSkills": [],
  "missingSkills": [],
  "suggestions": []
}
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Resume Analyzer"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      }
    );

    const data = await response.json();

    // 🔴 Handle API errors safely
    if (!data.choices || !data.choices[0]) {
      console.error("❌ OpenRouter Error:", data);
      return fallbackResponse("AI did not return valid output");
    }

    const text = data.choices[0].message.content;

    // 🔐 Extract JSON safely
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return fallbackResponse("Invalid JSON from AI");
    }

    return JSON.parse(match[0]);
  } catch (error) {
    console.error("❌ Analyzer Error:", error);
    return fallbackResponse("AI processing failed");
  }
}

// ===============================
// FALLBACK RESPONSE (SAFE)
// ===============================
function fallbackResponse(reason) {
  return {
    atsScore: 0,
    matchedSkills: [],
    missingSkills: [],
    suggestions: [reason]
  };
}
