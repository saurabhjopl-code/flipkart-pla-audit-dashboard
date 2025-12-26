/*************************************************
 * ADVANCED DAILY REPORT — PHASE 6B
 * Category-wise Report (AdGroup Name from FSN)
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

  function auditRemark(roi) {
    if (roi >= 5) return "🟢 Scale";
    if (roi >= 3) return "🟠 Optimize";
    return "🔴 Loss";
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
    extractDateRange(fsnRows);
    hasFSN = fsnRows.length > 3;
  };

  /* ================= GENERATE ================= */

  generateBtn.onclick = () => {
    if (!hasFSN) {
      alert("Upload Consolidated FSN Report to generate Category-wise report");
      return;
    }

    clearOldTables();
    renderDateRange();

    renderCategoryReport();
  };

  /* ================= CATEGORY REPORT ================= */

  function renderCategoryReport() {
    const h = fsnRows[2].map(normalize);
    const idx = {
      category: h.indexOf("adgroup name"),
      views: h.indexOf("views"),
      clicks: h.indexOf("clicks"),
      dUnits: h.indexOf("direct units sold"),
      iUnits: h.indexOf("indirect units sold"),
      revenue: h.indexOf("total revenue (rs.)"),
      roi: h.indexOf("roi")
    };

    const map = {};

    fsnRows.slice(3).forEach(r => {
      const cat = r[idx.category];
      if (!cat) return;

      if (!map[cat]) {
        map[cat] = {
          category: cat,
          views: 0,
          clicks: 0,
          units: 0,
          revenue: 0,
          spend: 0
        };
      }

      const views = toNum(r[idx.views]);
      const clicks = toNum(r[idx.clicks]);
      const units = toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
      const revenue = toNum(r[idx.revenue]);
      const roiVal = toNum(r[idx.roi]);

      map[cat].views += views;
      map[cat].clicks += clicks;
      map[cat].units += units;
      map[cat].revenue += revenue;

      if (roiVal > 0) {
        map[cat].spend += revenue / roiVal;
      }
    });

    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>Category Performance (AdGroup Name)</h4>`;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Category</th>
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

    Object.values(map)
      .map(v => ({
        ...v,
        roi: v.spend ? v.revenue / v.spend : 0
      }))
      .sort((a, b) => a.category.localeCompare(b.category)) // A → Z
      .forEach(v => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${v.category}</td>
          <td>${v.views}</td>
          <td>${v.clicks}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(2)}</td>
          <td>${v.roi.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
      });

    wrap.appendChild(table);
    container.appendChild(wrap);
  }

})();
