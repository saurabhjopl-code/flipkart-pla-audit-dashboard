/*************************************************
 * KEYWORD REPORT — FINAL LOCKED VERSION
 * SAFE: DOES NOT TOUCH OTHER TABS
 *************************************************/

function num(v) {
  if (!v) return 0;
  return Number(v.toString().replace(/₹|,/g, "").trim()) || 0;
}

/* ROI Segmentation Rule (LOCKED) */
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

    /* Report Period (Row 1 & 2) */
    const period = extractReportPeriod(rows);
    document.getElementById("keywordPeriod").innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    /* Fixed headers (Row 3) */
    const headers = rows[2];
    const data = rows.slice(3);
    const h = name => headers.indexOf(name);

    const idx = {
      campaign: h("Campaign Name"),
      keyword: h("attributed_keyword"),
      views: h("Views"),
      clicks: h("Clicks"),
      roi: h("ROI"),
      spend: h("SUM(cost)"),
      directUnits: h("Direct Units Sold"),
      indirectUnits: h("Indirect Units Sold"),
      directRevenue: h("Direct Revenue"),
      indirectRevenue: h("Indirect Revenue")
    };

    /* --------------------------------------------------
       AGGREGATION
    -------------------------------------------------- */
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

    /* --------------------------------------------------
       TOP REVENUE KEYWORDS
    -------------------------------------------------- */
    const topRevenueBody =
      document.querySelector("#kwTopRevenue tbody");
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

    /* --------------------------------------------------
       TOP WASTE KEYWORDS
    -------------------------------------------------- */
    const topWasteBody =
      document.querySelector("#kwTopWaste tbody");
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

    /* --------------------------------------------------
       ROI-BASED KEYWORD SEGMENTATION (LOCKED)
    -------------------------------------------------- */
    const kwSegmentTable = document.getElementById("kwSegment");
    const segBody = kwSegmentTable.querySelector("tbody");
    segBody.innerHTML = "";

    Object.entries(kwMap).forEach(([k, v]) => {
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

    /* --------------------------------------------------
       CAMPAIGN-WISE KEYWORD PERFORMANCE
    -------------------------------------------------- */
    buildCampaignKeywordTable(data, headers);
  };

  reader.readAsText(file);
}

/* =====================================================
   CAMPAIGN → KEYWORD TABLE
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
    const campId = `camp_${i}`;

    tbody.innerHTML += `
      <tr class="campaign-row" onclick="toggleCampaign('${campId}')">
        <td colspan="5">▶ ${camp}</td>
      </tr>
    `;

    list
      .sort((a, b) =>
        b.units !== a.units ? b.units - a.units : b.roi - a.roi
      )
      .forEach(k => {
        const color =
          k.roi >= 7 ? "green" :
          k.roi >= 5 ? "orange" :
          k.roi >= 3 ? "yellow" : "red";

        tbody.innerHTML += `
          <tr class="keyword-row ${campId}" style="display:none">
            <td>${k.keyword}</td>
            <td>${k.views}</td>
            <td>${k.clicks}</td>
            <td><b>${k.units}</b></td>
            <td class="${color}">${k.roi.toFixed(2)}</td>
          </tr>
        `;
      });
  });
}

/* =====================================================
   COLLAPSE / EXPAND CONTROLS
===================================================== */

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
