/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", () => {

  /* ===== TAB SWITCH ===== */
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const target = btn.dataset.tab;
      document.getElementById(target).classList.add("active");
    });
  });

});

/* ================= CSV PARSER ================= */
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

const roiClass = r => r < 3 ? "roi-red" : r <= 5 ? "roi-orange" : "roi-green";

/* ================= DAILY REPORT ================= */
function generateCampaign() {
  const f = campaignFile.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = () => {
    const d = parseCSV(r.result);
    const h = n => d[0].indexOf(n);

    let S = 0, R = 0, U = 0, map = {};

    d.slice(1).forEach(x => {
      const c = x[h("Campaign Name")];
      if (!c) return;
      const s = +x[h("Ad Spend")] || 0;
      const r = +x[h("Total Revenue (Rs.)")] || 0;
      const u = +x[h("Total converted units")] || 0;

      S += s; R += r; U += u;
      if (!map[c]) map[c] = { s: 0, r: 0, u: 0 };
      map[c].s += s; map[c].r += r; map[c].u += u;
    });

    campaignKpi.innerHTML = `
      <div class="kpi"><div>Spend</div><div>₹${S.toFixed(0)}</div></div>
      <div class="kpi"><div>Revenue</div><div>₹${R.toFixed(0)}</div></div>
      <div class="kpi"><div>ROI</div><div>${(R / S).toFixed(2)}</div></div>
      <div class="kpi"><div>Units</div><div>${U}</div></div>
    `;

    const tb = campaignTable.querySelector("tbody");
    tb.innerHTML = "";

    Object.entries(map)
      .sort((a, b) => b[1].s - a[1].s)
      .forEach(([n, c]) => {
        const roi = c.r / c.s;
        const flag = roi < 3 ? "🔴 Loss" : roi <= 5 ? "🟠 Optimize" : "🟢 Scale";
        tb.innerHTML += `
          <tr>
            <td>${n}</td>
            <td>${c.s.toFixed(0)}</td>
            <td>${c.r.toFixed(0)}</td>
            <td>${c.u}</td>
            <td>${roi.toFixed(2)}</td>
            <td>${flag}</td>
          </tr>`;
      });
  };
  r.readAsText(f);
}

/* ================= PLACEMENT REPORT ================= */
function generatePlacement() {
  const f = placementFile.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = () => {
    const d = parseCSV(r.result);
    const h = n => d[0].indexOf(n);

    const overall = {}, pivot = {};

    d.slice(1).forEach(x => {
      const c = x[h("Campaign Name")];
      const id = x[h("Campaign ID")];
      const p = x[h("Placement Type")];
      if (!c || !p) return;

      const s = +x[h("Ad Spend")] || 0;
      const u = (+x[h("Direct Units Sold")] || 0) + (+x[h("Indirect Units Sold")] || 0);
      const r = (+x[h("Direct Revenue")] || 0) + (+x[h("Indirect Revenue")] || 0);

      if (!overall[p]) overall[p] = { s: 0, r: 0, u: 0 };
      overall[p].s += s; overall[p].r += r; overall[p].u += u;

      if (!pivot[c]) pivot[c] = { __id: id };
      if (!pivot[c][p]) pivot[c][p] = { s: 0, r: 0, u: 0 };
      pivot[c][p].s += s;
      pivot[c][p].r += r;
      pivot[c][p].u += u;
    });

    /* Overall table */
    placementOverallTable.querySelector("tbody").innerHTML =
      Object.entries(overall).map(([p, c]) => {
        const roi = c.r / c.s;
        return `
          <tr class="${roiClass(roi)}">
            <td>${p}</td>
            <td>${c.s.toFixed(0)}</td>
            <td>${c.r.toFixed(0)}</td>
            <td>${c.u}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>`;
      }).join("");

    /* Campaign-wise (collapsed by default via CSS) */
    const tb = placementCampaignTable.querySelector("tbody");
    tb.innerHTML = "";

    Object.keys(pivot).forEach((c, i) => {
      const g = `grp-${i}`;
      const e = Object.entries(pivot[c]).filter(x => x[0] !== "__id");
      const sum = e.reduce((a, [, v]) => {
        a.s += v.s; a.r += v.r; a.u += v.u; return a;
      }, { s: 0, r: 0, u: 0 });

      tb.innerHTML += `
        <tr class="campaign-group" data-group="${g}">
          <td><span class="campaign-toggle">▶</span>${c} (${pivot[c].__id})</td>
          <td></td>
          <td>${sum.s.toFixed(0)}</td>
          <td>${sum.r.toFixed(0)}</td>
          <td>${sum.u}</td>
          <td>${(sum.r / sum.s).toFixed(2)}</td>
        </tr>`;

      e.forEach(([p, v]) => {
        const roi = v.r / v.s;
        tb.innerHTML += `
          <tr class="hidden-row ${roiClass(roi)}" data-parent="${g}">
            <td></td>
            <td>${p}</td>
            <td>${v.s.toFixed(0)}</td>
            <td>${v.r.toFixed(0)}</td>
            <td>${v.u}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>`;
      });
    });

    /* Toggle */
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
  r.readAsText(f);
}

/* ================= SAFE CONTROLS ================= */
function expandAllCampaigns() {
  document.querySelectorAll(".hidden-row").forEach(r => r.classList.remove("hidden-row"));
  document.querySelectorAll(".campaign-toggle").forEach(i => i.textContent = "▼");
}

function collapseAllCampaigns() {
  document.querySelectorAll("[data-parent]").forEach(r => r.classList.add("hidden-row"));
  document.querySelectorAll(".campaign-toggle").forEach(i => i.textContent = "▶");
}
