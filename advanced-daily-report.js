/*************************************************
 * ADVANCED DAILY REPORT — PHASE 5B
 * Daily & ISO Weekly Trend Reports
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

  function isoWeek(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
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

    const daily = {};
    const weekly = {};

    /* ===== PLA ===== */
    if (hasPLA) {
      const h = plaRows[2].map(normalize);
      const idx = {
        date: h.indexOf("date"),
        views: h.indexOf("views"),
        clicks: h.indexOf("clicks"),
        spend: h.indexOf("ad spend"),
        units: h.indexOf("total converted units"),
        revenue: h.indexOf("total revenue (rs.)")
      };

      plaRows.slice(3).forEach(r => {
        const d = r[idx.date];
        if (!d) return;
        const w = isoWeek(d);

        [daily, weekly].forEach((obj, i) => {
          const key = i === 0 ? d : w;
          if (!obj[key]) obj[key] = { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 };
          obj[key].views += toNum(r[idx.views]);
          obj[key].clicks += toNum(r[idx.clicks]);
          obj[key].spend += toNum(r[idx.spend]);
          obj[key].units += toNum(r[idx.units]);
          obj[key].revenue += toNum(r[idx.revenue]);
        });
      });
    }

    /* ===== PCA ===== */
    if (hasPCA) {
      const h = pcaRows[2].map(normalize);
      const idx = {
        date: h.indexOf("date"),
        views: h.indexOf("views"),
        clicks: h.indexOf("clicks"),
        spend: h.indexOf("banner_group_spend"),
        dUnits: h.indexOf("direct units"),
        iUnits: h.indexOf("indirect units"),
        dRev: h.indexOf("direct revenue"),
        iRev: h.indexOf("indirect revenue")
      };

      pcaRows.slice(3).forEach(r => {
        const d = r[idx.date];
        if (!d) return;
        const w = isoWeek(d);

        [daily, weekly].forEach((obj, i) => {
          const key = i === 0 ? d : w;
          if (!obj[key]) obj[key] = { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 };
          obj[key].views += toNum(r[idx.views]);
          obj[key].clicks += toNum(r[idx.clicks]);
          obj[key].spend += toNum(r[idx.spend]);
          obj[key].units += toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
          obj[key].revenue += toNum(r[idx.dRev]) + toNum(r[idx.iRev]);
        });
      });
    }

    renderTrendTable("Daily Trend", daily);
    renderTrendTable("ISO Weekly Trend", weekly);
  };

  /* ================= RENDER ================= */

  function renderTrendTable(title, data) {
    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>${title}</h4>`;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Period</th>
          <th>Views</th>
          <th>Clicks</th>
          <th>Spend (₹)</th>
          <th>Units</th>
          <th>Revenue (₹)</th>
          <th>ROI</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    Object.entries(data)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([k, v]) => {
        const roi = v.spend ? (v.revenue / v.spend).toFixed(2) : "0.00";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${k}</td>
          <td>${v.views}</td>
          <td>${v.clicks}</td>
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
