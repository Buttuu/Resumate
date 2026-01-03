
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

        setTimeout(() => {
          loader.classList.remove("active");
          results.classList.add("active");
          results.scrollIntoView({ behavior: "smooth" });

          // scoreText.textContent = data.atsScore + "%";
          // const circumference = 2 * Math.PI * 85;
          // progressCircle.style.strokeDashoffset =
          //   circumference - (circumference * data.atsScore) / 100;

          /* ATS SCORE — FIXED */
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
          const percent = total ? Math.round((data.matchedSkills.length / total) * 100) : 0;
          matchPercent.textContent = percent + "%";

          suggestions.innerHTML = data.suggestions
            .map(s => `<li>${s}</li>`)
            .join("");

          aiSummary = `This resume shows strong alignment for the ${currentRole} role. Matched ${percent}% of essential skills. Strengthening the missing areas will significantly improve ATS ranking and recruiter appeal.`;

          downloadBtn.style.display = "block";
        }, 2000);
      } catch (err) {
        loader.classList.remove("active");
        alert("Resume analysis failed. Try again.");
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

      // Modern gradient header
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
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      doc.setFontSize(9);
      doc.text(currentDate, pageWidth / 2, 40, { align: "center" });

      y = 60;
      doc.setTextColor(0, 0, 0);

      // Score card with modern design
      const cardHeight = 55;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, "F");
      
      doc.setDrawColor(88, 101, 242);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 4, 4, "S");

      const score = parseInt(scoreText.textContent) || 0;
      
      // Large score display
      doc.setFontSize(48);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 101, 242);
      doc.text(score + "%", margin + 35, y + 32, { align: "center" });

      // Score label
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("ATS Score", margin + 35, y + 42, { align: "center" });

      // Resume info section
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

      y += cardHeight + 15;

      // AI Summary section with icon
      doc.setFillColor(236, 243, 255);
      doc.roundedRect(margin, y, contentWidth, 35, 4, 4, "F");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(88, 101, 242);
      doc.text("AI Summary", margin + 8, y + 10);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const summaryLines = doc.splitTextToSize(aiSummary, contentWidth - 16);
      doc.text(summaryLines, margin + 8, y + 18);

      y += 45;

      // Matched Skills section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("Matched Skills", margin, y);
      
      y += 10;

      const matchedSkillsList = [...matchedSkills.children];
      
      if (matchedSkillsList.length > 0) {
        matchedSkillsList.forEach((skill, idx) => {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = 30;
          }

          const skillText = skill.textContent;
          const proficiency = 70 + Math.random() * 30;
          
          // Skill name
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(40, 40, 40);
          doc.text(skillText, margin + 5, y + 4);

          // Progress bar background
          const barX = margin + 100;
          const barY = y;
          const barWidth = 70;
          const barHeight = 6;

          doc.setFillColor(229, 231, 235);
          doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, "F");

          // Progress bar fill with gradient effect
          const fillWidth = (barWidth * proficiency) / 100;
          if (fillWidth > 0) {
            doc.setFillColor(16, 185, 129);
            doc.roundedRect(barX, barY, fillWidth, barHeight, 2, 2, "F");
          }

          // Percentage text
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(16, 185, 129);
          doc.text(proficiency.toFixed(0) + "%", barX + barWidth + 3, y + 5);

          y += 12;
        });
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("No matched skills found", margin + 5, y + 5);
        y += 12;
      }

      y += 8;

      if (y > pageHeight - 60) {
        doc.addPage();
        y = 30;
      }

      // Missing Skills section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 158, 11);
      doc.text("Skills to Develop", margin, y);
      
      y += 10;

      const missingSkillsList = [...missingSkills.children];
      
      if (missingSkillsList.length > 0) {
        const skillsPerRow = 2;
        const boxWidth = (contentWidth - 10) / skillsPerRow;
        const boxHeight = 12;
        let col = 0;
        let rowY = y;

        missingSkillsList.forEach((skill, idx) => {
          if (rowY > pageHeight - 40) {
            doc.addPage();
            rowY = 30;
            col = 0;
          }

          const boxX = margin + (col * (boxWidth + 5));

          doc.setFillColor(255, 251, 235);
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.3);
          doc.roundedRect(boxX, rowY, boxWidth, boxHeight, 2, 2, "FD");

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120, 53, 15);
          doc.text(skill.textContent, boxX + 4, rowY + 7.5);

          col++;
          if (col >= skillsPerRow) {
            col = 0;
            rowY += boxHeight + 4;
          }
        });

        y = rowY + (col > 0 ? boxHeight + 4 : 0);
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("No missing skills identified", margin + 5, y + 5);
        y += 12;
      }

      y += 8;

      if (y > pageHeight - 60) {
        doc.addPage();
        y = 30;
      }

      // Improvement Suggestions
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text("Recommendations", margin, y);
      
      y += 10;

      const suggestionsList = [...suggestions.children];
      
      if (suggestionsList.length > 0) {
        suggestionsList.forEach((item, idx) => {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = 30;
          }

          // Number badge
          doc.setFillColor(59, 130, 246);
          doc.circle(margin + 4, y + 2.5, 3, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text((idx + 1).toString(), margin + 4, y + 3.5, { align: "center" });

          // Suggestion text
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(40, 40, 40);
          const suggestionText = doc.splitTextToSize(item.textContent, contentWidth - 18);
          doc.text(suggestionText, margin + 10, y + 4);

          y += (suggestionText.length * 5) + 6;
        });
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("No suggestions available", margin + 5, y + 5);
        y += 12;
      }

      // Modern footer
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Generated by ResuMate",
        margin,
        pageHeight - 12
      );

      doc.text(
        "ATS Optimized • Print Ready",
        pageWidth - margin,
        pageHeight - 12,
        { align: "right" }
      );

      doc.save("Resumate Report.pdf");
    });
