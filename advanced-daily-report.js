/*************************************************
 * ADVANCED DAILY REPORT — PHASE 6E (FINAL)
 * Ads Type default sorting by Spend (High → Low)
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

    renderAdsTypeReport();
  };

  /* ================= ADS TYPE REPORT ================= */

  function renderAdsTypeReport() {
    const data = {
      PLA: { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 },
      PCA: { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 }
    };

    if (hasPLA) {
      const h = plaRows[2].map(normalize);
      const idx = {
        views: h.indexOf("views"),
        clicks: h.indexOf("clicks"),
        spend: h.indexOf("ad spend"),
        units: h.indexOf("total converted units"),
        revenue: h.indexOf("total revenue (rs.)")
      };

      plaRows.slice(3).forEach(r => {
        data.PLA.views += toNum(r[idx.views]);
        data.PLA.clicks += toNum(r[idx.clicks]);
        data.PLA.spend += toNum(r[idx.spend]);
        data.PLA.units += toNum(r[idx.units]);
        data.PLA.revenue += toNum(r[idx.revenue]);
      });
    }

    if (hasPCA) {
      const h = pcaRows[2].map(normalize);
      const idx = {
        views: h.indexOf("views"),
        clicks: h.indexOf("clicks"),
        spend: h.indexOf("banner_group_spend"),
        dUnits: h.indexOf("direct units"),
        iUnits: h.indexOf("indirect units"),
        dRev: h.indexOf("direct revenue"),
        iRev: h.indexOf("indirect revenue")
      };

      pcaRows.slice(3).forEach(r => {
        data.PCA.views += toNum(r[idx.views]);
        data.PCA.clicks += toNum(r[idx.clicks]);
        data.PCA.spend += toNum(r[idx.spend]);
        data.PCA.units += toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
        data.PCA.revenue += toNum(r[idx.dRev]) + toNum(r[idx.iRev]);
      });
    }

    renderAdsTypeTable(data);
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
      .sort((a, b) => b[1].spend - a[1].spend) // ✅ Spend High → Low
      .forEach(([t, v]) => {
        const roi = v.spend ? (v.revenue / v.spend).toFixed(2) : "0.00";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t}</td>
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
