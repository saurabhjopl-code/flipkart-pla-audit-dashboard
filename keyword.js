/*************************************************
 * KEYWORD REPORTS (ISOLATED MODULE)
 * DOES NOT TOUCH CORE REPORTS
 *************************************************/

function keywordSegmentByROI(roi) {
  if (roi >= 7) return ["🟢 Scale", "Increase bids"];
  if (roi >= 5) return ["🟠 Optimize", "Test"];
  if (roi >= 3) return ["🟡 Caution", "Reduce"];
  return ["🔴 Kill", "Pause"];
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

    /* Header detection */
    const headerRow = autoDetectHeader(rows, ["attributed_keyword", "Spend"]);
    const headers = rows[headerRow];
    const data = rows.slice(headerRow + 1);
    const h = name => headers.indexOf(name);

    const keywordMap = {};
    const dayMap = {};
    const weekMap = {};

    let totalSpend = 0;
    let totalRevenue = 0;

    data.forEach(r => {
      const keyword = r[h("attributed_keyword")];
      if (!keyword) return;

      const searchTerm = r[h("Search Term")] || "";
      const date = r[h("Date")];

      const spend = +r[h("Spend")] || 0;
      const directRev = +r[h("Direct Revenue")] || 0;
      const indirectRev = +r[h("Indirect Revenue")] || 0;
      const directUnits = +r[h("Direct Units")] || 0;
      const indirectUnits = +r[h("Indirect Units")] || 0;

      const revenue = directRev + indirectRev;
      const units = directUnits + indirectUnits;

      totalSpend += spend;
      totalRevenue += revenue;

      if (!keywordMap[keyword]) {
        keywordMap[keyword] = {
          searchTerm,
          spend: 0,
          revenue: 0,
          units: 0
        };
      }

      keywordMap[keyword].spend += spend;
      keywordMap[keyword].revenue += revenue;
      keywordMap[keyword].units += units;

      if (date) {
        if (!dayMap[date]) dayMap[date] = { spend: 0, revenue: 0, units: 0 };
        dayMap[date].spend += spend;
        dayMap[date].revenue += revenue;
        dayMap[date].units += units;

        const weekLabel = getWeekRange(date).label;
        if (!weekMap[weekLabel]) weekMap[weekLabel] = { spend: 0, revenue: 0, units: 0 };
        weekMap[weekLabel].spend += spend;
        weekMap[weekLabel].revenue += revenue;
        weekMap[weekLabel].units += units;
      }
    });

    /* Executive Summary */
    document.getElementById("keywordExecutive").innerHTML = `
      <div class="kpi">Total Spend<br>₹${totalSpend.toFixed(0)}</div>
      <div class="kpi">Total Revenue<br>₹${totalRevenue.toFixed(0)}</div>
      <div class="kpi">Overall ROI<br>${(totalRevenue / totalSpend).toFixed(2)}</div>
      <div class="kpi">Keywords<br>${Object.keys(keywordMap).length}</div>
    `;

    /* Efficiency Table */
    const effBody = document.querySelector("#kwEfficiency tbody");
    effBody.innerHTML = "";
    Object.entries(keywordMap).forEach(([k, v]) => {
      const roi = v.spend ? v.revenue / v.spend : 0;
      const [seg] = keywordSegmentByROI(roi);
      effBody.innerHTML += `
        <tr>
          <td>${v.searchTerm}</td>
          <td>${k}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${seg}</td>
        </tr>
      `;
    });

    /* ROI Segmentation */
    const segBody = document.querySelector("#kwSegment tbody");
    segBody.innerHTML = "";
    Object.entries(keywordMap).forEach(([k, v]) => {
      const roi = v.spend ? v.revenue / v.spend : 0;
      const [seg, action] = keywordSegmentByROI(roi);
      segBody.innerHTML += `
        <tr>
          <td>${k}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${seg}</td>
          <td>${action}</td>
        </tr>
      `;
    });

    /* Day-wise Trend */
    const dayBody = document.querySelector("#kwDay tbody");
    dayBody.innerHTML = "";
    Object.keys(dayMap)
      .sort((a, b) => new Date(a) - new Date(b))
      .forEach(d => {
        const v = dayMap[d];
        dayBody.innerHTML += `
          <tr>
            <td>${d}</td>
            <td>${v.spend.toFixed(0)}</td>
            <td>${v.revenue.toFixed(0)}</td>
            <td>${v.units}</td>
            <td>${(v.revenue / v.spend).toFixed(2)}</td>
          </tr>
        `;
      });

    /* Week-wise Trend */
    const weekBody = document.querySelector("#kwWeek tbody");
    weekBody.innerHTML = "";
    Object.entries(weekMap).forEach(([w, v]) => {
      weekBody.innerHTML += `
        <tr>
          <td>${w}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${(v.revenue / v.spend).toFixed(2)}</td>
        </tr>
      `;
    });
  };

  reader.readAsText(file);
}
