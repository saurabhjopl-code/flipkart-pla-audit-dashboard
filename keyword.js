/*************************************************
 * KEYWORD REPORTS — FINAL (HEADER-EXACT)
 * CORE TABS REMAIN LOCKED
 *************************************************/

function keywordSegmentByROI(roi) {
  if (roi >= 7) return ["🟢 Scale", "Increase bids"];
  if (roi >= 5) return ["🟠 Optimize", "Test"];
  if (roi >= 3) return ["🟡 Caution", "Reduce"];
  return ["🔴 Kill", "Pause"];
}

function num(v) {
  if (!v) return 0;
  return Number(v.toString().replace(/₹|,/g, "").trim()) || 0;
}

function generateKeywordReport() {
  const file = document.getElementById("keywordFile").files[0];
  if (!file) {
    alert("Please upload Keyword CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* Report period (row 1 & 2) */
    const period = extractReportPeriod(rows);
    document.getElementById("keywordPeriod").innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    /* Header row (row 3 – fixed) */
    const headers = rows[2];
    const data = rows.slice(3);

    const h = name => headers.indexOf(name);

    const idx = {
      campaignId: h("Campaign ID"),
      campaignName: h("Campaign Name"),
      keyword: h("attributed_keyword"),
      matchType: h("keyword_match_type"),
      views: h("Views"),
      clicks: h("Clicks"),
      spend: h("SUM(cost)"),
      directUnits: h("Direct Units Sold"),
      indirectUnits: h("Indirect Units Sold"),
      directRevenue: h("Direct Revenue"),
      indirectRevenue: h("Indirect Revenue")
    };

    const keywordMap = {};
    let totalSpend = 0;
    let totalRevenue = 0;

    data.forEach(r => {
      const keyword = r[idx.keyword];
      if (!keyword) return;

      const spend = num(r[idx.spend]);
      const directUnits = num(r[idx.directUnits]);
      const indirectUnits = num(r[idx.indirectUnits]);
      const directRevenue = num(r[idx.directRevenue]);
      const indirectRevenue = num(r[idx.indirectRevenue]);

      const units = directUnits + indirectUnits;
      const revenue = directRevenue + indirectRevenue;

      totalSpend += spend;
      totalRevenue += revenue;

      if (!keywordMap[keyword]) {
        keywordMap[keyword] = {
          spend: 0,
          revenue: 0,
          units: 0
        };
      }

      keywordMap[keyword].spend += spend;
      keywordMap[keyword].revenue += revenue;
      keywordMap[keyword].units += units;
    });

    /* Executive Summary */
    document.getElementById("keywordExecutive").innerHTML = `
      <div class="kpi">Total Spend<br>₹${totalSpend.toFixed(0)}</div>
      <div class="kpi">Total Revenue<br>₹${totalRevenue.toFixed(0)}</div>
      <div class="kpi">Overall ROI<br>${(totalRevenue / totalSpend || 0).toFixed(2)}</div>
      <div class="kpi">Keywords<br>${Object.keys(keywordMap).length}</div>
    `;

    /* Keyword Efficiency Table */
    const effBody = document.querySelector("#kwEfficiency tbody");
    effBody.innerHTML = "";

    Object.entries(keywordMap).forEach(([k, v]) => {
      const roi = v.spend ? v.revenue / v.spend : 0;
      const [segment] = keywordSegmentByROI(roi);

      effBody.innerHTML += `
        <tr>
          <td></td>
          <td>${k}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${segment}</td>
        </tr>
      `;
    });

    /* ROI Segmentation Table */
    const segBody = document.querySelector("#kwSegment tbody");
    segBody.innerHTML = "";

    Object.entries(keywordMap).forEach(([k, v]) => {
      const roi = v.spend ? v.revenue / v.spend : 0;
      const [segment, action] = keywordSegmentByROI(roi);

      segBody.innerHTML += `
        <tr>
          <td>${k}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${segment}</td>
          <td>${action}</td>
        </tr>
      `;
    });

    /* Trend tables intentionally skipped (no Date column in file) */
    document.querySelector("#kwDay tbody").innerHTML =
      `<tr><td colspan="5">Date not available in this report</td></tr>`;

    document.querySelector("#kwWeek tbody").innerHTML =
      `<tr><td colspan="5">Date not available in this report</td></tr>`;
  };

  reader.readAsText(file);
}
