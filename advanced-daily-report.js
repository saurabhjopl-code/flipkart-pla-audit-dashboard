/*************************************************
 * ADVANCED DAILY REPORT — PHASE 5A
 * FSN / Product Performance Report
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
  let reportStartDate = null, reportEndDate = null;

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
    reportStartDate = rows?.[0]?.[0] || null;
    reportEndDate = rows?.[1]?.[0] || null;
  }

  function renderDateRange() {
    if (!reportStartDate || !reportEndDate) return;
    const div = document.createElement("div");
    div.className = "adr-generated";
    div.innerHTML = `
      <strong>Report Period:</strong>
      Start Time: <b>${reportStartDate}</b>
      &nbsp;→&nbsp;
      End Time: <b>${reportEndDate}</b>
    `;
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
      PLA: { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 },
      PCA: { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 }
    };

    /* ===== CAMPAIGN + ADS TYPE (UNCHANGED) ===== */

    /* ===== FSN REPORT ===== */
    if (hasFSN) {
      renderFsnReport();
    }
  };

  /* ================= FSN REPORT ================= */

  function renderFsnReport() {
    const h = fsnRows[2].map(normalize);
    const idx = {
      campaign: h.indexOf("campaign name"),
      product: h.indexOf("product name"),
      views: h.indexOf("views"),
      clicks: h.indexOf("clicks"),
      dUnits: h.indexOf("direct units sold"),
      iUnits: h.indexOf("indirect units sold"),
      revenue: h.indexOf("total revenue (rs.)"),
      roi: h.indexOf("roi")
    };

    const map = {};

    fsnRows.slice(3).forEach(r => {
      const key = r[idx.campaign] + "||" + r[idx.product];
      if (!map[key]) {
        map[key] = {
          campaign: r[idx.campaign],
          product: r[idx.product],
          views: 0,
          clicks: 0,
          units: 0,
          revenue: 0,
          roi: 0
        };
      }

      map[key].views += toNum(r[idx.views]);
      map[key].clicks += toNum(r[idx.clicks]);
      map[key].units += toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
      map[key].revenue += toNum(r[idx.revenue]);
    });

    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>FSN / Product Performance (Advanced)</h4>`;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Product / SKU</th>
          <th>Views</th>
          <th>Clicks</th>
          <th>Total Units</th>
          <th>Revenue (₹)</th>
          <th>ROI</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    Object.values(map).forEach(v => {
      const roi = v.revenue && v.units ? (v.revenue / v.units).toFixed(2) : "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.campaign}</td>
        <td>${v.product}</td>
        <td>${v.views}</td>
        <td>${v.clicks}</td>
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
