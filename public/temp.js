document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     ELEMENT REFERENCES
  ================================ */
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

  /* ===============================
     GLOBAL STATE
  ================================ */
  let resumeFileName = "";
  let aiSummary = "";
  let currentRole = "";

  /* ===============================
     FILE SELECT
  ================================ */
  fileInput.addEventListener("change", e => {
    if (e.target.files.length) {
      resumeFileName = e.target.files[0].name;
      fileName.textContent = "Selected: " + resumeFileName;
    }
  });

  /* ===============================
     FORM SUBMIT
  ================================ */
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

      setTimeout(() => {
        loader.classList.remove("active");
        results.classList.add("active");
        results.scrollIntoView({ behavior: "smooth" });

        /* ATS SCORE */
        scoreText.textContent = data.atsScore + "%";
        const circumference = 2 * Math.PI * 85;
        progressCircle.style.strokeDashoffset =
          circumference - (circumference * data.atsScore) / 100;

        /* SKILLS */
        matchedSkills.innerHTML = data.matchedSkills
          .map(s => `<span class="tag tag-success">${s}</span>`)
          .join("");

        missingSkills.innerHTML = data.missingSkills
          .map(s => `<span class="tag tag-warning">${s}</span>`)
          .join("");

        /* MATCH % */
        const total = data.matchedSkills.length + data.missingSkills.length;
        const percent = total
          ? Math.round((data.matchedSkills.length / total) * 100)
          : 0;

        matchPercent.textContent = percent + "%";

        /* SUGGESTIONS */
        suggestions.innerHTML = data.suggestions
          .map(s => `<li>${s}</li>`)
          .join("");

        /* AI SUMMARY */
        aiSummary = `This resume shows strong alignment for the ${currentRole} role.
Matched ${percent}% of essential skills. Strengthening the missing areas will
significantly improve ATS ranking and recruiter appeal.`;

        downloadBtn.style.display = "block";
      }, 2000);

    } catch (err) {
      loader.classList.remove("active");
      alert("Resume analysis failed. Try again.");
    }
  });

  /* ===============================
     PDF DOWNLOAD (FIXED)
  ================================ */
  downloadBtn.addEventListener("click", () => {

    if (!window.jspdf) {
      alert("PDF library not loaded. Refresh page.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    const score = Math.round(
    parseFloat(scoreText.textContent.replace("%", ""))
    );

    /* HEADER */
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 35, "F");

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("AI Resume ATS Report", pageWidth / 2, 22, { align: "center" });

    doc.setFontSize(11);
    doc.text("Modern ATS & Skill Intelligence", pageWidth / 2, 30, { align: "center" });

    y = 48;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(`Resume: ${resumeFileName}`, 20, y); y += 7;
    doc.text(`Target Role: ${currentRole}`, 20, y); y += 7;
    doc.text(`ATS Score: ${score}`, 20, y); y += 12;

    /* AI SUMMARY */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AI Summary", 20, y); y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(aiSummary, pageWidth - 40), 20, y);
    y += 20;

    /* MATCHED SKILLS */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Matched Skills", 20, y); y += 6;

    doc.setFont("helvetica", "normal");
    matchedSkills.querySelectorAll(".tag").forEach(tag => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text("• " + tag.textContent, 25, y);
      y += 6;
    });

    /* MISSING SKILLS */
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Missing Skills", 20, y); y += 6;

    doc.setFont("helvetica", "normal");
    missingSkills.querySelectorAll(".tag").forEach(tag => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text("• " + tag.textContent, 25, y);
      y += 6;
    });

    /* FOOTER */
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "Generated by AI Resume Analyzer • ATS Optimized • Print Ready",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    doc.save("AI_ATS_Resume_Report.pdf");
  });

});
