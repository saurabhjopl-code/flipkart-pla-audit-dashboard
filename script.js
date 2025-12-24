/***********************
 * TAB SWITCHING
 ***********************/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
});

/***********************
 * CSV PARSER
 ***********************/
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && q && n === '"') { cur += '"'; i++; }
    else if (c === '"') q = !q;
    else if (c === "," && !q) { row.push(cur.trim()); cur = ""; }
    else if (c === "\n" && !q) { row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur.trim());
  rows.push(row);
  return rows;
}

/***********************
 * AUTO HEADER DETECTION
 ***********************/
function autoDetectHeader(rows, requiredHeaders) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const found = requiredHeaders.filter(h => rows[i].includes(h)).length;
    if (found >= 2) return i;
  }
  throw new Error("Valid header row not found");
}

/***********************
 * REPORT PERIOD
 ***********************/
function extractReportPeriod(rows) {
  let start = "", end = "";

  rows.slice(0, 5).forEach(r => {
    const line = r.join(" ").trim();

    if (/start\s*time/i.test(line)) {
      start = line.replace(/.*start\s*time\s*:/i, "").trim();
    }

    if (/end\s*time/i.test(line)) {
      end = line.replace(/.*end\s*time\s*:/i, "").trim();
    }
  });

  return { start, end };
}


/***********************
 * WEEK RANGE
 ***********************/
function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const format = x =>
    x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const weekNo = Math.ceil(
    (((start - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7
  );

  return {
    key: `W${weekNo}-${d.getFullYear()}`,
    label: `Week ${weekNo} (${format(start)} – ${format(end)})`
  };
}

const roiClass = r => r < 3 ? "roi-red" : r <= 5 ? "roi-orange" : "roi-green";

/***********************
 * COLLAPSIBLE SECTIONS
 ***********************/
function toggleSection(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

/***********************
 * DAILY REPORT
 ***********************/
function generateCampaign() {
  const file = document.getElementById("campaignFile").files[0];
  if (!file) return alert("Upload Campaign CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    const period = extractReportPeriod(rows);
    if (period.start || period.end) {
      document.getElementById("reportPeriod").innerHTML =
        `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const headerRow = autoDetectHeader(rows, ["Campaign Name", "Ad Spend"]);
    const headers = rows[headerRow];
    const data = rows.slice(headerRow + 1);
    const h = n => headers.indexOf(n);

    let totalSpend = 0, totalRevenue = 0, totalUnits = 0;
    const campaignMap = {};
    const dailyMap = {};

    data.forEach(r => {
      const campaign = r[h("Campaign Name")];
      const date = r[h("Date")];
      if (!campaign) return;

      const spend = +r[h("Ad Spend")] || 0;
      const revenue = +r[h("Total Revenue (Rs.)")] || 0;
      const units = +r[h("Total converted units")] || 0;

      totalSpend += spend;
      totalRevenue += revenue;
      totalUnits += units;

      if (!campaignMap[campaign]) campaignMap[campaign] = { s: 0, r: 0, u: 0 };
      campaignMap[campaign].s += spend;
      campaignMap[campaign].r += revenue;
      campaignMap[campaign].u += units;

      if (date) {
        if (!dailyMap[date]) dailyMap[date] = { s: 0, r: 0, u: 0 };
        dailyMap[date].s += spend;
        dailyMap[date].r += revenue;
        dailyMap[date].u += units;
      }
    });

    document.getElementById("campaignKpi").innerHTML = `
      <div class="kpi">Spend<br>₹${totalSpend.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${totalRevenue.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(totalRevenue / totalSpend).toFixed(2)}</div>
      <div class="kpi">Units<br>${totalUnits}</div>
    `;

    const tbody = document.querySelector("#campaignTable tbody");
    tbody.innerHTML = "";
    Object.entries(campaignMap)
      .sort((a, b) => b[1].s - a[1].s)
      .forEach(([name, v]) => {
        const roi = v.r / v.s;
        const status = roi < 3 ? "🔴 Loss" : roi <= 5 ? "🟠 Optimize" : "🟢 Scale";
        tbody.innerHTML += `
          <tr>
            <td>${name}</td>
            <td>${v.s.toFixed(0)}</td>
            <td>${v.r.toFixed(0)}</td>
            <td>${v.u}</td>
            <td>${roi.toFixed(2)}</td>
            <td>${status}</td>
          </tr>`;
      });

    const dailyBody = document.querySelector("#dailyTrendTable tbody");
    dailyBody.innerHTML = "";
    Object.keys(dailyMap).sort((a, b) => new Date(a) - new Date(b)).forEach(d => {
      const v = dailyMap[d];
      dailyBody.innerHTML += `
        <tr>
          <td>${d}</td>
          <td>${v.s.toFixed(0)}</td>
          <td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
          <td>${(v.r / v.s).toFixed(2)}</td>
        </tr>`;
    });

    const weeklyMap = {};
    Object.keys(dailyMap).forEach(d => {
      const wk = getWeekRange(d);
      if (!weeklyMap[wk.key]) weeklyMap[wk.key] = { label: wk.label, s: 0, r: 0, u: 0 };
      weeklyMap[wk.key].s += dailyMap[d].s;
      weeklyMap[wk.key].r += dailyMap[d].r;
      weeklyMap[wk.key].u += dailyMap[d].u;
    });

    const weeklyBody = document.querySelector("#weeklyTrendTable tbody");
    weeklyBody.innerHTML = "";
    Object.values(weeklyMap).forEach(v => {
      weeklyBody.innerHTML += `
        <tr>
          <td>${v.label}</td>
          <td>${v.s.toFixed(0)}</td>
          <td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
          <td>${(v.r / v.s).toFixed(2)}</td>
        </tr>`;
    });
  };

  reader.readAsText(file);
}

/***********************
 * PLACEMENT REPORT
 ***********************/
function generatePlacement() {
  const file = document.getElementById("placementFile").files[0];
  if (!file) return alert("Upload Placement CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    const period = extractReportPeriod(rows);
    if (period.start || period.end) {
      document.getElementById("reportPeriodPlacement").innerHTML =
        `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const headerRow = autoDetectHeader(rows, ["Placement Type", "Campaign Name", "Ad Spend"]);
    const headers = rows[headerRow];
    const data = rows.slice(headerRow + 1);
    const h = n => headers.indexOf(n);

    const overall = {};
    const campaignMap = {};

    data.forEach(r => {
      const campaign = r[h("Campaign Name")];
      const campaignId = r[h("Campaign ID")];
      const placement = r[h("Placement Type")];
      if (!campaign || !placement) return;

      const spend = +r[h("Ad Spend")] || 0;
      const units = (+r[h("Direct Units Sold")] || 0) + (+r[h("Indirect Units Sold")] || 0);
      const revenue = (+r[h("Direct Revenue")] || 0) + (+r[h("Indirect Revenue")] || 0);

      if (!overall[placement]) overall[placement] = { s: 0, r: 0, u: 0 };
      overall[placement].s += spend;
      overall[placement].r += revenue;
      overall[placement].u += units;

      if (!campaignMap[campaign]) campaignMap[campaign] = { id: campaignId, rows: {} };
      if (!campaignMap[campaign].rows[placement])
        campaignMap[campaign].rows[placement] = { s: 0, r: 0, u: 0 };

      campaignMap[campaign].rows[placement].s += spend;
      campaignMap[campaign].rows[placement].r += revenue;
      campaignMap[campaign].rows[placement].u += units;
    });

    const overallBody = document.querySelector("#placementOverallTable tbody");
    overallBody.innerHTML = "";
    Object.entries(overall).forEach(([p, v]) => {
      const roi = v.s ? v.r / v.s : 0;
      overallBody.innerHTML += `
        <tr class="${roiClass(roi)}">
          <td>${p}</td>
          <td>${v.s.toFixed(0)}</td>
          <td>${v.r.toFixed(0)}</td>
          <td>${v.u}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;
    });

    const tbody = document.querySelector("#placementCampaignTable tbody");
    tbody.innerHTML = "";
    let i = 0;

    Object.entries(campaignMap).forEach(([c, obj]) => {
      const gid = `grp-${i++}`;
      const totals = Object.values(obj.rows).reduce(
        (a, v) => ({ s: a.s + v.s, r: a.r + v.r, u: a.u + v.u }),
        { s: 0, r: 0, u: 0 }
      );

      tbody.innerHTML += `
        <tr class="campaign-group" data-group="${gid}">
          <td><span class="campaign-toggle">▶</span>${c} (${obj.id})</td>
          <td></td>
          <td>${totals.s.toFixed(0)}</td>
          <td>${totals.r.toFixed(0)}</td>
          <td>${totals.u}</td>
          <td>${(totals.r / totals.s).toFixed(2)}</td>
        </tr>`;

      Object.entries(obj.rows).forEach(([p, v]) => {
        const roi = v.s ? v.r / v.s : 0;
        tbody.innerHTML += `
          <tr class="hidden-row ${roiClass(roi)}" data-parent="${gid}">
            <td></td>
            <td>${p}</td>
            <td>${v.s.toFixed(0)}</td>
            <td>${v.r.toFixed(0)}</td>
            <td>${v.u}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>`;
      });
    });

    document.querySelectorAll(".campaign-group").forEach(row => {
      row.onclick = () => {
        const g = row.dataset.group;
        const rows = document.querySelectorAll(`[data-parent="${g}"]`);
        const icon = row.querySelector(".campaign-toggle");
        const collapsed = rows[0].classList.contains("hidden-row");
        rows.forEach(r => r.classList.toggle("hidden-row", !collapsed));
        icon.textContent = collapsed ? "▼" : "▶";
      };
    });
  };

  reader.readAsText(file);
}
function expandAllCampaigns() {
  document.querySelectorAll("[data-parent]").forEach(r => {
    r.classList.remove("hidden-row");
  });
  document.querySelectorAll(".campaign-toggle").forEach(i => {
    i.textContent = "▼";
  });
}

function collapseAllCampaigns() {
  document.querySelectorAll("[data-parent]").forEach(r => {
    r.classList.add("hidden-row");
  });
  document.querySelectorAll(".campaign-toggle").forEach(i => {
    i.textContent = "▶";
  });
}
