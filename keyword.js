/*************************************************
 * KEYWORD REPORTS — FINAL LOCKED VERSION
 * CORE TABS REMAIN UNTOUCHED
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

    /* Report period */
    const period = extractReportPeriod(rows);
    document.getElementById("keywordPeriod").innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    /* Headers are FIXED at row 3 */
    const headers = rows[2];
    const data = rows.slice(3);
    const h = name => headers.indexOf(name);

    const idx = {
      keyword: h("attributed_keyword"),
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
      const units =
        num(r[idx.directUnits]) + num(r[idx.indirectUnits]);
      const revenue =
        num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);

      totalSpend += spend;
      totalRevenue += revenue;

      if (!keywordMap[keyword]) {
        keywordMap[keyword] = { spend: 0, revenue: 0, units: 0 };
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

    /* ROI-Based Keyword Segmentation (LOCKED & CORRECT) */
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

    /* Trend reports — NOT POSSIBLE (NO DATE COLUMN) */
    document.querySelector("#kwDay tbody").innerHTML =
      `<tr><td colspan="5">Trend not available — Date column not present in this report</td></tr>`;

    document.querySelector("#kwWeek tbody").innerHTML =
      `<tr><td colspan="5">Trend not available — Date column not present in this report</td></tr>`;
  };

  reader.readAsText(file);
}
