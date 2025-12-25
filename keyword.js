/*************************************************
 * KEYWORD ANALYTICS — FINAL LOCKED VERSION
 * SAFE: DOES NOT TOUCH OTHER REPORTS
 *************************************************/

function num(v) {
  if (!v) return 0;
  return Number(v.toString().replace(/₹|,/g, "").trim()) || 0;
}

/* ROI SEGMENTATION RULE (LOCKED) */
function keywordSegmentByROI(roi) {
  if (roi >= 7) return ["🟢 Scale", "Increase bids"];
  if (roi >= 5) return ["🟠 Optimize", "Test"];
  if (roi >= 3) return ["🟡 Caution", "Reduce"];
  return ["🔴 Kill", "Pause"];
}

let roiSegmentationExpanded = false;

/* =====================================================
   MAIN ENTRY
===================================================== */
function generateKeywordReport() {
  const file = document.getElementById("keywordFile").files[0];
  if (!file) {
    alert("Please upload Keyword CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* -------- Report Period -------- */
    const period = extractReportPeriod(rows);
    const periodEl = document.getElementById("keywordPeriod");
    if (periodEl) {
      periodEl.innerHTML =
        `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    /* -------- Headers (Row 3 fixed) -------- */
    const headers = rows[2];
    const data = rows.slice(3);
    const h = name => headers.indexOf(name);

    const idx = {
      campaign: h("Campaign Name"),
      keyword: h("attributed_keyword"),
      matchType: h("keyword_match_type"),
      views: h("Views"),
      clicks: h("Clicks"),
      roi: h("ROI"),
      spend: h("SUM(cost)"),
      directUnits: h("Direct Units Sold"),
      indirectUnits: h("Indirect Units Sold"),
      directRevenue: h("Direct Revenue"),
      indirectRevenue: h("Indirect Revenue")
    };

    /* =====================================================
       KEYWORD-LEVEL AGGREGATION
    ===================================================== */
    const kwMap = {};

    data.forEach(r => {
      const keyword = r[idx.keyword];
      if (!keyword) return;

      const spend = num(r[idx.spend]);
      const units =
        num(r[idx.directUnits]) + num(r[idx.indirectUnits]);
      const revenue =
        num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);

      if (!kwMap[keyword]) {
        kwMap[keyword] = { spend: 0, revenue: 0, units: 0 };
      }

      kwMap[keyword].spend += spend;
      kwMap[keyword].revenue += revenue;
      kwMap[keyword].units += units;
    });

    /* =====================================================
       TOP REVENUE KEYWORDS
    ===================================================== */
    const topRevenueBody =
      document.querySelector("#kwTopRevenue tbody");
    if (topRevenueBody) {
      topRevenueBody.innerHTML = "";

      Object.entries(kwMap)
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
    }

    /* =====================================================
       TOP WASTE KEYWORDS
    ===================================================== */
    const topWasteBody =
      document.querySelector("#kwTopWaste tbody");
    if (topWasteBody) {
      topWasteBody.innerHTML = "";

      Object.entries(kwMap)
        .filter(([_, v]) => v.spend > 0 && v.units === 0)
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 10)
        .forEach(([k, v]) => {
          topWasteBody.innerHTML += `
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
       ROI-BASED KEYWORD SEGMENTATION
       DEFAULT: TOP 15 BY SPEND
    ===================================================== */
    buildROISegmentationTable(kwMap);

    /* =====================================================
       CAMPAIGN → KEYWORD PERFORMANCE
    ===================================================== */
    buildCampaignKeywordTable(data, headers);

    /* =====================================================
       MATCH TYPE ANALYSIS
    ===================================================== */
    buildMatchTypeAnalysis(data, headers);

    /* =====================================================
       KEYWORD → CAMPAIGN CONTRIBUTION %
    ===================================================== */
    buildKeywordCampaignContribution(data, headers);
  };

  reader.readAsText(file);
}

/* =====================================================
   ROI SEGMENTATION TABLE (SHOW 15 / SHOW ALL)
===================================================== */
function buildROISegmentationTable(kwMap) {
  const segTable = document.getElementById("kwSegment");
  if (!segTable) return;

  const body = segTable.querySelector("tbody");
  body.innerHTML = "";

  const sorted = Object.entries(kwMap)
    .sort((a, b) => b[1].spend - a[1].spend);

  const rowsToShow = roiSegmentationExpanded
    ? sorted
    : sorted.slice(0, 15);

  rowsToShow.forEach(([k, v]) => {
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

  injectROIToggleButton(sorted.length);
}

function injectROIToggleButton(totalCount) {
  let btn = document.getElementById("roiToggleBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "roiToggleBtn";
    btn.style.margin = "8px 0";
    btn.onclick = () => {
      roiSegmentationExpanded = !roiSegmentationExpanded;
      generateKeywordReport();
    };
    document
      .getElementById("kwSegment")
      .after(btn);
  }

  btn.innerText = roiSegmentationExpanded
    ? "Show Top 15 Keywords"
    : `Show All Keywords (${totalCount})`;
}
