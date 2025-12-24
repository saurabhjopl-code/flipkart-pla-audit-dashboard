/* ================= TAB SWITCH ================= */
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

/* ================= AUTO HEADER ================= */
function autoDetectHeader(rows, required) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const found = required.filter(h => rows[i].includes(h)).length;
    if (found >= 2) return i;
  }
  throw new Error("Placement CSV header not found");
}

const roiClass = r => r < 3 ? "roi-red" : r <= 5 ? "roi-orange" : "roi-green";

/* ================= PLACEMENT REPORT (FINAL) ================= */
function generatePlacement() {
  const fileInput = document.getElementById("placementFile");
  if (!fileInput || !fileInput.files.length) {
    alert("Please upload Placement Performance CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCSV(reader.result);

      const headerRow = autoDetectHeader(rows, [
        "Campaign Name",
        "Placement Type",
        "Ad Spend"
      ]);

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
        const units =
          (+r[h("Direct Units Sold")] || 0) +
          (+r[h("Indirect Units Sold")] || 0);
        const revenue =
          (+r[h("Direct Revenue")] || 0) +
          (+r[h("Indirect Revenue")] || 0);

        /* Overall */
        if (!overall[placement]) overall[placement] = { s: 0, r: 0, u: 0 };
        overall[placement].s += spend;
        overall[placement].r += revenue;
        overall[placement].u += units;

        /* Campaign-wise */
        if (!campaignMap[campaign]) campaignMap[campaign] = { id: campaignId, rows: {} };
        if (!campaignMap[campaign].rows[placement])
          campaignMap[campaign].rows[placement] = { s: 0, r: 0, u: 0 };

        campaignMap[campaign].rows[placement].s += spend;
        campaignMap[campaign].rows[placement].r += revenue;
        campaignMap[campaign].rows[placement].u += units;
      });

      /* ================= Overall Table ================= */
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

      /* ================= Campaign-wise ================= */
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
            <td><span class="campaign-toggle">▶</span> ${c} (${obj.id})</td>
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

      /* ================= Toggle ================= */
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

    } catch (e) {
      console.error(e);
      alert("Placement report failed. Check console for details.");
    }
  };

  reader.readAsText(fileInput.files[0]);
}
