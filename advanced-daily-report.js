/*************************************************
 * ADVANCED DAILY REPORT (ISOLATED & SAFE)
 *************************************************/

document.addEventListener("change", () => {
  const pla = document.getElementById("adrPlaFile");
  const pca = document.getElementById("adrPcaFile");
  const fsn = document.getElementById("adrFsnFile");
  const btn = document.getElementById("adrGenerateBtn");

  if (!btn) return;

  const mark = (f, id) => {
    const el = document.getElementById(id);
    el.textContent = f.files.length ? "✓ " + f.files[0].name : "";
  };

  mark(pla, "adrPlaStatus");
  mark(pca, "adrPcaStatus");
  mark(fsn, "adrFsnStatus");

  btn.disabled = !(pla.files.length || pca.files.length);
});

document.getElementById("adrGenerateBtn")
  ?.addEventListener("click", generateAdvancedDaily);

function generateAdvancedDaily() {
  const pla = document.getElementById("adrPlaFile").files[0] || null;
  const pca = document.getElementById("adrPcaFile").files[0] || null;
  const fsn = document.getElementById("adrFsnFile").files[0] || null;

  Promise.all([
    pla ? readCsv(pla) : Promise.resolve(null),
    pca ? readCsv(pca) : Promise.resolve(null),
    fsn ? readCsv(fsn) : Promise.resolve(null)
  ]).then(([plaData, pcaData, fsnData]) => {
    buildCampaignReport(plaData, pcaData);
    buildAdsTypeReport(plaData, pcaData);
    buildCategoryReport(fsnData);
  });
}

function readCsv(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const rows = parseCSV(r.result);
      res({ h: rows[2], d: rows.slice(3) });
    };
    r.readAsText(file);
  });
}

/* ================= CAMPAIGN REPORT ================= */

function buildCampaignReport(pla, pca) {
  const tbody = document.querySelector("#adrCampaignTable tbody");
  tbody.innerHTML = "";

  if (!pla && !pca) {
    tbody.innerHTML = `<tr><td colspan="7">Data Not Provided</td></tr>`;
    return;
  }

  const map = {};
  [pla, pca].forEach(src => {
    if (!src) return;

    const h = src.h;
    const idx = {
      c: h.indexOf("Campaign Name"),
      v: h.indexOf("Views"),
      cl: h.indexOf("Clicks"),
      du: h.indexOf("Direct Units Sold"),
      iu: h.indexOf("Indirect Units Sold"),
      r: h.includes("Total Revenue (₹)") ? h.indexOf("Total Revenue (₹)") : h.indexOf("Total Revenue (Rs.)"),
      s: h.includes("Spend (₹)") ? h.indexOf("Spend (₹)") : h.indexOf("Spend (Rs.)")
    };

    src.d.forEach(r => {
      const k = r[idx.c];
      if (!map[k]) map[k] = { v:0, cl:0, u:0, r:0, s:0 };
      map[k].v += +r[idx.v] || 0;
      map[k].cl += +r[idx.cl] || 0;
      map[k].u += (+r[idx.du] || 0) + (+r[idx.iu] || 0);
      map[k].r += +r[idx.r] || 0;
      map[k].s += +r[idx.s] || 0;
    });
  });

  Object.entries(map)
    .sort((a,b)=>(b[1].r/b[1].s)-(a[1].r/a[1].s))
    .forEach(([k,v])=>{
      const roi = v.s ? v.r/v.s : 0;
      const audit = roi>=7?"🟢 Scale":roi>3?"🟠 Optimize":"🔴 Loss";
      tbody.innerHTML += `
        <tr>
          <td>${k}</td>
          <td>${v.v}</td>
          <td>${v.cl}</td>
          <td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
          <td>${roi.toFixed(2)}</td>
          <td>${audit}</td>
        </tr>`;
    });
}

/* ================= CATEGORY REPORT ================= */

function buildCategoryReport(fsn) {
  const tbody = document.querySelector("#adrCategoryTable tbody");
  tbody.innerHTML = "";

  if (!fsn) {
    tbody.innerHTML = `<tr><td colspan="6">Data Not Provided</td></tr>`;
    return;
  }

  const h = fsn.h;
  const idx = {
    c: h.indexOf("AdGroup Name"),
    v: h.indexOf("Views"),
    cl: h.indexOf("Clicks"),
    du: h.indexOf("Direct Units Sold"),
    iu: h.indexOf("Indirect Units Sold"),
    r: h.includes("Total Revenue (₹)") ? h.indexOf("Total Revenue (₹)") : h.indexOf("Total Revenue (Rs.)"),
    s: h.includes("Spend (₹)") ? h.indexOf("Spend (₹)") : h.indexOf("Spend (Rs.)")
  };

  const map = {};
  fsn.d.forEach(r=>{
    const k=r[idx.c];
    if(!map[k])map[k]={v:0,cl:0,u:0,r:0,s:0};
    map[k].v+=+r[idx.v]||0;
    map[k].cl+=+r[idx.cl]||0;
    map[k].u+=(+r[idx.du]||0)+(+r[idx.iu]||0);
    map[k].r+=+r[idx.r]||0;
    map[k].s+=+r[idx.s]||0;
  });

  Object.keys(map).sort().forEach(k=>{
    const v=map[k];
    const roi=v.s?v.r/v.s:0;
    tbody.innerHTML+=`
      <tr>
        <td>${k}</td>
        <td>${v.v}</td>
        <td>${v.cl}</td>
        <td>${v.u}</td>
        <td>${v.r.toFixed(0)}</td>
        <td>${roi.toFixed(2)}</td>
      </tr>`;
  });
}

/* ================= ADS TYPE REPORT ================= */

function buildAdsTypeReport(pla, pca) {
  const tbody = document.querySelector("#adrAdsTypeTable tbody");
  tbody.innerHTML = "";

  const rows = [];
  if (pla) rows.push(["PLA", pla]);
  if (pca) rows.push(["PCA", pca]);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7">Data Not Provided</td></tr>`;
    return;
  }

  rows.forEach(([type,src])=>{
    const h=src.h;
    const idx={
      v:h.indexOf("Views"),
      cl:h.indexOf("Clicks"),
      du:h.indexOf("Direct Units Sold"),
      iu:h.indexOf("Indirect Units Sold"),
      r:h.includes("Total Revenue (₹)")?h.indexOf("Total Revenue (₹)"):h.indexOf("Total Revenue (Rs.)"),
      s:h.includes("Spend (₹)")?h.indexOf("Spend (₹)"):h.indexOf("Spend (Rs.)")
    };

    let v=0,cl=0,u=0,r=0,s=0;
    src.d.forEach(x=>{
      v+=+x[idx.v]||0;
      cl+=+x[idx.cl]||0;
      u+=(+x[idx.du]||0)+(+x[idx.iu]||0);
      r+=+x[idx.r]||0;
      s+=+x[idx.s]||0;
    });

    const roi=s?r/s:0;
    tbody.innerHTML+=`
      <tr>
        <td>${type}</td>
        <td>${v}</td>
        <td>${cl}</td>
        <td>${s.toFixed(0)}</td>
        <td>${u}</td>
        <td>${r.toFixed(0)}</td>
        <td>${roi.toFixed(2)}</td>
      </tr>`;
  });
}
