/**************** TAB SWITCH ****************/
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    };
  });
});

/**************** CSV PARSER ****************/
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

/**************** PERIOD ****************/
function extractReportPeriod(rows) {
  let start = "", end = "";
  rows.slice(0, 5).forEach(r => {
    const line = r.join(" ").trim();
    if (/start\s*time/i.test(line)) start = line.replace(/.*:/, "").trim();
    if (/end\s*time/i.test(line)) end = line.replace(/.*:/, "").trim();
  });
  return { start, end };
}

/*************************************************
 * CAMPAIGN ORDER REPORT — FINAL
 *************************************************/
function generateCampaignOrder() {
  const file = orderFile.files[0];
  if (!file) return alert("Upload Campaign Order CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    const period = extractReportPeriod(rows);
    orderPeriod.innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    const headers = rows[2];
    const data = rows.slice(3);
    const h = n => headers.indexOf(n);

    const idx = {
      campaign: h("Campaign ID"),
      directUnits: h("Direct Units Sold"),
      indirectUnits: h("Indirect Units Sold"),
      revenue: h("Total Revenue (Rs.)")
    };

    const map = {};

    data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      if (!map[c]) map[c] = { o: 0, d: 0, i: 0, r: 0 };

      map[c].o++;
      map[c].d += +r[idx.directUnits] || 0;
      map[c].i += +r[idx.indirectUnits] || 0;
      map[c].r += +r[idx.revenue] || 0;
    });

    const tbody = orderCampaignTable.querySelector("tbody");
    tbody.innerHTML = "";

    Object.entries(map)
      .sort((a, b) => b[1].r - a[1].r)
      .forEach(([c, v]) => {
        const units = v.d + v.i;
        const assist = units ? (v.i / units) * 100 : 0;

        tbody.innerHTML += `
          <tr>
            <td>${c}</td>
            <td>${v.o}</td>
            <td>${v.d}</td>
            <td>${v.i}</td>
            <td>${units}</td>
            <td>${v.r.toFixed(0)}</td>
            <td>${assist.toFixed(1)}%</td>
          </tr>`;
      });
  };
  reader.readAsText(file);
}
