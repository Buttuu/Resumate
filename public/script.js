/* ── DOM refs ── */
const form            = document.getElementById("resumeForm");
const fileInput       = document.getElementById("resumeFile");
const fileNameEl      = document.getElementById("fileName");
const dropZone        = document.getElementById("dropZone");
const loader          = document.getElementById("loader");
const results         = document.getElementById("results");
const scoreText       = document.getElementById("scoreText");
const progressCircle  = document.getElementById("progressCircle");
const matchedSkillsEl = document.getElementById("matchedSkills");
const missingSkillsEl = document.getElementById("missingSkills");
const suggestionsEl   = document.getElementById("suggestions");
const downloadBtn     = document.getElementById("downloadPdf");
const retryBtn        = document.getElementById("retryBtn");
const matchPercentEl  = document.getElementById("matchPercent");
const matchedCountEl  = document.getElementById("matchedCount");
const missingCountEl  = document.getElementById("missingCount");
const roleDisplayEl   = document.getElementById("roleDisplay");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

let resumeFileName = "";
let currentRole    = "";
let aiSummary      = "";

/* ── Drag-and-drop ── */
["dragenter","dragover"].forEach(evt =>
  dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add("over"); })
);
["dragleave","drop"].forEach(evt =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove("over"))
);

/* ── File selection ── */
fileInput.addEventListener("change", e => {
  if (e.target.files.length) {
    resumeFileName = e.target.files[0].name;
    fileNameEl.textContent = "✔ " + resumeFileName;
    fileNameEl.classList.add("show");
  }
});

/* ── Loader steps ── */
function runLoaderSteps() {
  [step1,step2,step3].forEach(s => { s.classList.remove("active","done"); });
  step1.classList.add("active");
  setTimeout(() => { step1.classList.remove("active"); step1.classList.add("done"); step2.classList.add("active"); }, 850);
  setTimeout(() => { step2.classList.remove("active"); step2.classList.add("done"); step3.classList.add("active"); }, 1700);
}

/* ── Form submit ── */
form.addEventListener("submit", async e => {
  e.preventDefault();

  loader.classList.add("active");
  results.classList.remove("active");
  downloadBtn.style.display = "none";
  runLoaderSteps();

  const formData = new FormData(form);
  currentRole = formData.get("role");

  try {
    const res  = await fetch("/analyze", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.details || data.error || "Server error");
    if (!data.atsScore) throw new Error("Invalid AI response");

    setTimeout(() => {
      loader.classList.remove("active");
      renderResults(data);
    }, 2300);

  } catch (err) {
    loader.classList.remove("active");
    console.error(err);
    alert("Resume analysis failed. " + err.message);
  }
});

/* ── Render ── */
function renderResults(data) {
  results.classList.add("active");
  results.scrollIntoView({ behavior: "smooth" });

  const score = data.atsScore <= 1
    ? Math.round(data.atsScore * 100)
    : Math.round(data.atsScore);

  animateNumber(scoreText, 0, score, 1800);

  const circ = 2 * Math.PI * 88; /* r=88 → circumference ≈ 553 */
  progressCircle.style.strokeDashoffset = circ - (circ * score / 100);

  roleDisplayEl.textContent = currentRole;

  const total = data.matchedSkills.length + data.missingSkills.length;
  const pct   = total ? Math.round(data.matchedSkills.length / total * 100) : 0;

  animateNumber(matchedCountEl, 0, data.matchedSkills.length, 1200);
  animateNumber(missingCountEl, 0, data.missingSkills.length, 1200);
  matchPercentEl.textContent = pct + "%";

  matchedSkillsEl.innerHTML = data.matchedSkills.map((s, i) =>
    `<span class="tag tag-g" style="animation-delay:${i*55}ms">${s}</span>`
  ).join("");

  missingSkillsEl.innerHTML = data.missingSkills.map((s, i) =>
    `<span class="tag tag-a" style="animation-delay:${i*55}ms">${s}</span>`
  ).join("");

  suggestionsEl.innerHTML = data.suggestions.map((s, i) =>
    `<li style="animation-delay:${i*80}ms">${s}</li>`
  ).join("");

  aiSummary = `This resume shows ${pct>=70?"strong":pct>=45?"moderate":"limited"} alignment for the ${currentRole} role, matching ${pct}% of expected skills. Addressing the missing skills will improve ATS ranking and recruiter appeal.`;

  downloadBtn.style.display = "flex";
}

/* ── Number animation ── */
function animateNumber(el, from, to, dur) {
  const start = performance.now();
  (function tick(now) {
    const t = Math.min((now-start)/dur, 1);
    el.textContent = Math.round(from + (to-from) * (1-Math.pow(1-t,3)));
    if (t < 1) requestAnimationFrame(tick);
  })(start);
}

/* ── Retry ── */
retryBtn.addEventListener("click", () => {
  results.classList.remove("active");
  form.reset();
  fileNameEl.textContent = "";
  fileNameEl.classList.remove("show");
  resumeFileName = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── PDF Download — Single Page Light Design ── */
downloadBtn.addEventListener("click", () => {

if (!window.jspdf) {
  alert("PDF library not loaded. Please refresh.");
  return;
}

const { jsPDF } = window.jspdf;
const doc = new jsPDF("p","mm","a4");

const pw = doc.internal.pageSize.width;
const ph = doc.internal.pageSize.height;

const mg = 16;
const cw = pw - mg * 2;

const fill = c => doc.setFillColor(...c);
const draw = c => doc.setDrawColor(...c);
const txt  = c => doc.setTextColor(...c);

/* COLORS */

const C = {
pageBg:[248,247,255],
headerBg:[109,40,217],
headerText:[255,255,255],
accent:[139,92,246],
accentSoft:[237,233,254],
rose:[244,63,94],
roseSoft:[255,228,230],
green:[5,150,105],
greenSoft:[209,250,229],
text:[35,25,70],
muted:[120,110,160],
border:[220,215,240],
cardBg:[255,255,255],
barTrack:[233,229,255]
};

/* DATA */

const score = parseInt(scoreText.textContent) || 0;

const matchedRaw = [...document.querySelectorAll("#matchedSkills .tag")].map(e=>e.textContent.trim());
const missingRaw = [...document.querySelectorAll("#missingSkills .tag")].map(e=>e.textContent.trim());

const suggestions = [...document.querySelectorAll("#suggestions li")].map(e=>e.textContent.trim());

const dateStr = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});

/* CLEAN SKILLS */

function cleanSkills(arr){

const skills=[];

arr.forEach(item=>{

if(item.includes(":")){

item.split(":")[1].split(",").forEach(v=>{
skills.push(v.trim());
});

}else{

item.split(",").forEach(v=>{
skills.push(v.trim());
});

}

});

return skills;

}

const matched = cleanSkills(matchedRaw);
const missing = cleanSkills(missingRaw);

/* BACKGROUND */

fill(C.pageBg);
doc.rect(0,0,pw,ph,"F");

/* HEADER */

fill(C.headerBg);
doc.rect(0,0,pw,38,"F");

doc.setFont("helvetica","bold");
doc.setFontSize(24);
txt(C.headerText);
doc.text("ResuMate",mg,17);

doc.setFont("helvetica","normal");
doc.setFontSize(10);
doc.setTextColor(220,210,255);
doc.text("AI Powered Resume Intelligence Report",mg,26);

doc.setFontSize(9);
doc.text(dateStr,pw-mg,17,{align:"right"});

doc.setFont("helvetica","bold");
doc.setFontSize(9);
doc.text("TARGET: "+currentRole.toUpperCase(),pw-mg,26,{align:"right"});

doc.setFillColor(167,139,250);
doc.rect(0,38,pw,2,"F");

let y = 48;

/* ATS SCORE CARD */

const cardH = 36;

fill(C.cardBg);
doc.roundedRect(mg,y,cw,cardH,3,3,"F");

draw(C.border);
doc.roundedRect(mg,y,cw,cardH,3,3,"S");

fill(C.accent);
doc.rect(mg,y,4,cardH,"F");

doc.setFont("helvetica","bold");
doc.setFontSize(32);
txt(C.accent);
doc.text(score+"%",mg+25,y+18,{align:"center"});

doc.setFont("helvetica","normal");
doc.setFontSize(9);
txt(C.muted);
doc.text("ATS SCORE",mg+25,y+26,{align:"center"});

/* PROGRESS BAR */

const barX = mg + 50;
const barY = y + 12;
const barW = 90;
const barH = 8;

fill(C.barTrack);
doc.roundedRect(barX,barY,barW,barH,3,3,"F");

fill(C.accent);
doc.roundedRect(barX,barY,Math.max(5,barW*score/100),barH,3,3,"F");

doc.setFontSize(9);
txt(C.muted);
doc.text("ATS Compatibility",barX,barY-2);

doc.text("File: "+(resumeFileName||"—"),barX,barY+18);

y += cardH + 8;

/* ===============================
   ATS STATISTICS BLOCK
================================ */

const statH = 24;

fill(C.cardBg);
doc.roundedRect(mg,y,cw,statH,3,3,"F");

draw(C.border);
doc.roundedRect(mg,y,cw,statH,3,3,"S");

doc.setFont("helvetica","bold");
doc.setFontSize(10);
txt(C.muted);
doc.text("Resume Analysis",mg+6,y+7);

draw(C.border);
doc.line(mg+6,y+9,mg+cw-6,y+9);

const statItems=[
{value:matched.length,label:"Matched Skills",color:C.green},
{value:missing.length,label:"Missing Skills",color:C.rose},
{value:score+"%",label:"Match Percentage",color:C.accent}
];

const colW = cw/3;

statItems.forEach((s,i)=>{

const x = mg + colW*i + colW/2;

doc.setFont("helvetica","bold");
doc.setFontSize(16);
doc.setTextColor(...s.color);
doc.text(String(s.value),x,y+16,{align:"center"});

doc.setFont("helvetica","normal");
doc.setFontSize(8);
txt(C.muted);
doc.text(s.label,x,y+21,{align:"center"});

});

draw(C.border);
doc.line(mg+cw/3,y+11,mg+cw/3,y+statH-3);
doc.line(mg+(cw/3)*2,y+11,mg+(cw/3)*2,y+statH-3);

y += statH + 10;

/* SKILL CARD FUNCTION */

const skillCol = (cw-6)/2;

function drawSkillCard(title,tags,headerColor,tagBg,tagText,tagBorder,x,startY){

let px=x+6;
let py=startY+22;
let rows=1;

doc.setFontSize(9);

tags.forEach(tag=>{

const tw=doc.getTextWidth(tag)+10;

if(px+tw>x+skillCol-5){
px=x+6;
py+=10;
rows++;
}

px+=tw+4;

});

let height=rows*10+24;

fill(C.cardBg);
doc.roundedRect(x,startY,skillCol,height,3,3,"F");

draw(C.border);
doc.roundedRect(x,startY,skillCol,height,3,3,"S");

doc.setFillColor(...headerColor);
doc.roundedRect(x,startY,skillCol,10,3,3,"F");
doc.rect(x,startY+5,skillCol,5,"F");

doc.setFont("helvetica","bold");
doc.setFontSize(10);
txt(C.headerText);
doc.text(title,x+6,startY+7);

px=x+6;
py=startY+24;

doc.setFont("helvetica","normal");
doc.setFontSize(9);

tags.forEach(tag=>{

const tw=doc.getTextWidth(tag)+10;

if(px+tw>x+skillCol-5){
px=x+6;
py+=10;
}

doc.setFillColor(...tagBg);
doc.roundedRect(px,py-5,tw,7,1.5,1.5,"F");

doc.setDrawColor(...tagBorder);
doc.roundedRect(px,py-5,tw,7,1.5,1.5,"S");

doc.setTextColor(...tagText);
doc.text(tag,px+tw/2,py,{align:"center"});

px+=tw+4;

});

return height;

}

/* SKILLS */

const h1 = drawSkillCard(
"Matched Skills ("+matched.length+")",
matched,
C.green,
C.greenSoft,
C.green,
[16,185,129],
mg,
y
);

const h2 = drawSkillCard(
"Missing Skills ("+missing.length+")",
missing,
C.rose,
C.roseSoft,
C.rose,
[251,113,133],
mg+skillCol+6,
y
);

y += Math.max(h1,h2) + 10;

/* SUGGESTIONS */

doc.setFillColor(...C.accent);
doc.roundedRect(mg,y,cw,10,3,3,"F");
doc.rect(mg,y+5,cw,5,"F");

doc.setFont("helvetica","bold");
doc.setFontSize(10);
txt(C.headerText);
doc.text("Smart Suggestions",mg+6,y+7);

y += 15;

suggestions.forEach((s,i)=>{

const lines=doc.splitTextToSize(s,cw-25);
const rowH=lines.length*6+8;

if(y+rowH>ph-20){
doc.addPage();
fill(C.pageBg);
doc.rect(0,0,pw,ph,"F");
y=20;
}

fill(C.cardBg);
doc.roundedRect(mg,y,cw,rowH,2,2,"F");

draw(C.border);
doc.roundedRect(mg,y,cw,rowH,2,2,"S");

fill(C.accentSoft);
doc.roundedRect(mg+3,y+rowH/2-4,8,8,1.5,1.5,"F");

doc.setFont("helvetica","bold");
doc.setFontSize(8);
txt(C.accent);
doc.text(String(i+1),mg+7,y+rowH/2+1,{align:"center"});

doc.setFont("helvetica","normal");
doc.setFontSize(9);
txt(C.text);
doc.text(lines,mg+15,y+6);

y+=rowH+5;

});

/* FOOTER */

const footerY = ph-12;

fill(C.headerBg);
doc.rect(0,footerY,pw,12,"F");

doc.setFont("helvetica","normal");
doc.setFontSize(8);
txt(C.headerText);

doc.text("Generated by ResuMate · AI Resume Intelligence",mg,footerY+7);
doc.text(dateStr,pw-mg,footerY+7,{align:"right"});

doc.save("ResuMate_Report.pdf");

});
