/*************************************************
 * ADVANCED DAILY REPORT — PHASE 1
 * UI + VALIDATION ONLY
 * SAFE & ISOLATED
 *************************************************/

(function () {

  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");

  const sPLA = document.getElementById("adrStatusPla");
  const sPCA = document.getElementById("adrStatusPca");
  const sFSN = document.getElementById("adrStatusFsn");

  const aCampaign = document.getElementById("adrAvailCampaign");
  const aCategory = document.getElementById("adrAvailCategory");
  const aAdsType = document.getElementById("adrAvailAdsType");
  const aPlaDate = document.getElementById("adrAvailPlaDate");
  const aPcaDate = document.getElementById("adrAvailPcaDate");
  const aDailyWeekly = document.getElementById("adrAvailDailyWeekly");

  let hasPLA = false;
  let hasPCA = false;
  let hasFSN = false;

  function updateUI() {
    sPLA.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPCA.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFSN.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    // Campaign Report
    aCampaign.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";

    // Category-wise
    aCategory.textContent = hasFSN ? "Available" : "Blocked";

    // Ads Type
    aAdsType.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";

    // Date-wise visibility
    aPlaDate.textContent = hasPLA ? "Available" : "Hidden";
    aPcaDate.textContent = hasPCA ? "Available" : "Hidden";

    // Daily & Weekly
    aDailyWeekly.textContent =
      (hasPLA || hasPCA || hasFSN) ? "Partial" : "Blocked";
  }

  plaInput.addEventListener("change", () => {
    hasPLA = plaInput.files.length > 0;
    updateUI();
  });

  pcaInput.addEventListener("change", () => {
    hasPCA = pcaInput.files.length > 0;
    updateUI();
  });

  fsnInput.addEventListener("change", () => {
    hasFSN = fsnInput.files.length > 0;
    updateUI();
  });

})();
