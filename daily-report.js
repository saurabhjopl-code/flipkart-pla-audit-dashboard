/*************************************************
 * DAILY REPORT – FINAL STABLE VERSION
 *************************************************/

document.addEventListener("change", () => {
  const pla = document.getElementById("plaFile");
  const pca = document.getElementById("pcaFile");
  const fsn = document.getElementById("fsnFile");
  const btn = document.getElementById("generateDailyReport");

  if (!btn) return;

  const setStatus = (input, elId) => {
    const el = document.getElementById(elId);
    el.textContent = input.files.length ? "✓ " + input.files[0].name : "";
  };

  setStatus(pla, "plaStatus");
  setStatus(pca, "pcaStatus");
  setStatus(fsn, "fsnStatus");

  btn.disabled = !(pla.files.length || pca.files.length);
});

document.getElementById("generateDailyReport")
  ?.addEventListener("click", generateDailyReport);

function generateDailyReport() {
  const pla = document.getElementById("plaFile").files[0] || null;
  const pca = document.getElementById("pcaFile").files[0] || null;
  const fsn = document.getElementById("fsnFile").files[0] || null;

  Promise.all([
    pla ? readCsv(pla) : Promise.resolve(null),
    pca ? readCsv(pca) : Promise.resolve(null),
    fsn ? readCsv(fsn) : Promise.resolve(null)
  ]).then(([plaData, pcaData, fsnData]) => {
    buildCampaignTable(plaData, pcaData);
    buildDailyTrend(plaData, pcaData);
    buildWeeklyTrend(plaData, pcaData);
  });
}

function readCsv(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => {
      const rows = parseCSV(r.result);
      resolve({ h: rows[2], d: rows.slice(3) });
    };
    r.readAsText(file);
  });
}

function buildCampaignTable(pla, pca) {
  const tbody = document.querySelector("#campaignTable tbody");
  tbody.innerHTML = "";

  const map = {};
  [pla, pca].forEach(src => {
    if (!src) return;
    const h = src.h;
    const idx = {
      c: h.indexOf("Campaign Name"),
      s: h.indexOf("Spend (Rs.)"),
      r: h.indexOf("Total Revenue (Rs.)"),
      du: h.indexOf("Direct Units Sold"),
      iu: h.indexOf("Indirect Units Sold")
    };

    src.d.forEach(row => {
      const k = row[idx.c];
      if (!map[k]) map[k] = { s:0, r:0, u:0 };
      map[k].s += +row[idx.s] || 0;
      map[k].r += +row[idx.r] || 0;
      map[k].u += (+row[idx.du] || 0) + (+row[idx.iu] || 0);
    });
  });

  Object.entries(map).forEach(([k,v]) => {
    const roi = v.s ? v.r / v.s : 0;
    const status = roi >= 7 ? "🟢 Scale" : roi > 3 ? "🟠 Optimize" : "🔴 Loss";
    tbody.innerHTML += `
      <tr>
        <td>${k}</td>
        <td>${v.s.toFixed(0)}</td>
        <td>${v.r.toFixed(0)}</td>
        <td>${v.u}</td>
        <td>${roi.toFixed(2)}</td>
        <td>${status}</td>
      </tr>`;
  });
}

function buildDailyTrend(pla, pca) {
  const tbody = document.querySelector("#dailyTrendTable tbody");
  tbody.innerHTML = "";

  const map = {};
  [pla, pca].forEach(src => {
    if (!src) return;
    const h = src.h;
    const idx = {
      d: h.indexOf("Date"),
      s: h.indexOf("Spend (Rs.)"),
      r: h.indexOf("Total Revenue (Rs.)"),
      du: h.indexOf("Direct Units Sold"),
      iu: h.indexOf("Indirect Units Sold")
    };

    src.d.forEach(row => {
      const d = row[idx.d];
      if (!map[d]) map[d] = { s:0, r:0, u:0 };
      map[d].s += +row[idx.s] || 0;
      map[d].r += +row[idx.r] || 0;
      map[d].u += (+row[idx.du] || 0) + (+row[idx.iu] || 0);
    });
  });

  Object.entries(map).forEach(([d,v]) => {
    const roi = v.s ? v.r / v.s : 0;
    tbody.innerHTML += `
      <tr>
        <td>${d}</td>
        <td>${v.s.toFixed(0)}</td>
        <td>${v.u}</td>
        <td>${v.r.toFixed(0)}</td>
        <td>${roi.toFixed(2)}</td>
      </tr>`;
  });
}

function buildWeeklyTrend(pla, pca) {
  const tbody = document.querySelector("#weeklyTrendTable tbody");
  tbody.innerHTML = "";

  const map = {};
  [pla, pca].forEach(src => {
    if (!src) return;
    const h = src.h;
    const idx = {
      d: h.indexOf("Date"),
      s: h.indexOf("Spend (Rs.)"),
      r: h.indexOf("Total Revenue (Rs.)"),
      du: h.indexOf("Direct Units Sold"),
      iu: h.indexOf("Indirect Units Sold")
    };

    src.d.forEach(row => {
      const date = new Date(row[idx.d]);
      const week = date.getFullYear() + "-W" +
        Math.ceil((((date - new Date(date.getFullYear(),0,1)) / 86400000) + date.getDay()+1)/7);

      if (!map[week]) map[week] = { s:0, r:0, u:0 };
      map[week].s += +row[idx.s] || 0;
      map[week].r += +row[idx.r] || 0;
      map[week].u += (+row[idx.du] || 0) + (+row[idx.iu] || 0);
    });
  });

  Object.entries(map).forEach(([w,v]) => {
    const roi = v.s ? v.r / v.s : 0;
    tbody.innerHTML += `
      <tr>
        <td>${w}</td>
        <td>${v.s.toFixed(0)}</td>
        <td>${v.u}</td>
        <td>${v.r.toFixed(0)}</td>
        <td>${roi.toFixed(2)}</td>
      </tr>`;
  });
}
