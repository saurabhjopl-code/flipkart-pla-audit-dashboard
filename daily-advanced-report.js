/*************************************************
 * DAILY REPORT – ADS DEEP DIVE (PLA + PCA)
 * SAFE EXTENSION – DOES NOT TOUCH CORE LOGIC
 *************************************************/

/* ========= Upload UX ========= */

document.addEventListener("change", () => {
  const pla = document.getElementById("plaFile");
  const pca = document.getElementById("pcaFile");
  const fsn = document.getElementById("fsnFile");
  const btn = document.getElementById("generateDailyAdvanced");

  if (!btn) return;

  const setStatus = (input, id) => {
    const el = document.getElementById(id);
    if (input && input.files.length) {
      el.textContent = "✓ " + input.files[0].name;
    } else {
      el.textContent = "";
    }
  };

  setStatus(pla, "plaStatus");
  setStatus(pca, "pcaStatus");
  setStatus(fsn, "fsnStatus");

  btn.disabled = !(pla.files.length || pca.files.length);
});

/* ========= Generate ========= */

document.getElementById("generateDailyAdvanced")
  ?.addEventListener("click", generateDailyAdvanced);

function generateDailyAdvanced() {
  const plaFile = document.getElementById("plaFile").files[0] || null;
  const pcaFile = document.getElementById("pcaFile").files[0] || null;

  Promise.all([
    plaFile ? readCsv(plaFile) : Promise.resolve(null),
    pcaFile ? readCsv(pcaFile) : Promise.resolve(null)
  ]).then(([pla, pca]) => {
    buildCampaignPerformance(pla, pca);
  });
}

/* ========= CSV Reader ========= */

function readCsv(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result);
      resolve({
        headers: rows[2],
        data: rows.slice(3)
      });
    };
    reader.readAsText(file);
  });
}

/* ========= Core Logic ========= */

function buildCampaignPerformance(pla, pca) {
  const tbody = document.querySelector("#dailyAdsCampaignTable tbody");
  tbody.innerHTML = "";

  const map = {};

  [pla, pca].forEach(src => {
    if (!src) return;

    const h = src.headers;

    const idx = {
      campaign: h.indexOf("Campaign Name"),
      views: h.indexOf("Views"),
      clicks: h.indexOf("Clicks"),
      du: h.indexOf("Direct Units Sold"),
      iu: h.indexOf("Indirect Units Sold"),
      revenue:
        h.indexOf("Total Revenue (₹)") !== -1
          ? h.indexOf("Total Revenue (₹)")
          : h.indexOf("Total Revenue (Rs.)"),
      spend:
        h.indexOf("Spend (₹)") !== -1
          ? h.indexOf("Spend (₹)")
          : h.indexOf("Spend (Rs.)")
    };

    src.data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      if (!map[c]) {
        map[c] = { v:0, cl:0, u:0, r:0, s:0 };
      }

      map[c].v += +r[idx.views] || 0;
      map[c].cl += +r[idx.clicks] || 0;
      map[c].u += (+r[idx.du] || 0) + (+r[idx.iu] || 0);
      map[c].r += +r[idx.revenue] || 0;
      map[c].s += +r[idx.spend] || 0;
    });
  });

  Object.entries(map)
    .sort((a,b)=>((b[1].r/b[1].s)||0)-((a[1].r/a[1].s)||0))
    .forEach(([c,v]) => {
      const roi = v.s ? v.r / v.s : 0;

      const status =
        roi >= 7 ? "🟢 Scale" :
        roi > 3 ? "🟠 Optimize" :
        "🔴 Loss";

      tbody.innerHTML += `
        <tr>
          <td>${c}</td>
          <td>${v.v}</td>
          <td>${v.cl}</td>
          <td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${status}</td>
        </tr>`;
    });
}
