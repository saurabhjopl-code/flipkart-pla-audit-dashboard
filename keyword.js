/*************************************************
 * KEYWORD REPORTS — FINAL LOCKED VERSION
 * DOES NOT TOUCH CORE TABS
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
  const fileInput = document.getElementById("keywordFile");
  if (!fileInput || !fileInput.files.length) {
    alert("Please upload Keyword CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* ---------- Report Period ---------- */
    const period = extractReportPeriod(rows);
    const periodEl = document.getElementById("keywordPeriod");
    if (periodEl) {
      periodEl.innerHTML = `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    /* ---------- Fixed Headers ---------- */
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

    const kw = {};

    data.forEach(r => {
      const keyword = r[idx.keyword];
      if (!keyword) return;

      const spend = num(r[idx.spend]);
      const units =
        num(r[idx.directUnits]) + num(r[idx.indirectUnits]);
      const revenue =
        num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);

      if (!kw[keyword]) {
        kw[keyword] = { spend: 0, revenue: 0, units: 0 };
      }

      kw[keyword].spend += spend;
      kw[keyword].revenue += revenue;
      kw[keyword].units += units;
    });

    /* =====================================================
       TOP REVENUE KEYWORDS
    ===================================================== */
    const topRevenueTable = document.getElementById("kwTopRevenue");
    if (topRevenueTable) {
      const body = topRevenueTable.querySelector("tbody");
      body.innerHTML = "";

      Object.entries(kw)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .forEach(([k, v]) => {
          const roi = v.spend ? v.revenue / v.spend : 0;
          body.innerHTML += `
            <tr>
              <td>${k}</td>
              <td>${v.spend.toFixed(0)}</td>
              <td>${v.revenue.toFixed(0)}</td>
              <td>${v.units}</td>
              <td>${roi.toFixed(2)}</td>
            </tr>
          `;
        });
    }

    /* =====================================================
       TOP WASTE KEYWORDS
    ===================================================== */
    const topWasteTable = document.getElementById("kwTopWaste");
    if (topWasteTable) {
      const body = topWasteTable.querySelector("tbody");
      body.innerHTML = "";

      Object.entries(kw)
        .filter(([_, v]) => v.spend > 0 && v.units === 0)
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 10)
        .forEach(([k, v]) => {
          body.innerHTML += `
            <tr>
              <td>${k}</td>
              <td>${v.spend.toFixed(0)}</td>
              <td>${v.revenue.toFixed(0)}</td>
              <td>${v.units}</td>
              <td>0.00</td>
            </tr>
          `;
        });
    }

    /* =====================================================
       ROI-BASED KEYWORD SEGMENTATION (FIXED)
    ===================================================== */
    const kwSegmentTable = document.getElementById("kwSegment");
    if (kwSegmentTable) {
      const body = kwSegmentTable.querySelector("tbody");
      body.innerHTML = "";

      Object.entries(kw).forEach(([k, v]) => {
        const roi = v.spend ? v.revenue / v.spend : 0;
        const [segment, action] = keywordSegmentByROI(roi);

        body.innerHTML += `
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
    }

    /* =====================================================
       TREND TABLES — CORRECTLY DISABLED
    ===================================================== */
    const dayTable = document.getElementById("kwDay");
    if (dayTable) {
      dayTable.querySelector("tbody").innerHTML =
        `<tr><td colspan="5">Trend not available — Date column not present</td></tr>`;
    }

    const weekTable = document.getElementById("kwWeek");
    if (weekTable) {
      weekTable.querySelector("tbody").innerHTML =
        `<tr><td colspan="5">Trend not available — Date column not present</td></tr>`;
    }
  };

  reader.readAsText(fileInput.files[0]);
}
