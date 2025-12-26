/*************************************************
 * ADVANCED DAILY REPORT — PHASE 2
 * CSV PARSING + HEADER VALIDATION
 * (SAFE, ISOLATED, NO RENDERING)
 *************************************************/

(function () {

  /* ===============================
     FILE INPUTS
  =============================== */
  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");

  /* ===============================
     STATUS ELEMENTS
  =============================== */
  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  const aCampaign = document.getElementById("adrAvailCampaign");
  const aCategory = document.getElementById("adrAvailCategory");
  const aAdsType = document.getElementById("adrAvailAdsType");
  const aPlaDate = document.getElementById("adrAvailPlaDate");
  const aPcaDate = document.getElementById("adrAvailPcaDate");
  const aDailyWeekly = document.getElementById("adrAvailDailyWeekly");

  /* ===============================
     INTERNAL STATE (PHASE 3 READY)
  =============================== */
  let hasPLA = false;
  let hasPCA = false;
  let hasFSN = false;

  let plaRows = [];
  let pcaRows = [];
  let fsnRows = [];

  /* ===============================
     REQUIRED HEADERS (LOCKED)
  =============================== */

  const REQUIRED_HEADERS = {
    PLA: [
      "Campaign ID",
      "Campaign Name",
      "Date",
      "Ad Spend",
      "Direct Units Sold",
      "Indirect Units Sold",
      "Direct Revenue",
      "Indirect Revenue"
    ],
    PCA: [
      "Campaign ID",
      "Campaign Name",
      "Date",
      "Ad Spend",
      "Direct Units Sold",
      "Indirect Units Sold",
      "Direct Revenue",
      "Indirect Revenue"
    ],
    FSN: [
      "FSN",
      "Category",
      "Brand"
    ]
  };

  /* ===============================
     CSV PARSER (LOCAL, SAFE)
  =============================== */
  function parseCSV(text) {
    const rows = [];
    let row = [], cur = "", q = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (c === '"' && q && n === '"') { cur += '"'; i++; }
      else if (c === '"') q = !q;
      else if (c === "," && !q) { row.push(cur.trim()); cur = ""; }
      else if (c === "\n" && !q) { row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    row.push(cur.trim());
    rows.push(row);
    return rows;
  }

  /* ===============================
     HEADER VALIDATION
  =============================== */
  function validateHeaders(rows, required) {
    if (!rows.length) return false;
    const headerRow = rows.find(r => r.length >= required.length);
    if (!headerRow) return false;
    return required.every(h => headerRow.includes(h));
  }

  /* ===============================
     AVAILABILITY LOGIC (PHASE 1)
  =============================== */
  function refreshAvailability() {

    // Upload text
    sPla.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    // FULL DATA OVERRIDE
    if (hasPLA && hasPCA && hasFSN) {
      aCampaign.textContent = "Available";
      aCategory.textContent = "Available";
      aAdsType.textContent = "Available";
      aPlaDate.textContent = "Available";
      aPcaDate.textContent = "Available";
      aDailyWeekly.textContent = "Available";
      return;
    }

    // Partial logic
    aCampaign.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aAdsType.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aCategory.textContent = hasFSN ? "Available" : "Blocked";
    aPlaDate.textContent = hasPLA ? "Available" : "Hidden";
    aPcaDate.textContent = hasPCA ? "Available" : "Hidden";
    aDailyWeekly.textContent =
      (hasPLA || hasPCA || hasFSN) ? "Partial" : "Blocked";
  }

  /* ===============================
     FILE HANDLERS
  =============================== */

  function handleFile(file, type) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rows = parseCSV(reader.result);
        const ok = validateHeaders(rows, REQUIRED_HEADERS[type]);
        if (!ok) {
          reject(type + " header validation failed");
        } else {
          resolve(rows);
        }
      };
      reader.onerror = () => reject("File read error");
      reader.readAsText(file);
    });
  }

  /* ===============================
     INPUT EVENTS
  =============================== */

  plaInput.addEventListener("change", async () => {
    hasPLA = false;
    plaRows = [];
    refreshAvailability();

    if (!plaInput.files.length) return;

    try {
      plaRows = await handleFile(plaInput.files[0], "PLA");
      hasPLA = true;
    } catch (e) {
      alert(e);
      plaInput.value = "";
    }
    refreshAvailability();
  });

  pcaInput.addEventListener("change", async () => {
    hasPCA = false;
    pcaRows = [];
    refreshAvailability();

    if (!pcaInput.files.length) return;

    try {
      pcaRows = await handleFile(pcaInput.files[0], "PCA");
      hasPCA = true;
    } catch (e) {
      alert(e);
      pcaInput.value = "";
    }
    refreshAvailability();
  });

  fsnInput.addEventListener("change", async () => {
    hasFSN = false;
    fsnRows = [];
    refreshAvailability();

    if (!fsnInput.files.length) return;

    try {
      fsnRows = await handleFile(fsnInput.files[0], "FSN");
      hasFSN = true;
    } catch (e) {
      alert(e);
      fsnInput.value = "";
    }
    refreshAvailability();
  });

  /* ===============================
     DEBUG ACCESS (PHASE 3 USE)
     window.__ADR_DATA = read-only
  =============================== */
  window.__ADR_DATA = {
    get pla() { return plaRows; },
    get pca() { return pcaRows; },
    get fsn() { return fsnRows; }
  };

})();
