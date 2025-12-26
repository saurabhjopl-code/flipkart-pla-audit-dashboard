/*************************************************
 * ADVANCED DAILY REPORT — PHASE 3
 * Campaign Report + Ads Type Analysis
 * (Safe, Isolated, Locked-core compliant)
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
     INTERNAL STATE
  =============================== */
  let hasPLA = false, hasPCA = false, hasFSN = false;
  let plaRows = [], pcaRows = [], fsnRows = [];

  /* ===============================
     LOCKED HEADERS
  =============================== */
  const HEADERS = {
    PLA: [
      "Campaign ID","Campaign Name","Date","Ad Spend","Views","Clicks",
      "Total converted units","Total Revenue (Rs.)","ROI"
    ],
    PCA: [
      "campaign_id","campaign_name","ad_group_id","ad_group_name","Date",
      "banner_group_spend","views","clicks","CTR","average_cpc",
      "DIRECT PPV","DIRECT UNITS","INDIRECT UNITS","CVR",
      "DIRECT REVENUE","INDIRECT REVENUE","Direct ROI","Indirect ROI"
    ],
    FSN: [
      "Campaign ID","Campaign Name","AdGroup ID","AdGroup Name","Sku Id",
      "Product Name","Views","Clicks","Direct Units Sold",
      "Indirect Units Sold","Total Revenue (Rs.)","Conversion Rate","ROI"
    ]
  };

  /* ===============================
     CSV PARSER
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

  function normalize(v) {
    return v.replace(/\ufeff/g, "").trim().toLowerCase();
  }

  function validate(rows, type) {
    if (!rows[2]) return false;
    const actual = rows[2].map(normalize);
    return HEADERS[type].every(h => actual.includes(normalize(h)));
  }

  /* ===============================
     AVAILABILITY LOGIC
  =============================== */
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

  /* ===============================
     FILE HANDLER
  =============================== */
  async function handleFile(input, type) {
    if (!input.files.length) return [];
    const text = await input.files[0].text();
    const rows = parseCSV(text);
    if (!validate(rows, type)) {
      alert(type + " header validation failed");
      input.value = "";
      return [];
    }
    return rows;
  }

  /* ===============================
     INPUT EVENTS
  =============================== */
  plaInput.onchange = async () => {
    hasPLA = false;
    plaRows = await handleFile(plaInput, "PLA");
    hasPLA = plaRows.length > 0;
    refreshAvailability();
    buildReports();
  };

  pcaInput.onchange = async () => {
    hasPCA = false;
    pcaRows = await handleFile(pcaInput, "PCA");
    hasPCA = pcaRows.length > 0;
    refreshAvailability();
    buildReports();
  };

  fsnInput.onchange = async () => {
    hasFSN = false;
    fsnRows = await handleFile(fsnInput, "FSN");
    hasFSN = fsnRows.length > 0;
    refreshAvailability();
  };

  /* ===============================
     PHASE 3 — AGGREGATION
  =============================== */

  function toNum(v) {
    return Number(String(v).replace(/[^0-9.-]/g, "")) || 0;
  }

  function buildReports() {
    if (!(hasPLA || hasPCA)) return;

    const campaignMap = {};
    const adsType = {
      PLA: { spend: 0, revenue: 0, units: 0 },
      PCA: { spend: 0, revenue: 0, units: 0 }
    };

    /* ===== PLA ===== */
    if (hasPLA) {
      const h = plaRows[2];
      const rows = plaRows.slice(3);

      const idx = {
        campaign: h.indexOf("Campaign Name"),
        spend: h.indexOf("Ad Spend"),
        units: h.indexOf("Total converted units"),
        revenue: h.indexOf("Total Revenue (Rs.)")
      };

      rows.forEach(r => {
        const c = r[idx.campaign];
        if (!campaignMap[c]) {
          campaignMap[c] = { spend: 0, revenue: 0, units: 0 };
        }
        const spend = toNum(r[idx.spend]);
        const units = toNum(r[idx.units]);
        const revenue = toNum(r[idx.revenue]);

        campaignMap[c].spend += spend;
        campaignMap[c].units += units;
        campaignMap[c].revenue += revenue;

        adsType.PLA.spend += spend;
        adsType.PLA.units += units;
        adsType.PLA.revenue += revenue;
      });
    }

    /* ===== PCA ===== */
    if (hasPCA) {
      const h = pcaRows[2];
      const rows = pcaRows.slice(3);

      const idx = {
        campaign: h.indexOf("campaign_name"),
        spend: h.indexOf("banner_group_spend"),
        dUnits: h.indexOf("DIRECT UNITS"),
        iUnits: h.indexOf("INDIRECT UNITS"),
        dRev: h.indexOf("DIRECT REVENUE"),
        iRev: h.indexOf("INDIRECT REVENUE")
      };

      rows.forEach(r => {
        const c = r[idx.campaign];
        if (!campaignMap[c]) {
          campaignMap[c] = { spend: 0, revenue: 0, units: 0 };
        }

        const spend = toNum(r[idx.spend]);
        const units = toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
        const revenue = toNum(r[idx.dRev]) + toNum(r[idx.iRev]);

        campaignMap[c].spend += spend;
        campaignMap[c].units += units;
        campaignMap[c].revenue += revenue;

        adsType.PCA.spend += spend;
        adsType.PCA.units += units;
        adsType.PCA.revenue += revenue;
      });
    }

    console.log("📊 Campaign Report", campaignMap);
    console.log("📊 Ads Type Report", adsType);

    // Phase 3 intentionally logs only (no tables yet)
  }

})();
