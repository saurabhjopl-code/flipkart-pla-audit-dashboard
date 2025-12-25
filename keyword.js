/*************************************************
 * KEYWORD ANALYTICS — FINAL, STABLE, LOCKED
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
let roiSegmentationCache = [];

/* =====================================================
   MAIN ENTRY
===================================================== */
function generateKeywordReport() {
  const file = document.getElementById("keywordFile")?.files[0];
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
       KEYWORD LEVEL AGGREGATION
    ===================================================== */
    const kwMap = {};
    let totalSpend = 0;

    data.forEach(r => {
      const keyword = r[idx.keyword];
      if (!keyword) return;

      const spend = num(r[idx.spend]);
      const units =
        num(r[idx.directUnits]) + num(r[idx.indirectUnits]);
      const revenue =
        num(r[idx.directRevenue]) + num(r[idx.indirectRevenue]);

      totalSpend += spend;

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
    renderTopRevenue(kwMap);

    /* =====================================================
       TOP WASTE KEYWORDS
    ===================================================== */
    renderTopWaste(kwMap);

    /* =====================================================
       ROI-BASED KEYWORD SEGMENTATION
       (Top 15 / Show All / Search / Spend Share)
    ===================================================== */
    buildROISegmentationCache(kwMap, totalSpend);
    renderROISegmentation();

    /* =====================================================
       CAMPAIGN → KEYWORD PERFORMANCE (FIXED)
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
   TOP REVENUE
===================================================== */
function renderTopRevenue(kwMap) {
  const body = document.querySelector("#kwTopRevenue tbody");
  if (!body) return;
  body.innerHTML = "";

  Object.entries(kwMap)
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
        </tr>`;
    });
}

/* =====================================================
   TOP WASTE
===================================================== */
function renderTopWaste(kwMap) {
  const body = document.querySelector("#kwTopWaste tbody");
  if (!body) return;
  body.innerHTML = "";

  Object.entries(kwMap)
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
        </tr>`;
    });
}

/* =====================================================
   ROI SEGMENTATION (CACHE + RENDER)
===================================================== */
function buildROISegmentationCache(kwMap, totalSpend) {
  roiSegmentationCache = Object.entries(kwMap)
    .sort((a, b) => b[1].spend - a[1].spend)
    .map(([k, v]) => {
      const roi = v.spend ? v.revenue / v.spend : 0;
      const [segment, action] = keywordSegmentByROI(roi);
      return {
        keyword: k,
        spend: v.spend,
        spendShare: totalSpend ? (v.spend / totalSpend) * 100 : 0,
        revenue: v.revenue,
        units: v.units,
        roi,
        segment,
        action
      };
    });
}

function renderROISegmentation() {
  const tbody = document.querySelector("#kwSegment tbody");
  if (!tbody) return;

  const search =
    document.getElementById("roiKeywordSearch")?.value.toLowerCase() || "";

  let rows = roiSegmentationCache.filter(r =>
    r.keyword.toLowerCase().includes(search) ||
    r.segment.toLowerCase().includes(search)
  );

  rows = roiSegmentationExpanded ? rows : rows.slice(0, 15);
  tbody.innerHTML = "";

  rows.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.keyword}</td>
        <td>${r.spend.toFixed(0)}</td>
        <td>${r.spendShare.toFixed(1)}%</td>
        <td>${r.revenue.toFixed(0)}</td>
        <td>${r.units}</td>
        <td>${r.roi.toFixed(2)}</td>
        <td>${r.segment}</td>
        <td>${r.action}</td>
      </tr>`;
  });

  injectROIToggleButton();
}

function filterROISegmentation() {
  renderROISegmentation();
}

function injectROIToggleButton() {
  let btn = document.getElementById("roiToggleBtn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "roiToggleBtn";
    btn.style.margin = "8px 0";
    btn.onclick = () => {
      roiSegmentationExpanded = !roiSegmentationExpanded;
      renderROISegmentation();
    };
    document.getElementById("kwSegment").after(btn);
  }

  btn.innerText = roiSegmentationExpanded
    ? "Show Top 15 Keywords"
    : `Show All Keywords (${roiSegmentationCache.length})`;
}

/* =====================================================
   CAMPAIGN → KEYWORD PERFORMANCE (DEFENSIVE & FIXED)
===================================================== */
function buildCampaignKeywordTable(rows, headers) {
  const table = document.getElementById("kwCampaign");
  if (!table) return;

  const tbody = table.querySelector("tbody");
  if (!tbody) return;

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
    const campaign = r[idx.campaign];
    const keyword = r[idx.keyword];
    if (!campaign || !keyword) return;

    const units =
      num(r[idx.directUnits]) + num(r[idx.indirectUnits]);

    if (!map[campaign]) map[campaign] = [];
    map[campaign].push({
      keyword,
      views: num(r[idx.views]),
      clicks: num(r[idx.clicks]),
      units,
      roi: num(r[idx.roi])
    });
  });

  tbody.innerHTML = "";

  Object.entries(map).forEach(([campaign, list], i) => {
    const cid = `camp_${i}`;

    tbody.innerHTML += `
      <tr class="campaign-row" onclick="toggleCampaign('${cid}')">
        <td colspan="5">▶ ${campaign}</td>
      </tr>`;

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
          </tr>`;
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
      </tr>`;
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

  const tbody = document.querySelector("#kwContribution tbody");
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
          </tr>`;
      });
  });
}
