/*************************************************
 * ADVANCED DAILY REPORT — PHASE 4
 * Rendering Campaign & Ads Type Tables
 *************************************************/

(function () {

  /* ===============================
     ELEMENT REFERENCES
  =============================== */
  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

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
  let plaRows = [], pcaRows = [], fsnRows = [];
  let hasPLA = false, hasPCA = false, hasFSN = false;

  /* ===============================
     HELPERS
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

  function toNum(v) {
    return Number(String(v).replace(/[^0-9.-]/g, "")) || 0;
  }

  function clearOldTables() {
    container.querySelectorAll(".adr-generated").forEach(e => e.remove());
  }

  function refreshAvailability() {
    sPla.textContent = hasPLA ? "PLA: ✅ Uploaded" : "PLA: ❌ Not Uploaded";
    sPca.textContent = hasPCA ? "PCA: ✅ Uploaded" : "PCA: ❌ Not Uploaded";
    sFsn.textContent = hasFSN ? "FSN: ✅ Uploaded" : "FSN: ❌ Not Uploaded";

    if (hasPLA && hasPCA && hasFSN) {
      aCampaign.textContent =
      aCategory.textContent =
      aAdsType.textContent =
      aPlaDate.textContent =
      aPcaDate.textContent =
      aDailyWeekly.textContent = "Available";
    }
  }

  /* ===============================
     FILE LOADERS (VALIDATION ALREADY DONE)
  =============================== */
  plaInput.onchange = async () => {
    plaRows = parseCSV(await plaInput.files[0].text());
    hasPLA = plaRows.length > 3;
    refreshAvailability();
  };

  pcaInput.onchange = async () => {
    pcaRows = parseCSV(await pcaInput.files[0].text());
    hasPCA = pcaRows.length > 3;
    refreshAvailability();
  };

  fsnInput.onchange = async () => {
    fsnRows = parseCSV(await fsnInput.files[0].text());
    hasFSN = fsnRows.length > 3;
    refreshAvailability();
  };

  /* ===============================
     GENERATE REPORT
  =============================== */
  generateBtn.onclick = () => {
    if (!(hasPLA || hasPCA)) {
      alert("Upload PLA or PCA to generate report");
      return;
    }

    clearOldTables();

    const campaignMap = {};
    const adsType = {
      PLA: { spend: 0, units: 0, revenue: 0 },
      PCA: { spend: 0, units: 0, revenue: 0 }
    };

    /* ===== PLA ===== */
    if (hasPLA) {
      const h = plaRows[2];
      const r = plaRows.slice(3);
      const idx = {
        campaign: h.indexOf("Campaign Name"),
        spend: h.indexOf("Ad Spend"),
        units: h.indexOf("Total converted units"),
        revenue: h.indexOf("Total Revenue (Rs.)")
      };

      r.forEach(row => {
        const c = row[idx.campaign];
        if (!campaignMap[c]) campaignMap[c] = { spend: 0, units: 0, revenue: 0 };
        const s = toNum(row[idx.spend]);
        const u = toNum(row[idx.units]);
        const rev = toNum(row[idx.revenue]);

        campaignMap[c].spend += s;
        campaignMap[c].units += u;
        campaignMap[c].revenue += rev;

        adsType.PLA.spend += s;
        adsType.PLA.units += u;
        adsType.PLA.revenue += rev;
      });
    }

    /* ===== PCA ===== */
    if (hasPCA) {
      const h = pcaRows[2];
      const r = pcaRows.slice(3);
      const idx = {
        campaign: h.indexOf("campaign_name"),
        spend: h.indexOf("banner_group_spend"),
        dUnits: h.indexOf("DIRECT UNITS"),
        iUnits: h.indexOf("INDIRECT UNITS"),
        dRev: h.indexOf("DIRECT REVENUE"),
        iRev: h.indexOf("INDIRECT REVENUE")
      };

      r.forEach(row => {
        const c = row[idx.campaign];
        if (!campaignMap[c]) campaignMap[c] = { spend: 0, units: 0, revenue: 0 };
        const s = toNum(row[idx.spend]);
        const u = toNum(row[idx.dUnits]) + toNum(row[idx.iUnits]);
        const rev = toNum(row[idx.dRev]) + toNum(row[idx.iRev]);

        campaignMap[c].spend += s;
        campaignMap[c].units += u;
        campaignMap[c].revenue += rev;

        adsType.PCA.spend += s;
        adsType.PCA.units += u;
        adsType.PCA.revenue += rev;
      });
    }

    renderCampaignTable(campaignMap);
    renderAdsTypeTable(adsType);
  };

  /* ===============================
     RENDERING
  =============================== */
  function renderCampaignTable(data) {
    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>Campaign Performance (Advanced)</h4>`;
    const table = document.createElement("table");

    table.innerHTML = `
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Spend (₹)</th>
          <th>Units</th>
          <th>Revenue (₹)</th>
          <th>ROI</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    Object.entries(data).forEach(([c, v]) => {
      const roi = v.spend ? (v.revenue / v.spend).toFixed(2) : "0.00";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c}</td>
        <td>${v.spend.toFixed(2)}</td>
        <td>${v.units}</td>
        <td>${v.revenue.toFixed(2)}</td>
        <td>${roi}</td>
      `;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function renderAdsTypeTable(data) {
    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>Ads Type Performance</h4>`;
    const table = document.createElement("table");

    table.innerHTML = `
      <thead>
        <tr>
          <th>Ads Type</th>
          <th>Spend (₹)</th>
          <th>Units</th>
          <th>Revenue (₹)</th>
          <th>ROI</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    Object.entries(data).forEach(([t, v]) => {
      const roi = v.spend ? (v.revenue / v.spend).toFixed(2) : "0.00";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t}</td>
        <td>${v.spend.toFixed(2)}</td>
        <td>${v.units}</td>
        <td>${v.revenue.toFixed(2)}</td>
        <td>${roi}</td>
      `;
      tbody.appendChild(tr);
    });

    wrap.appendChild(table);
    container.appendChild(wrap);
  }

})();
