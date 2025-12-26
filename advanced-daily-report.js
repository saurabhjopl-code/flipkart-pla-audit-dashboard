/*************************************************
 * ADVANCED DAILY REPORT — PHASE 1
 * UI + VALIDATION ONLY (NO DATA LOGIC)
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
    sPla.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    aCampaign.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aCategory.textContent = hasFSN ? "Available" : "Blocked";
    aAdsType.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aPlaDate.textContent = hasPLA ? "Available" : "Hidden";
    aPcaDate.textContent = hasPCA ? "Available" : "Hidden";
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
