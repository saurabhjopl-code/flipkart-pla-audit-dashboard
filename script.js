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

/**************** HEADER + PERIOD ****************/
function autoDetectHeader(rows, required) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const found = required.filter(h => rows[i].includes(h)).length;
    if (found >= 2) return i;
  }
  throw new Error("Header not found");
}

function extractReportPeriod(rows) {
  let start = "", end = "";
  rows.slice(0, 5).forEach(r => {
    const line = r.join(" ").trim();
    if (/start\s*time/i.test(line)) start = line.replace(/.*start\s*time\s*:/i, "").trim();
    if (/end\s*time/i.test(line)) end = line.replace(/.*end\s*time\s*:/i, "").trim();
  });
  return { start, end };
}

const roiClass = r => r < 3 ? "roi-red" : r <= 5 ? "roi-orange" : "roi-green";

/**************** COLLAPSIBLES ****************/
function toggleSection(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

/**************** WEEK RANGE ****************/
function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const f = x => x.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return { key: `${start}`, label: `Week (${f(start)} – ${f(end)})` };
}

/**************** DAILY REPORT ****************/
function generateCampaign() {
  const file = campaignFile.files[0];
  if (!file) return alert("Upload Campaign CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    const period = extractReportPeriod(rows);
    if (period.start || period.end) {
      reportPeriod.innerHTML = `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow = autoDetectHeader(rows, ["Campaign Name", "Ad Spend"]);
    const headers = rows[hRow];
    const data = rows.slice(hRow + 1);
    const h = n => headers.indexOf(n);

    let S=0,R=0,U=0;
    const cmap={}, daily={};

    data.forEach(r=>{
      const c=r[h("Campaign Name")];
      const d=r[h("Date")];
      if(!c) return;
      const s=+r[h("Ad Spend")]||0;
      const rV=+r[h("Total Revenue (Rs.)")]||0;
      const u=+r[h("Total converted units")]||0;
      S+=s;R+=rV;U+=u;

      if(!cmap[c]) cmap[c]={s:0,r:0,u:0};
      cmap[c].s+=s; cmap[c].r+=rV; cmap[c].u+=u;

      if(d){
        if(!daily[d]) daily[d]={s:0,r:0,u:0};
        daily[d].s+=s; daily[d].r+=rV; daily[d].u+=u;
      }
    });

    campaignKpi.innerHTML = `
      <div class="kpi">Spend<br>₹${S.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${R.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(R/S).toFixed(2)}</div>
      <div class="kpi">Units<br>${U}</div>
    `;

    const tb=campaignTable.querySelector("tbody");
    tb.innerHTML="";
    Object.entries(cmap).sort((a,b)=>b[1].s-a[1].s).forEach(([c,v])=>{
      const roi=v.r/v.s;
      const st=roi<3?"🔴 Loss":roi<=5?"🟠 Optimize":"🟢 Scale";
      tb.innerHTML+=`
        <tr><td>${c}</td><td>${v.s.toFixed(0)}</td>
        <td>${v.r.toFixed(0)}</td><td>${v.u}</td>
        <td>${roi.toFixed(2)}</td><td>${st}</td></tr>`;
    });

    const dBody=dailyTrendTable.querySelector("tbody");
    dBody.innerHTML="";
    Object.keys(daily).sort((a,b)=>new Date(a)-new Date(b)).forEach(d=>{
      const v=daily[d];
      dBody.innerHTML+=`
        <tr><td>${d}</td><td>${v.s.toFixed(0)}</td>
        <td>${v.u}</td><td>${v.r.toFixed(0)}</td>
        <td>${(v.r/v.s).toFixed(2)}</td></tr>`;
    });

    const weekly={};
    Object.keys(daily).forEach(d=>{
      const wk=getWeekRange(d);
      if(!weekly[wk.key]) weekly[wk.key]={label:wk.label,s:0,r:0,u:0};
      weekly[wk.key].s+=daily[d].s;
      weekly[wk.key].r+=daily[d].r;
      weekly[wk.key].u+=daily[d].u;
    });

    const wBody=weeklyTrendTable.querySelector("tbody");
    wBody.innerHTML="";
    Object.values(weekly).forEach(v=>{
      wBody.innerHTML+=`
        <tr><td>${v.label}</td><td>${v.s.toFixed(0)}</td>
        <td>${v.u}</td><td>${v.r.toFixed(0)}</td>
        <td>${(v.r/v.s).toFixed(2)}</td></tr>`;
    });
  };
  reader.readAsText(file);
}

/**************** PLACEMENT REPORT ****************/
function generatePlacement() {
  const file = placementFile.files[0];
  if (!file) return alert("Upload Placement CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows=parseCSV(reader.result);
    const period=extractReportPeriod(rows);
    if(period.start||period.end){
      reportPeriodPlacement.innerHTML=`Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow=autoDetectHeader(rows,["Placement Type","Campaign Name","Ad Spend"]);
    const headers=rows[hRow];
    const data=rows.slice(hRow+1);
    const h=n=>headers.indexOf(n);

    const overall={}, cmap={};

    data.forEach(r=>{
      const c=r[h("Campaign Name")], id=r[h("Campaign ID")], p=r[h("Placement Type")];
      if(!c||!p) return;
      const s=+r[h("Ad Spend")]||0;
      const u=(+r[h("Direct Units Sold")]||0)+(+r[h("Indirect Units Sold")]||0);
      const rv=(+r[h("Direct Revenue")]||0)+(+r[h("Indirect Revenue")]||0);

      if(!overall[p]) overall[p]={s:0,r:0,u:0};
      overall[p].s+=s; overall[p].r+=rv; overall[p].u+=u;

      if(!cmap[c]) cmap[c]={id,rows:{}};
      if(!cmap[c].rows[p]) cmap[c].rows[p]={s:0,r:0,u:0};
      cmap[c].rows[p].s+=s; cmap[c].rows[p].r+=rv; cmap[c].rows[p].u+=u;
    });

    placementOverallTable.querySelector("tbody").innerHTML=
      Object.entries(overall).map(([p,v])=>{
        const roi=v.r/v.s;
        return `<tr class="${roiClass(roi)}">
          <td>${p}</td><td>${v.s.toFixed(0)}</td>
          <td>${v.r.toFixed(0)}</td><td>${v.u}</td>
          <td>${roi.toFixed(2)}</td></tr>`;
      }).join("");

    const tb=placementCampaignTable.querySelector("tbody");
    tb.innerHTML="";
    let i=0;
    Object.entries(cmap).forEach(([c,o])=>{
      const g=`grp-${i++}`;
      const t=Object.values(o.rows).reduce((a,v)=>({s:a.s+v.s,r:a.r+v.r,u:a.u+v.u}),{s:0,r:0,u:0});
      tb.innerHTML+=`
        <tr class="campaign-group" data-group="${g}">
          <td><span class="campaign-toggle">▶</span>${c} (${o.id})</td>
          <td></td><td>${t.s.toFixed(0)}</td>
          <td>${t.r.toFixed(0)}</td><td>${t.u}</td>
          <td>${(t.r/t.s).toFixed(2)}</td></tr>`;
      Object.entries(o.rows).forEach(([p,v])=>{
        const roi=v.r/v.s;
        tb.innerHTML+=`
          <tr class="hidden-row ${roiClass(roi)}" data-parent="${g}">
            <td></td><td>${p}</td><td>${v.s.toFixed(0)}</td>
            <td>${v.r.toFixed(0)}</td><td>${v.u}</td>
            <td>${roi.toFixed(2)}</td></tr>`;
      });
    });

    document.querySelectorAll(".campaign-group").forEach(r=>{
      r.onclick=()=>{
        const g=r.dataset.group;
        const rows=document.querySelectorAll(`[data-parent="${g}"]`);
        const ic=r.querySelector(".campaign-toggle");
        const c=rows[0].classList.contains("hidden-row");
        rows.forEach(x=>x.classList.toggle("hidden-row",!c));
        ic.textContent=c?"▼":"▶";
      };
    });
  };
  reader.readAsText(file);
}

function expandAllCampaigns(){
  document.querySelectorAll("[data-parent]").forEach(r=>r.classList.remove("hidden-row"));
}
function collapseAllCampaigns(){
  document.querySelectorAll("[data-parent]").forEach(r=>r.classList.add("hidden-row"));
}

/**************** TRAFFIC REPORT ****************/
function generateTraffic() {
  const file = trafficFile.files[0];
  if (!file) return alert("Upload Traffic CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows=parseCSV(reader.result);
    const period=extractReportPeriod(rows);
    if(period.start||period.end){
      trafficPeriod.innerHTML=`Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;
    }

    const hRow=autoDetectHeader(rows,["SKU Id","Impression Date"]);
    const headers=rows[hRow];
    const data=rows.slice(hRow+1);
    const h=n=>headers.indexOf(n);

    let I=0,C=0,R=0;
    const daily={}, sku={};

    data.forEach(r=>{
      const d=r[h("Impression Date")], s=r[h("SKU Id")], t=r[h("Product Title")];
      const i=+r[h("Impressions")]||0;
      const c=+r[h("Product Clicks")]||0;
      const rv=+r[h("Revenue")]||0;
      I+=i; C+=c; R+=rv;

      if(d){ if(!daily[d]) daily[d]={i:0,c:0,r:0};
        daily[d].i+=i; daily[d].c+=c; daily[d].r+=rv; }

      if(s){ if(!sku[s]) sku[s]={t,i:0,c:0,r:0};
        sku[s].i+=i; sku[s].c+=c; sku[s].r+=rv; }
    });

    trafficKpi.innerHTML=`
      <div class="kpi">Impressions<br>${I}</div>
      <div class="kpi">Clicks<br>${C}</div>
      <div class="kpi">Revenue<br>₹${R.toFixed(0)}</div>
      <div class="kpi">CVR<br>${(C?R/C:0).toFixed(2)}</div>
    `;

    trafficDailyTable.querySelector("tbody").innerHTML=
      Object.keys(daily).sort((a,b)=>new Date(a)-new Date(b))
      .map(d=>`<tr><td>${d}</td><td>${daily[d].i}</td>
      <td>${daily[d].c}</td><td>${daily[d].r.toFixed(0)}</td>
      <td>${(daily[d].c?daily[d].r/daily[d].c:0).toFixed(2)}</td></tr>`).join("");

    trafficSkuTable.querySelector("tbody").innerHTML=
      Object.entries(sku).map(([k,v])=>{
        const ctr=v.i?v.c/v.i:0, cvr=v.c?v.r/v.c:0;
        let st="🟢 Healthy";
        if(v.i>1000&&ctr<0.02) st="🔴 CTR Weak";
        else if(v.c>50&&cvr<0.05) st="🟠 Conversion Leak";
        return `<tr><td>${k}</td><td>${v.t||""}</td><td>${v.i}</td>
        <td>${v.c}</td><td>${v.r.toFixed(0)}</td>
        <td>${(ctr*100).toFixed(2)}%</td><td>${(cvr*100).toFixed(2)}%</td>
        <td>${st}</td></tr>`;
      }).join("");
  };
  reader.readAsText(file);

}
/*************************************************
 * CAMPAIGN ORDER REPORT (FULLY ISOLATED)
 * Does NOT interact with any other report
 *************************************************/

function generateCampaignOrderReport() {
  const file = document.getElementById("campaignOrderFile").files[0];
  if (!file) {
    alert("Upload Campaign Order Report CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    // Fixed header row (as per your file)
    const headers = rows[2];
    const data = rows.slice(3);

    const idx = {
      campaign: headers.indexOf("Campaign ID"),
      advFsn: headers.indexOf("Advertised FSN / FSN ID"),
      orderDate: headers.indexOf("Order Date"),
      direct: headers.indexOf("Direct Units Sold"),
      indirect: headers.indexOf("Indirect Units Sold"),
      revenue: headers.indexOf("Total Revenue (Rs.)")
    };

    // HARD FAIL if structure changes
    for (let k in idx) {
      if (idx[k] === -1) {
        alert("Campaign Order CSV structure mismatch. Header missing: " + k);
        return;
      }
    }

    const campaignMap = {};
    const fsnMap = {};
    const dateMap = {};

    data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      const fsn = r[idx.advFsn];
      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const rev = +r[idx.revenue] || 0;
      const date = r[idx.orderDate];

      /* Campaign */
      if (!campaignMap[c]) {
        campaignMap[c] = { o: 0, d: 0, i: 0, u: 0, r: 0 };
      }
      campaignMap[c].o++;
      campaignMap[c].d += du;
      campaignMap[c].i += iu;
      campaignMap[c].u += units;
      campaignMap[c].r += rev;

      /* Campaign → FSN */
      const cfKey = c + "||" + fsn;
      if (!fsnMap[cfKey]) {
        fsnMap[cfKey] = { c, fsn, o: 0, u: 0, r: 0 };
      }
      fsnMap[cfKey].o++;
      fsnMap[cfKey].u += units;
      fsnMap[cfKey].r += rev;

      /* Date */
      if (!dateMap[date]) {
        dateMap[date] = { o: 0, u: 0, r: 0 };
      }
      dateMap[date].o++;
      dateMap[date].u += units;
      dateMap[date].r += rev;
    });

    /* ===== Render Campaign Summary ===== */
    const campBody = document.querySelector("#corCampaignTable tbody");
    campBody.innerHTML = "";
    Object.entries(campaignMap)
      .sort((a, b) => b[1].r - a[1].r)
      .forEach(([c, v]) => {
        campBody.innerHTML += `
          <tr>
            <td>${c}</td>
            <td>${v.o}</td>
            <td>${v.d}</td>
            <td>${v.i}</td>
            <td>${v.u}</td>
            <td>${v.r.toFixed(0)}</td>
          </tr>`;
      });

    /* ===== Render Campaign → FSN ===== */
    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";
    Object.values(fsnMap).forEach(v => {
      fsnBody.innerHTML += `
        <tr>
          <td>${v.c} → ${v.fsn}</td>
          <td>${v.o}</td>
          <td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
        </tr>`;
    });

    /* ===== Render Date Trend ===== */
    const dateBody = document.querySelector("#corDateTable tbody");
    dateBody.innerHTML = "";
    Object.entries(dateMap)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([d, v]) => {
        dateBody.innerHTML += `
          <tr>
            <td>${d}</td>
            <td>${v.o}</td>
            <td>${v.u}</td>
            <td>${v.r.toFixed(0)}</td>
          </tr>`;
      });
  };

  reader.readAsText(file);
}
