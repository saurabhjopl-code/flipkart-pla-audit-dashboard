/*************************************************
 * DAILY REPORT – FULL IMPLEMENTATION
 * Scope: Daily Report tab ONLY
 *************************************************/

document.getElementById("generateDailyReport")
  ?.addEventListener("click", generateDailyReport);

function generateDailyReport() {
  
  if (!plaFile && !pcaFile && !fsnFile) {
    alert("Please upload at least one file");
    return;
  }

  Promise.all([
    plaFile ? readCsv(plaFile) : Promise.resolve(null),
    pcaFile ? readCsv(pcaFile) : Promise.resolve(null),
    fsnFile ? readCsv(fsnFile) : Promise.resolve(null)
  ]).then(([pla, pca, fsn]) => {
    buildCampaignReport(pla, pca);
    buildAdsTypeReport(pla, pca);
    buildDateWiseReport("PLA", pla);
    buildDateWiseReport("PCA", pca);
    buildDailyPerformance(pla, pca);
    buildWeeklyPerformance(pla, pca);
    buildCategoryReport(fsn);
  });
}

/* ================= HELPERS ================= */

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

function sum(row, idx) {
  return +row[idx] || 0;
}

function calcROI(revenue, spend) {
  return spend === 0 ? 0 : revenue / spend;
}

function auditRemark(roi) {
  if (roi >= 7) return "🟢 Scale";
  if (roi > 3) return "🟠 Optimize";
  return "🔴 Loss";
}

/* ================= 1. CAMPAIGN REPORT ================= */

function buildCampaignReport(pla, pca) {
  const tbody = document.querySelector("#dailyCampaignTable tbody");
  tbody.innerHTML = "";

  const map = {};

  [pla, pca].forEach(src => {
    if (!src) return;
    const h = src.headers;
    const d = src.data;

    const idx = {
      campaign: h.indexOf("Campaign Name"),
      views: h.indexOf("Views"),
      clicks: h.indexOf("Clicks"),
      du: h.indexOf("Direct Units Sold"),
      iu: h.indexOf("Indirect Units Sold"),
      rev: h.indexOf("Total Revenue (Rs.)"),
      spend: h.indexOf("Spend (Rs.)")
    };

    d.forEach(r => {
      const c = r[idx.campaign];
      if (!map[c]) map[c] = {v:0,c:0,u:0,r:0,s:0};

      map[c].v += sum(r, idx.views);
      map[c].c += sum(r, idx.clicks);
      map[c].u += sum(r, idx.du) + sum(r, idx.iu);
      map[c].r += sum(r, idx.rev);
      map[c].s += sum(r, idx.spend);
    });
  });

  Object.entries(map)
    .map(([c,v]) => ({
      c,
      ...v,
      roi: calcROI(v.r, v.s)
    }))
    .sort((a,b)=>b.roi-a.roi)
    .forEach(x=>{
      tbody.innerHTML += `
        <tr>
          <td>${x.c}</td>
          <td>${x.v}</td>
          <td>${x.c}</td>
          <td>${x.u}</td>
          <td>${x.r.toFixed(0)}</td>
          <td>${x.roi.toFixed(2)}</td>
          <td>${auditRemark(x.roi)}</td>
        </tr>`;
    });
}

/* ================= 2. CATEGORY REPORT ================= */

function buildCategoryReport(fsn) {
  const tbody = document.querySelector("#dailyCategoryTable tbody");
  tbody.innerHTML = "";

  if (!fsn) {
    tbody.innerHTML = `<tr><td colspan="6">Data Not Provided</td></tr>`;
    return;
  }

  const h = fsn.headers;
  const d = fsn.data;

  const idx = {
    cat: h.indexOf("AdGroup Name"),
    views: h.indexOf("Views"),
    clicks: h.indexOf("Clicks"),
    du: h.indexOf("Direct Units Sold"),
    iu: h.indexOf("Indirect Units Sold"),
    rev: h.indexOf("Total Revenue (Rs.)"),
    spend: h.indexOf("Spend (Rs.)")
  };

  const map = {};

  d.forEach(r=>{
    const c = r[idx.cat];
    if (!map[c]) map[c]={v:0,c:0,u:0,r:0,s:0};

    map[c].v+=sum(r,idx.views);
    map[c].c+=sum(r,idx.clicks);
    map[c].u+=sum(r,idx.du)+sum(r,idx.iu);
    map[c].r+=sum(r,idx.rev);
    map[c].s+=sum(r,idx.spend);
  });

  Object.keys(map).sort().forEach(c=>{
    const v = map[c];
    const roi = calcROI(v.r, v.s);
    tbody.innerHTML += `
      <tr>
        <td>${c}</td>
        <td>${v.v}</td>
        <td>${v.c}</td>
        <td>${v.u}</td>
        <td>${v.r.toFixed(0)}</td>
        <td>${roi.toFixed(2)}</td>
      </tr>`;
  });
}

/* ================= 3–7: DATE / DAILY / WEEKLY ================= */

function buildDateWiseReport(type, src) {
  if (!src) return;
  const tbody = document.querySelector(`#${type.toLowerCase()}DateTable tbody`);
  tbody.innerHTML = "";

  const h = src.headers;
  const idx = {
    date: h.indexOf("Date"),
    views: h.indexOf("Views"),
    clicks: h.indexOf("Clicks"),
    spend: h.indexOf("Spend (Rs.)"),
    du: h.indexOf("Direct Units Sold"),
    iu: h.indexOf("Indirect Units Sold"),
    rev: h.indexOf("Total Revenue (Rs.)")
  };

  src.data.forEach(r=>{
    const units = sum(r,idx.du)+sum(r,idx.iu);
    const roi = calcROI(sum(r,idx.rev), sum(r,idx.spend));
    tbody.innerHTML += `
      <tr>
        <td>${r[idx.date]}</td>
        <td>${sum(r,idx.views)}</td>
        <td>${sum(r,idx.clicks)}</td>
        <td>${sum(r,idx.spend)}</td>
        <td>${units}</td>
        <td>${sum(r,idx.rev)}</td>
        <td>${roi.toFixed(2)}</td>
      </tr>`;
  });
}

const plaInput = document.getElementById("plaFile");
const pcaInput = document.getElementById("pcaFile");
const fsnInput = document.getElementById("fsnFile");
const generateBtn = document.getElementById("generateDailyReport");

function updateStatus(input, statusEl) {
  if (input.files.length) {
    statusEl.textContent = "✓ " + input.files[0].name;
    statusEl.classList.remove("error");
  } else {
    statusEl.textContent = "";
  }
}

function validateGenerateButton() {
  // Enable if at least one ads file (PLA or PCA) is uploaded
  generateBtn.disabled = !(plaInput.files.length || pcaInput.files.length);
}

plaInput.addEventListener("change", () => {
  updateStatus(plaInput, document.getElementById("plaStatus"));
  validateGenerateButton();
});

pcaInput.addEventListener("change", () => {
  updateStatus(pcaInput, document.getElementById("pcaStatus"));
  validateGenerateButton();
});

fsnInput.addEventListener("change", () => {
  updateStatus(fsnInput, document.getElementById("fsnStatus"));
});


document.addEventListener("DOMContentLoaded", () => {
  const plaInput = document.getElementById("plaFile");
  const pcaInput = document.getElementById("pcaFile");
  const fsnInput = document.getElementById("fsnFile");
  const generateBtn = document.getElementById("generateDailyReport");

  if (!generateBtn) return;

  function updateStatus(input, statusEl) {
    if (input && input.files && input.files.length) {
      statusEl.textContent = "✓ " + input.files[0].name;
      statusEl.classList.remove("error");
    } else if (statusEl) {
      statusEl.textContent = "";
    }
  }

  function validateGenerateButton() {
    generateBtn.disabled = !(
      (plaInput && plaInput.files.length) ||
      (pcaInput && pcaInput.files.length)
    );
  }

  plaInput?.addEventListener("change", () => {
    updateStatus(plaInput, document.getElementById("plaStatus"));
    validateGenerateButton();
  });

  pcaInput?.addEventListener("change", () => {
    updateStatus(pcaInput, document.getElementById("pcaStatus"));
    validateGenerateButton();
  });

  fsnInput?.addEventListener("change", () => {
    updateStatus(fsnInput, document.getElementById("fsnStatus"));
  });
});
