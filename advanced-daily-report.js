/*************************************************
 * ADVANCED DAILY REPORT — PHASE 2 (FINAL)
 * STRICT & LOCKED HEADER VALIDATION
 *************************************************/

(function () {

  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");

  const sPla = document.getElementById("adrStatusPla");
  const sPca = document.getElementById("adrStatusPca");
  const sFsn = document.getElementById("adrStatusFsn");

  const aCampaign = document.getElementById("adrAvailCampaign");
  const aCategory = document.getElementById("adrAvailCategory");
  const aAdsType = document.getElementById("adrAvailAdsType");
  const aPlaDate = document.getElementById("adrAvailPlaDate");
  const aPcaDate = document.getElementById("adrAvailPcaDate");
  const aDailyWeekly = document.getElementById("adrAvailDailyWeekly");

  let hasPLA = false, hasPCA = false, hasFSN = false;
  let plaRows = [], pcaRows = [], fsnRows = [];

  /* ================= LOCKED HEADERS ================= */

  const HEADERS = {
    PLA: [
      "Campaign ID",
      "Campaign Name",
      "Date",
      "Ad Spend",
      "Views",
      "Clicks",
      "Total converted units",
      "Total Revenue (Rs.)",
      "ROI"
    ],
    PCA: [
      "campaign_id",
      "campaign_name",
      "ad_group_id",
      "ad_group_name",
      "Date",
      "banner_group_spend",
      "views",
      "clicks",
      "CTR",
      "average_cpc",
      "DIRECT PPV",
      "DIRECT UNITS",
      "INDIRECT UNITS",
      "CVR",
      "DIRECT REVENUE",
      "INDIRECT REVENUE",
      "Direct ROI",
      "Indirect ROI"
    ],
    FSN: [
      "Campaign ID",
      "Campaign Name",
      "AdGroup ID",
      "AdGroup Name",
      "Sku Id",
      "Product Name",
      "Views",
      "Clicks",
      "Direct Units Sold",
      "Indirect Units Sold",
      "Total Revenue (Rs.)",
      "Conversion Rate",
      "ROI"
    ]
  };

  /* ================= CSV PARSER ================= */
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

  /* ================= HEADER NORMALIZATION ================= */
  function normalize(v) {
    return v
      .replace(/\ufeff/g, "")
      .trim()
      .toLowerCase();
  }

  function validate(rows, type) {
    if (!rows[2]) return false;
    const actual = rows[2].map(normalize);
    const required = HEADERS[type].map(normalize);
    return required.every(h => actual.includes(h));
  }

  /* ================= AVAILABILITY (PHASE 1 LOGIC) ================= */
  function refreshAvailability() {

    sPla.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    if (hasPLA && hasPCA && hasFSN) {
      aCampaign.textContent = "Available";
      aCategory.textContent = "Available";
      aAdsType.textContent = "Available";
      aPlaDate.textContent = "Available";
      aPcaDate.textContent = "Available";
      aDailyWeekly.textContent = "Available";
      return;
    }

    aCampaign.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aAdsType.textContent = (hasPLA || hasPCA) ? "Partial" : "Blocked";
    aCategory.textContent = hasFSN ? "Available" : "Blocked";
    aPlaDate.textContent = hasPLA ? "Available" : "Hidden";
    aPcaDate.textContent = hasPCA ? "Available" : "Hidden";
    aDailyWeekly.textContent =
      (hasPLA || hasPCA || hasFSN) ? "Partial" : "Blocked";
  }

  async function handleFile(input, type) {
    if (!input.files.length) return [];
    const file = input.files[0];
    const text = await file.text();
    const rows = parseCSV(text);

    if (!validate(rows, type)) {
      alert(type + " header validation failed");
      input.value = "";
      return [];
    }
    return rows;
  }

  plaInput.onchange = async () => {
    hasPLA = false;
    plaRows = await handleFile(plaInput, "PLA");
    hasPLA = plaRows.length > 0;
    refreshAvailability();
  };

  pcaInput.onchange = async () => {
    hasPCA = false;
    pcaRows = await handleFile(pcaInput, "PCA");
    hasPCA = pcaRows.length > 0;
    refreshAvailability();
  };

  fsnInput.onchange = async () => {
    hasFSN = false;
    fsnRows = await handleFile(fsnInput, "FSN");
    hasFSN = fsnRows.length > 0;
    refreshAvailability();
  };

  /* ================= PHASE 3 READY ================= */
  window.__ADR_DATA = {
    get pla() { return plaRows; },
    get pca() { return pcaRows; },
    get fsn() { return fsnRows; }
  };

})();
