/*************************************************
 * ADVANCED DAILY REPORT – PHASE 1
 * Validation & Wiring ONLY
 * No calculations in this phase
 *************************************************/

const ADR = {
  pla: null,
  pca: null,
  fsn: null
};

/* ========= File Upload Wiring ========= */

document.addEventListener("change", () => {
  ADR.pla = document.getElementById("adrPlaFile")?.files[0] || null;
  ADR.pca = document.getElementById("adrPcaFile")?.files[0] || null;
  ADR.fsn = document.getElementById("adrFsnFile")?.files[0] || null;

  updateFileStatus("adrPlaFile", "adrPlaStatus");
  updateFileStatus("adrPcaFile", "adrPcaStatus");
  updateFileStatus("adrFsnFile", "adrFsnStatus");

  validateGenerateButton();
});

function updateFileStatus(inputId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);

  if (!input || !status) return;

  if (input.files.length) {
    status.textContent = "✓ " + input.files[0].name;
    status.style.color = "#15803d";
  } else {
    status.textContent = "";
  }
}

/* ========= Generate Button Validation ========= */

function validateGenerateButton() {
  const btn = document.getElementById("adrGenerateBtn");
  if (!btn) return;

  // At least one ads file required (PLA or PCA)
  btn.disabled = !(ADR.pla || ADR.pca);
}

/* ========= Generate Click ========= */

document.getElementById("adrGenerateBtn")
  ?.addEventListener("click", () => {
    clearAllAdvancedTables();
    applyAvailabilityRules();
  });

/* ========= Availability Rules ========= */

function applyAvailabilityRules() {

  // Campaign Report – always allowed (partial ok)
  markSection("adrCampaignTable", true);

  // Category-wise – blocked if FSN missing
  if (!ADR.fsn) {
    blockTable("adrCategoryTable", "Data Not Provided – FSN Report Missing");
  } else {
    markSection("adrCategoryTable", true);
  }

  // Ads Type – always allowed (partial ok)
  markSection("adrAdsTypeTable", true);

  // PLA Date-wise
  if (!ADR.pla) {
    hideSection("adrPlaDateSection");
  }

  // PCA Date-wise
  if (!ADR.pca) {
    hideSection("adrPcaDateSection");
  }

  // Daily & Weekly – always allowed if any ads data
  markSection("adrDailyTable", true);
  markSection("adrWeeklyTable", true);
}

/* ========= UI Helpers ========= */

function clearAllAdvancedTables() {
  document
    .querySelectorAll("#advancedDaily table tbody")
    .forEach(tb => tb.innerHTML = "");
}

function blockTable(tableId, message) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="20" style="text-align:center;color:#b91c1c;font-weight:600;">
        ${message}
      </td>
    </tr>
  `;
}

function hideSection(sectionId) {
  const sec = document.getElementById(sectionId);
  if (sec) sec.style.display = "none";
}

function markSection(tableId, enabled) {
  const table = document.getElementById(tableId);
  if (!table) return;

  table.style.opacity = enabled ? "1" : "0.5";
}
<!-- Category-wise Report -->
<h4>Category-wise Report</h4>
<table id="adrCategoryTable">
  <tbody></tbody>
</table>

<!-- Ads Type Report -->
<h4>Ads Type Report</h4>
<table id="adrAdsTypeTable">
  <tbody></tbody>
</table>

<!-- PLA Date-wise -->
<div id="adrPlaDateSection">
  <h4>PLA Date-wise Performance</h4>
  <table>
    <tbody></tbody>
  </table>
</div>

<!-- PCA Date-wise -->
<div id="adrPcaDateSection">
  <h4>PCA Date-wise Performance</h4>
  <table>
    <tbody></tbody>
  </table>
</div>

<!-- Daily Performance -->
<h4>Daily Performance</h4>
<table id="adrDailyTable">
  <tbody></tbody>
</table>

<!-- Weekly Performance -->
<h4>Weekly Performance</h4>
<table id="adrWeeklyTable">
  <tbody></tbody>
</table>
