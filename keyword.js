/*************************************************
 * KEYWORD REPORTS — FINAL SAFE VERSION
 * CORE TABS UNTOUCHED
 *************************************************/

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getHeaderIndex(headers, possibleNames) {
  const normHeaders = headers.map(normalizeHeader);
  for (let name of possibleNames) {
    const idx = normHeaders.indexOf(normalizeHeader(name));
    if (idx !== -1) return idx;
  }
  return -1;
}

function num(v) {
  if (!v) return 0;
  return Number(
    v.toString().replace(/₹/g, "").replace(/,/g, "").trim()
  ) || 0;
}

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

    // ---- Report Period ----
    const period = extractReportPeriod(rows);
    document.getElementById("keywordPeriod").innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    // ---- Header Row Detection ----
    const headerRow = autoDetectHeader(rows, ["keyword", "spend"]);
    const headers = rows[headerRow];

    // ---- Header Mapping (ROBUST) ----
    const h = {
      keyword: getHeaderIndex(headers, [
        "attributed_keyword",
        "attributed keyword",
        "keyword"
      ]),
      searchTerm: getHeaderIndex(headers, [
        "search term",
        "customer search term"
      ]),
      spend: getHeaderIndex(headers, [
        "spend",
        "spendrs",
        "spend₹"
      ]),
      directRev: getHeaderIndex(headers, [
        "direct revenue",
        "direct revenue rs",
        "direct revenue (rs.)"
      ]),
      indirectRev: getHeaderIndex(headers, [
        "indirect revenue",
        "indirect revenue rs",
        "indirect revenue (rs.)"
      ]),
      directUnits: getHeaderIndex(headers, [
        "direct units",
        "direct units sold"
      ]),
      indirectUnits: getHeaderIndex(headers, [
        "indirect units",
        "indirect units sold"
      ]),
      date: getHeaderIndex(headers, [
        "date",
        "impression date"
      ])
    };

    if (h.keyword === -1 || h.spend === -1) {
      alert("Keyword CSV headers not recognized. Please verify file.");
      return;
    }

    const data = rows.slice(headerRow + 1);

    const keywordMap = {};
    const dayMap = {};
    const weekMap = {};

    let totalSpend = 0;
    let totalRevenue = 0;

    data.forEach(r => {
      const keyword = r[h.keyword];
      if (!keyword) return;

      const spend = num(r[h.spend]);
      const directRev = num(r[h.directRev]);
      const indirectRev = num(r[h.indirectRev]);
      const directUnits = num(r[h.directUnits]);
      const indirectUnits = num(r[h.indirectUnits]);

      const revenue = directRev + indirectRev;
      const units = directUnits + indirectUnits;

      totalSpend += spend;
      totalRevenue += revenue;

      if (!keywordMap[keyword]) {
        keywordMap[keyword] = { spend: 0, revenue: 0, units: 0 };
      }

      keywordMap[keyword].spend += spend;
      keywordMap[keyword].revenue += revenue;
      keywordMap[keyword].units += units;

      const date = h.date !== -1 ? r[h.date] : null;
      if (date) {
        if (!dayMap[date]) dayMap[date] = { spend: 0, revenue: 0, units: 0 };
        dayMap[date].spend += spend;
        dayMap[date].revenue += revenue;
        dayMap[date].units += units;

        const week = getWeekRange(date).label;
        if (!weekMap[week]) weekMap[week] = { spend: 0, revenue: 0, units: 0 };
        weekMap[week].spend += spend;
        weekMap[week].revenue += revenue;
        weekMap[week].units += units;
      }
    });

    // ---- Executive Summary ----
    document.getElementById("keywordExecutive").innerHTML = `
      <div class="kpi">Total Spend<br>₹${totalSpend.toFixed(0)}</div>
      <div class="kpi">Total Revenue<br>₹${totalRevenue.toFixed(0)}</div>
      <div class="kpi">Overall ROI<br>${(totalRevenue / totalSpend || 0).toFixed(2)}</div>
      <div class="kpi">Keywords<br>${Object.keys(keywordMap).length}</div>
    `;

    // ---- Efficiency Table ----
    const effBody = document.querySelector("#kwEfficiency tbody");
    effBody.innerHTML = "";
    Object.entries(keywordMap).forEach(([k, v]) => {
      const roi = v.spend ? v.revenue / v.spend : 0;
      const [seg] = keywordSegmentByROI(roi);
      effBody.innerHTML += `
        <tr>
          <td></td>
          <td>${k}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${seg}</td>
        </tr>
      `;
    });

    // ---- ROI Segmentation ----
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

    // ---- Day-wise ----
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
            <td>${(v.revenue / v.spend || 0).toFixed(2)}</td>
          </tr>
        `;
      });

    // ---- Week-wise ----
    const weekBody = document.querySelector("#kwWeek tbody");
    weekBody.innerHTML = "";
    Object.entries(weekMap).forEach(([w, v]) => {
      weekBody.innerHTML += `
        <tr>
          <td>${w}</td>
          <td>${v.spend.toFixed(0)}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td>${v.units}</td>
          <td>${(v.revenue / v.spend || 0).toFixed(2)}</td>
        </tr>
      `;
    });
  };

  reader.readAsText(file);
}
