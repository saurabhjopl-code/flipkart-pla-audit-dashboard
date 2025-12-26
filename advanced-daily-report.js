/*************************************************
 * ADVANCED DAILY REPORT — PHASE 1
 * VALIDATION + AVAILABILITY (FIXED LOGIC)
 *************************************************/

(function () {

  const pla = document.getElementById("adrPlaFile");
  const pca = document.getElementById("adrPcaFile");
  const fsn = document.getElementById("adrFsnFile");

  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  const aCampaign = document.getElementById("adrAvailCampaign");
  const aCategory = document.getElementById("adrAvailCategory");
  const aAdsType = document.getElementById("adrAvailAdsType");
  const aPlaDate = document.getElementById("adrAvailPlaDate");
  const aPcaDate = document.getElementById("adrAvailPcaDate");
  const aDailyWeekly = document.getElementById("adrAvailDailyWeekly");

  let hasPLA = false;
  let hasPCA = false;
  let hasFSN = false;

  function refresh() {
    /* ===== Upload Status ===== */
    sPla.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    /* ===== FULL DATA OVERRIDE ===== */
    if (hasPLA && hasPCA && hasFSN) {
      aCampaign.textContent = "Available";
      aCategory.textContent = "Available";
      aAdsType.textContent = "Available";
      aPlaDate.textContent = "Available";
      aPcaDate.textContent = "Available";
      aDailyWeekly.textContent = "Available";
      return;
    }

    /* ===== PARTIAL / CONDITIONAL LOGIC ===== */

    // Campaign & Ads Type
    aCampaign.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aAdsType.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";

    // Category-wise
    aCategory.textContent = hasFSN ? "Available" : "Blocked";

    // Date-wise
    aPlaDate.textContent = hasPLA ? "Available" : "Hidden";
    aPcaDate.textContent = hasPCA ? "Available" : "Hidden";

    // Daily & Weekly
    aDailyWeekly.textContent =
      (hasPLA || hasPCA || hasFSN) ? "Partial" : "Blocked";
  }

  pla.addEventListener("change", () => {
    hasPLA = pla.files.length > 0;
    refresh();
  });

  pca.addEventListener("change", () => {
    hasPCA = pca.files.length > 0;
    refresh();
  });

  fsn.addEventListener("change", () => {
    hasFSN = fsn.files.length > 0;
    refresh();
  });

})();
