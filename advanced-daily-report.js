/*************************************************
 * ADVANCED DAILY REPORT — INSIGHT FLAGS
 * Low CTR & High Spend No Sales
 *************************************************/

(function () {

  const plaInput = document.getElementById("adrPlaFile");
  const pcaInput = document.getElementById("adrPcaFile");
  const generateBtn = document.getElementById("adrGenerateBtn");
  const container = document.getElementById("advancedDaily");

  let plaRows = [], pcaRows = [];
  let hasPLA = false, hasPCA = false;
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

  function insightFlags(v) {
    const flags = [];
    const ctr = v.views ? (v.clicks / v.views) * 100 : 0;

    if (ctr < 0.5 && v.views > 100) {
      flags.push("⚠ Low CTR");
    }

    if (v.spend > 1000 && v.units === 0) {
      flags.push("🚨 High Spend – No Sales");
    }

    return flags.join(" | ") || "—";
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

  /* ================= GENERATE ================= */

  generateBtn.onclick = () => {
    if (!hasPLA && !hasPCA) {
      alert("Upload PLA or PCA file");
      return;
    }

    clearOldTables();
    renderDateRange();

    const campaignMap = {};

    /* ===== PLA ===== */
    if (hasPLA) {
      const h = plaRows[2].map(normalize);
      const idx = {
        campaign: h.indexOf("campaign name"),
        views: h.indexOf("views"),
        clicks: h.indexOf("clicks"),
        spend: h.indexOf("ad spend"),
        units: h.indexOf("total converted units"),
        revenue: h.indexOf("total revenue (rs.)")
      };

      plaRows.slice(3).forEach(r => {
        const c = r[idx.campaign];
        if (!c) return;

        if (!campaignMap[c]) {
          campaignMap[c] = { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 };
        }

        campaignMap[c].views += toNum(r[idx.views]);
        campaignMap[c].clicks += toNum(r[idx.clicks]);
        campaignMap[c].spend += toNum(r[idx.spend]);
        campaignMap[c].units += toNum(r[idx.units]);
        campaignMap[c].revenue += toNum(r[idx.revenue]);
      });
    }

    /* ===== PCA ===== */
    if (hasPCA) {
      const h = pcaRows[2].map(normalize);
      const idx = {
        campaign: h.indexOf("campaign_name"),
        views: h.indexOf("views"),
        clicks: h.indexOf("clicks"),
        spend: h.indexOf("banner_group_spend"),
        dUnits: h.indexOf("direct units"),
        iUnits: h.indexOf("indirect units"),
        dRev: h.indexOf("direct revenue"),
        iRev: h.indexOf("indirect revenue")
      };

      pcaRows.slice(3).forEach(r => {
        const c = r[idx.campaign];
        if (!c) return;

        if (!campaignMap[c]) {
          campaignMap[c] = { views: 0, clicks: 0, spend: 0, units: 0, revenue: 0 };
        }

        campaignMap[c].views += toNum(r[idx.views]);
        campaignMap[c].clicks += toNum(r[idx.clicks]);
        campaignMap[c].spend += toNum(r[idx.spend]);
        campaignMap[c].units += toNum(r[idx.dUnits]) + toNum(r[idx.iUnits]);
        campaignMap[c].revenue += toNum(r[idx.dRev]) + toNum(r[idx.iRev]);
      });
    }

    renderCampaignAudit(campaignMap);
  };

  /* ================= RENDER ================= */

  function renderCampaignAudit(data) {
    const wrap = document.createElement("div");
    wrap.className = "adr-generated";
    wrap.innerHTML = `<h4>Campaign Performance, Audit & Insights</h4>`;

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Views</th>
          <th>Clicks</th>
          <th>Units</th>
          <th>Revenue (₹)</th>
          <th>ROI</th>
          <th>Audit Remark</th>
          <th>Insight Flags</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    Object.entries(data)
      .map(([k, v]) => {
        const roi = v.spend ? v.revenue / v.spend : 0;
        return { campaign: k, ...v, roi };
      })
      .sort((a, b) => b.roi - a.roi)
      .forEach(v => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${v.campaign}</td>
          <td>${v.views}</td>
          <td>${v.clicks}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(2)}</td>
          <td>${v.roi.toFixed(2)}</td>
          <td>${auditRemark(v.roi)}</td>
          <td>${insightFlags(v)}</td>
        `;
        tbody.appendChild(tr);
      });

    wrap.appendChild(table);
    container.appendChild(wrap);
  }

})();
