/*************************************************
 * ADVANCED DAILY REPORT — PHASE 4 (DATE-AWARE)
 * Row 0 = Start Date
 * Row 1 = End Date
 * Row 2 = Header
 *************************************************/

(function () {

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

  let plaRows = [], pcaRows = [], fsnRows = [];
  let hasPLA = false, hasPCA = false, hasFSN = false;

  let reportStartDate = null;
  let reportEndDate = null;

  /* ================= HELPERS ================= */

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

  function extractDateRange(rows) {
    reportStartDate = rows[0]?.[0] || null;
    reportEndDate = rows[1]?.[0] || null;
  }

  function renderDateRange() {
    if (!reportStartDate || !reportEndDate) return;

    const div = document.createElement("div");
    div.className = "adr-generated";
    div.innerHTML = `<strong>Report Period:</strong> ${reportStartDate} → ${reportEndDate}`;
    container.appendChild(div);
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

  /* ================= FILE LOAD ================= */

  plaInput.onchange = async () => {
    plaRows = parseCSV(await plaInput.files[0].text());
    extractDateRange(plaRows);
    hasPLA = plaRows.length > 3;
    refreshAvailability();
  };

  pcaInput.onchange = async () => {
    pcaRows = parseCSV(await pcaInput.files[0].text());
    extractDateRange(pcaRows);
    hasPCA = pcaRows.length > 3;
    refreshAvailability();
  };

  fsnInput.onchange = async () => {
    fsnRows = parseCSV(await fsnInput.files[0].text());
    extractDateRange(fsnRows);
    hasFSN = fsnRows.length > 3;
    refreshAvailability();
  };

  /* ================= GENERATE ================= */

  generateBtn.onclick = () => {
    if (!(hasPLA || hasPCA)) {
      alert("Upload PLA or PCA to generate report");
      return;
    }

    clearOldTables();
    renderDateRange();

    const campaignMap = {};
    const adsType = {
      PLA: { spend: 0, units: 0, revenue: 0 },
      PCA: { spend: 0, units: 0, revenue: 0 }
    };

    /* ===== PLA DATA (rows 3+) ===== */
    if (hasPLA) {
      const header = plaRows[2].map(normalize);
      const idx = {
        campaign: header.indexOf("campaign name"),
        spend: header.indexOf("ad spend"),
        units: header.indexOf("total converted units"),
        revenue: header.indexOf("total revenue (rs.)")
      };

      plaRows.slice(3).forEach(r => {
        const name = r[idx.campaign];
        if (!name) return;

        if (!campaignMap[name]) {
          campaignMap[name] = { spend: 0, units: 0, revenue: 0 };
        }

        const s = toNum(r[idx.spend]);
        const u = toNum(r[idx.units]);
        const rev = toNum(r[idx.revenue]);

        campaignMap[name].spend += s;
        campaignMap[name].units += u;
        campaignMap[name].revenue += rev;

        adsType.PLA.spend += s;
        adsType.PLA.units += u;
        adsType.PLA.revenue += rev;
      });
    }

    /* ===== PCA DATA (rows 3+) ===== */
    if (hasPCA) {
      const header = pcaRows[2].map(normalize);
      const idx = {
        campaign: header.indexOf("campaign_name"),
        spend: header.indexOf("banner_group_spend"),
        dUnits: header.indexOf("direct units"),
        iUnits: header.indexOf("indirect units"),
        dRev: header.indexOf("direct revenue"),
        iRev: header.indexOf("indirect revenue")
      };

      pcaRows.slice(3).forEach(r => {
        const name = r[idx.campaign];
        if (!name) return;

        if (!campaignMap[name]) {
          campaignMap[name] = { spend: 0, units: 0, revenue: 0 };
        }

        const s = toNum(r[idx.spend]);
        const u = toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
        const rev = toNum(r[idx.dRev]) + toNum(r[idx.iRev]);

        campaignMap[name].spend += s;
        campaignMap[name].units += u;
        campaignMap[name].revenue += rev;

        adsType.PCA.spend += s;
        adsType.PCA.units += u;
        adsType.PCA.revenue += rev;
      });
    }

    renderCampaignTable(campaignMap);
    renderAdsTypeTable(adsType);
  };

  /* ================= RENDER ================= */

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
