// ===============================
// Advanced Daily Report – Phase 1
// UI + Validation Wiring ONLY
// ===============================

(function () {
  const plaInput = document.getElementById("plaFile");
  const pcaInput = document.getElementById("pcaFile");
  const fsnInput = document.getElementById("fsnFile");

  const statusPLA = document.getElementById("status-pla");
  const statusPCA = document.getElementById("status-pca");
  const statusFSN = document.getElementById("status-fsn");

  const availCampaign = document.getElementById("avail-campaign");
  const availCategory = document.getElementById("avail-category");
  const availAdsType = document.getElementById("avail-adstype");
  const availPLADate = document.getElementById("avail-pla-date");
  const availPCADate = document.getElementById("avail-pca-date");
  const availDailyWeekly = document.getElementById("avail-daily-weekly");

  let hasPLA = false;
  let hasPCA = false;
  let hasFSN = false;

  function updateStatus() {
    statusPLA.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    statusPCA.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    statusFSN.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    // Campaign Report
    availCampaign.textContent =
      hasPLA || hasPCA ? "Partial" : "Blocked";

    // Category-wise
    availCategory.textContent =
      hasFSN ? "Available" : "Blocked";

    // Ads Type
    availAdsType.textContent =
      hasPLA || hasPCA ? "Partial" : "Blocked";

    // PLA Date-wise
    availPLADate.textContent =
      hasPLA ? "Available" : "Hidden";

    // PCA Date-wise
    availPCADate.textContent =
      hasPCA ? "Available" : "Hidden";

    // Daily & Weekly
    availDailyWeekly.textContent =
      hasPLA || hasPCA || hasFSN ? "Partial" : "Blocked";
  }

  plaInput.addEventListener("change", function () {
    hasPLA = !!plaInput.files.length;
    updateStatus();
  });

  pcaInput.addEventListener("change", function () {
    hasPCA = !!pcaInput.files.length;
    updateStatus();
  });

  fsnInput.addEventListener("change", function () {
    hasFSN = !!fsnInput.files.length;
    updateStatus();
  });

})();
