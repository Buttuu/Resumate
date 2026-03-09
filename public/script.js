const form = document.getElementById("resumeForm");
const fileInput = document.getElementById("resumeFile");
const fileName = document.getElementById("fileName");
const loader = document.getElementById("loader");
const results = document.getElementById("results");
const scoreText = document.getElementById("scoreText");
const progressCircle = document.getElementById("progressCircle");
const matchedSkills = document.getElementById("matchedSkills");
const missingSkills = document.getElementById("missingSkills");
const suggestions = document.getElementById("suggestions");
const downloadBtn = document.getElementById("downloadPdf");
const matchPercent = document.getElementById("matchPercent");

let resumeFileName = "";
let aiSummary = "";
let currentRole = "";

fileInput.addEventListener("change", e => {
  if (e.target.files.length) {
    resumeFileName = e.target.files[0].name;
    fileName.textContent = "Selected: " + resumeFileName;
  }
});

form.addEventListener("submit", async e => {
  e.preventDefault();

  loader.classList.add("active");
  results.classList.remove("active");
  downloadBtn.style.display = "none";

  const formData = new FormData(form);
  currentRole = formData.get("role");

  try {
    const res = await fetch("/analyze", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    /* ----------- NEW SAFE ERROR HANDLING ----------- */
    if (!res.ok) {
      throw new Error(data.details || data.error || "Server error");
    }

    if (!data.atsScore) {
      throw new Error("Invalid AI response");
    }
    /* ----------------------------------------------- */

    console.log("API RESPONSE:", data);

    setTimeout(() => {
      loader.classList.remove("active");
      results.classList.add("active");
      results.scrollIntoView({ behavior: "smooth" });

      const normalizedScore =
        data.atsScore <= 1
          ? Math.round(data.atsScore * 100)
          : Math.round(data.atsScore);

      scoreText.textContent = normalizedScore + "%";

      const circumference = 2 * Math.PI * 85;
      progressCircle.style.strokeDashoffset =
        circumference - (circumference * normalizedScore) / 100;

      matchedSkills.innerHTML = data.matchedSkills
        .map(s => `<span class="tag tag-success">${s}</span>`)
        .join("");

      missingSkills.innerHTML = data.missingSkills
        .map(s => `<span class="tag tag-warning">${s}</span>`)
        .join("");

      const total = data.matchedSkills.length + data.missingSkills.length;
      const percent = total
        ? Math.round((data.matchedSkills.length / total) * 100)
        : 0;

      matchPercent.textContent = percent + "%";

      suggestions.innerHTML = data.suggestions
        .map(s => `<li>${s}</li>`)
        .join("");

      aiSummary = `This resume shows strong alignment for the ${currentRole} role. Matched ${percent}% of essential skills. Strengthening the missing areas will significantly improve ATS ranking and recruiter appeal.`;

      downloadBtn.style.display = "block";
    }, 2000);

  } catch (err) {
    loader.classList.remove("active");
    console.error(err);

    alert("Resume analysis failed. " + err.message);
  }
});

downloadBtn.addEventListener("click", () => {
  if (!window.jspdf) {
    alert("PDF library not loaded. Refresh the page.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 0;

  doc.setFillColor(88, 101, 242);
  doc.rect(0, 0, pageWidth, 50, "F");

  doc.setFillColor(139, 92, 246);
  doc.triangle(pageWidth - 40, 0, pageWidth, 0, pageWidth, 40, "F");
  doc.triangle(0, 30, 0, 50, 30, 50, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("ResuMate", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Skill Intelligence Report", pageWidth / 2, 32, { align: "center" });

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  doc.setFontSize(9);
  doc.text(currentDate, pageWidth / 2, 40, { align: "center" });

  y = 60;
  doc.setTextColor(0, 0, 0);

  const cardHeight = 55;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, "F");

  doc.setDrawColor(88, 101, 242);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, "S");

  const score = parseInt(scoreText.textContent) || 0;

  doc.setFontSize(48);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(88, 101, 242);
  doc.text(score + "%", margin + 35, y + 32, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("ATS Score", margin + 35, y + 42, { align: "center" });

  const infoX = margin + 80;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Resume Details", infoX, y + 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  doc.text("File Name:", infoX, y + 24);
  doc.setFont("helvetica", "bold");
  doc.text(resumeFileName, infoX + 25, y + 24);

  doc.setFont("helvetica", "normal");
  doc.text("Target Role:", infoX, y + 32);
  doc.setFont("helvetica", "bold");
  doc.text(currentRole, infoX + 25, y + 32);

  doc.setFont("helvetica", "normal");
  doc.text("Match Rate:", infoX, y + 40);
  doc.setFont("helvetica", "bold");
  const matchRate = matchPercent.textContent;
  doc.text(matchRate, infoX + 25, y + 40);

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);

  doc.text("Generated by ResuMate", margin, pageHeight - 12);

  doc.text(
    "ATS Optimized • Print Ready",
    pageWidth - margin,
    pageHeight - 12,
    { align: "right" }
  );

  doc.save("Resumate Report.pdf");
});
