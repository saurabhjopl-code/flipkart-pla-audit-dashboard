/*************************************************
 * ADVANCED DAILY REPORT – PHASE 1
 * UI + Validation + Availability Wiring
 *************************************************/

const ADR = { pla: null, pca: null, fsn: null };

document.addEventListener("change", () => {
  ADR.pla = document.getElementById("adrPlaFile")?.files[0] || null;
  ADR.pca = document.getElementById("adrPcaFile")?.files[0] || null;
  ADR.fsn = document.getElementById("adrFsnFile")?.files[0] || null;

  updateStatus("adrPlaFile", "adrPlaStatus");
  updateStatus("adrPcaFile", "adrPcaStatus");
  updateStatus("adrFsnFile", "adrFsnStatus");

  document.getElementById("adrGenerateBtn").disabled = !(ADR.pla || ADR.pca);
});

function updateStatus(inputId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  if (input?.files.length) {
    status.textContent = "✓ " + input.files[0].name;
  } else {
    status.textContent = "";
  }
}

document.getElementById("adrGenerateBtn").addEventListener("click", () => {
  clearTables();
  applyRules();
});

function clearTables() {
  document
    .querySelectorAll("#advancedDaily table tbody")
    .forEach(tb => tb.innerHTML = "");
}

function applyRules() {

  // Campaign Report – always visible
  mark("adrCampaignTable");

  // Category-wise
  if (!ADR.fsn) {
    block("adrCategoryTable", "Data Not Provided – FSN missing");
  } else {
    mark("adrCategoryTable");
  }

  // Ads Type – always visible
  mark("adrAdsTypeTable");

  // PLA Date-wise
  if (!ADR.pla) hide("adrPlaDateSection");
  else show("adrPlaDateSection");

  // PCA Date-wise
  if (!ADR.pca) hide("adrPcaDateSection");
  else show("adrPcaDateSection");

  // Daily & Weekly
  mark("adrDailyTable");
  mark("adrWeeklyTable");
}

function block(id, msg) {
  const tb = document.querySelector(`#${id} tbody`);
  tb.innerHTML = `<tr><td style="color:red;font-weight:600;">${msg}</td></tr>`;
}

function mark(id) {
  const el = document.getElementById(id);
  if (el) el.style.opacity = "1";
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}
