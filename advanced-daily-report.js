/*************************************************
 * ADVANCED DAILY REPORT — PHASE 6C + 6D
 * PLA & PCA Date-wise Performance
 *************************************************/

(function () {

  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const fsnInput = document.getElementById("adrFsnFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

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

  /* ================= FILE LOAD ================= */

  plaInput.onchange = async () => {
    plaRows = parseCSV(await plaInput.files[0].text());
    extractDateRange(plaRows);
    hasPLA = plaRows.length > 3;
  };

  pcaInput.onchange = async () => {
    pcaRows = parseCSV(await pcaInput.files[0].text());
    extractDateRange(pcaRows);
    hasPCA = pcaRows.length > 3;
  };

  fsnInput.onchange = async () => {
    fsnRows = parseCSV(await fsnInput.files[0].text());
    hasFSN = fsnRows.length > 3;
  };

  /* ================= GENERATE ================= */

  generateBtn.onclick = () => {
    if (!hasPLA && !hasPCA) {
      alert("Upload PLA or PCA file");
      return;
    }

    clearOldTables();
    renderDateRange();

    if (hasPLA) renderPlaDateWise();
    if (hasPCA) renderPcaDateWise();
  };

  /* ================= PLA DATE-WISE ================= */

  function renderPlaDateWise() {
    const h = plaRows[2].map(normalize);
    const idx = {
      date: h.indexOf("date"),
      views: h.indexOf("views"),
      clicks: h.indexOf("clicks"),
      spend: h.indexOf("ad spend"),
      units: h.indexOf("total converted units"),
      revenue: h.indexOf("total revenue (rs.)")
    };

    const map = {};

    plaRows.slice(3).forEach(r => {
      const d = r[idx.date];
      if (!d) return;

      if (!map[d]) {
        map[d] = { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 };
      }

      map[d].views += toNum(r[idx.views]);
      map[d].clicks += toNum(r[idx.clicks]);
      map[d].spend += toNum(r[idx.spend]);
      map[d].units += toNum(r[idx.units]);
      map[d].revenue += toNum(r[idx.revenue]);
    });

    renderDateTable("PLA Performance – Date-wise", map);
  }

  /* ================= PCA DATE-WISE ================= */

  function renderPcaDateWise() {
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

    const map = {};

    pcaRows.slice(3).forEach(r => {
      const d = r[idx.date];
      if (!d) return;

      if (!map[d]) {
        map[d] = { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 };
      }

      map[d].views += toNum(r[idx.views]);
      map[d].clicks += toNum(r[idx.clicks]);
      map[d].spend += toNum(r[idx.spend]);
      map[d].units += toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
      map[d].revenue += toNum(r[idx.dRev]) + toNum(r[idx.iRev]);
    });

    renderDateTable("PCA Performance – Date-wise", map);
  }

  /* ================= COMMON DATE TABLE ================= */

  function renderDateTable(title, data) {
    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>${title}</h4>`;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
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
      .forEach(([d, v]) => {
        const roi = v.spend ? (v.revenue / v.spend).toFixed(2) : "0.00";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${d}</td>
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
