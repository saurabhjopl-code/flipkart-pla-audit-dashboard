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
       🔥 SORTED BY SPEND (₹) DESC
    ===================================================== */
    const segTable = document.getElementById("kwSegment");
    if (segTable) {
      const body = segTable.querySelector("tbody");
      body.innerHTML = "";

      Object.entries(kwMap)
        .sort((a, b) => b[1].spend - a[1].spend)
        .forEach(([k, v]) => {
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
   CAMPAIGN-WISE KEYWORD PERFORMANCE (COLLAPSIBLE)
===================================================== */
function buildCampaignKeywordTable(rows, headers) {
  const h = name => headers.indexOf(name);

  const idx = {
    campaign: h("Campaign Name"),
    keyword: h("attributed_keyword"),
    views: h("Views"),
    clicks: h("Clicks"),
    directUnits: h("Direct Units Sold"),
    indirectUnits: h("Indirect Units Sold"),
    roi: h("ROI")
  };

  const map = {};

  rows.forEach(r => {
    const camp = r[idx.campaign];
    const kw = r[idx.keyword];
    if (!camp || !kw) return;

    const units =
      num(r[idx.directUnits]) + num(r[idx.indirectUnits]);

    if (!map[camp]) map[camp] = [];
    map[camp].push({
      keyword: kw,
      views: num(r[idx.views]),
      clicks: num(r[idx.clicks]),
      units,
      roi: num(r[idx.roi])
    });
  });

  const tbody = document.querySelector("#kwCampaign tbody");
  tbody.innerHTML = "";

  Object.entries(map).forEach(([camp, list], i) => {
    const cid = `camp_${i}`;

    tbody.innerHTML += `
      <tr class="campaign-row" onclick="toggleCampaign('${cid}')">
        <td colspan="5">▶ ${camp}</td>
      </tr>
    `;

    list
      .sort((a, b) =>
        b.units !== a.units ? b.units - a.units : b.roi - a.roi
      )
      .forEach(k => {
        tbody.innerHTML += `
          <tr class="keyword-row ${cid}" style="display:none">
            <td>${k.keyword}</td>
            <td>${k.views}</td>
            <td>${k.clicks}</td>
            <td><b>${k.units}</b></td>
            <td>${k.roi.toFixed(2)}</td>
          </tr>
        `;
      });
  });
}

function toggleCampaign(id) {
  document.querySelectorAll("." + id).forEach(r => {
    r.style.display =
      r.style.display === "none" ? "table-row" : "none";
  });
}

function expandAllKeywords() {
  document.querySelectorAll(".keyword-row").forEach(r => {
    r.style.display = "table-row";
  });
}

function collapseAllKeywords() {
  document.querySelectorAll(".keyword-row").forEach(r => {
    r.style.display = "none";
  });
}

/* =====================================================
   MATCH TYPE ANALYSIS
===================================================== */
function buildMatchTypeAnalysis(rows, headers) {
  const h = name => headers.indexOf(name);

  const idx = {
    match: h("keyword_match_type"),
    keyword: h("attributed_keyword"),
    views: h("Views"),
    clicks: h("Clicks"),
    spend: h("SUM(cost)"),
    directUnits: h("Direct Units Sold"),
    indirectUnits: h("Indirect Units Sold"),
    directRevenue: h("Direct Revenue"),
    indirectRevenue: h("Indirect Revenue")
  };

  const map = {};

  rows.forEach(r => {
    const m = r[idx.match];
    if (!m) return;

    if (!map[m]) {
      map[m] = {
        keywords: new Set(),
        views: 0,
        clicks: 0,
        units: 0,
        revenue: 0,
        spend: 0
      };
    }

    map[m].keywords.add(r[idx.keyword]);
    map[m].views += num(r[idx.views]);
    map[m].clicks += num(r[idx.clicks]);
    map[m].units +=
      num(r[idx.directUnits]) + num(r[idx.indirectUnits]);
    map[m].revenue +=
      num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);
    map[m].spend += num(r[idx.spend]);
  });

  const tbody = document.querySelector("#kwMatchType tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  Object.entries(map).forEach(([m, v]) => {
    const roi = v.spend ? v.revenue / v.spend : 0;
    const [, action] = keywordSegmentByROI(roi);

    tbody.innerHTML += `
      <tr>
        <td>${m}</td>
        <td>${v.keywords.size}</td>
        <td>${v.views}</td>
        <td>${v.clicks}</td>
        <td>${v.units}</td>
        <td>${v.revenue.toFixed(0)}</td>
        <td>${roi.toFixed(2)}</td>
        <td>${action}</td>
      </tr>
    `;
  });
}

/* =====================================================
   KEYWORD → CAMPAIGN CONTRIBUTION %
===================================================== */
function buildKeywordCampaignContribution(rows, headers) {
  const h = name => headers.indexOf(name);

  const idx = {
    keyword: h("attributed_keyword"),
    campaign: h("Campaign Name"),
    directUnits: h("Direct Units Sold"),
    indirectUnits: h("Indirect Units Sold"),
    directRevenue: h("Direct Revenue"),
    indirectRevenue: h("Indirect Revenue")
  };

  const map = {};
  const totalByKeyword = {};

  rows.forEach(r => {
    const kw = r[idx.keyword];
    const camp = r[idx.campaign];
    if (!kw || !camp) return;

    const revenue =
      num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);
    const units =
      num(r[idx.directUnits]) + num(r[idx.indirectUnits]);

    if (!map[kw]) map[kw] = {};
    if (!map[kw][camp]) map[kw][camp] = { revenue: 0, units: 0 };

    map[kw][camp].revenue += revenue;
    map[kw][camp].units += units;

    totalByKeyword[kw] =
      (totalByKeyword[kw] || 0) + revenue;
  });

  const tbody =
    document.querySelector("#kwContribution tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  Object.entries(map).forEach(([kw, camps]) => {
    Object.entries(camps)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .forEach(([camp, v]) => {
        const pct =
          totalByKeyword[kw] > 0
            ? (v.revenue / totalByKeyword[kw]) * 100
            : 0;

        tbody.innerHTML += `
          <tr>
            <td>${kw}</td>
            <td>${camp}</td>
            <td>${v.revenue.toFixed(0)}</td>
            <td>${v.units}</td>
            <td>${pct.toFixed(1)}%</td>
          </tr>
        `;
      });
  });
}
