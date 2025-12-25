/*************************************************
 * KEYWORD REPORTS — FINAL CLEAN VERSION
 * CORE TABS LOCKED
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

    /* Report Period */
    const period = extractReportPeriod(rows);
    document.getElementById("keywordPeriod").innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    /* Fixed headers at row 3 */
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

    data.forEach(r => {
      const keyword = r[idx.keyword];
      if (!keyword) return;

      const spend = num(r[idx.spend]);
      const units =
        num(r[idx.directUnits]) + num(r[idx.indirectUnits]);
      const revenue =
        num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);

      if (!keywordMap[keyword]) {
        keywordMap[keyword] = { spend: 0, revenue: 0, units: 0 };
      }

      keywordMap[keyword].spend += spend;
      keywordMap[keyword].revenue += revenue;
      keywordMap[keyword].units += units;
    });

    /* ========= Top Revenue Keywords ========= */
    const topRevenueBody =
      document.querySelector("#kwTopRevenue tbody");
    topRevenueBody.innerHTML = "";

    Object.entries(keywordMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .forEach(([k, v]) => {
        const roi = v.spend ? v.revenue / v.spend : 0;
        topRevenueBody.innerHTML += `
          <tr>
            <td>${k}</td>
            <td>${v.spend.toFixed(0)}</td>
            <td>${v.revenue.toFixed(0)}</td>
            <td>${v.units}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>
        `;
      });

    /* ========= Top Waste Keywords ========= */
    const topWasteBody =
      document.querySelector("#kwTopWaste tbody");
    topWasteBody.innerHTML = "";

    Object.entries(keywordMap)
      .filter(([_, v]) => v.spend > 0 && v.units === 0)
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 10)
      .forEach(([k, v]) => {
        const roi = 0;
        topWasteBody.innerHTML += `
          <tr>
            <td>${k}</td>
            <td>${v.spend.toFixed(0)}</td>
            <td>${v.revenue.toFixed(0)}</td>
            <td>${v.units}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>
        `;
      });

    /* Trend tables intentionally disabled */
    document.querySelector("#kwDay tbody").innerHTML =
      `<tr><td colspan="5">Trend not available — Date column not present</td></tr>`;

    document.querySelector("#kwWeek tbody").innerHTML =
      `<tr><td colspan="5">Trend not available — Date column not present</td></tr>`;
  };

  reader.readAsText(file);
}
