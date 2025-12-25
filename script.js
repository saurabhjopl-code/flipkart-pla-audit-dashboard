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
document.getElementById("campaignFile")
  ?.addEventListener("change", () => {});

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

  /* -------- Period -------- */
  const period = extractReportPeriod(rows);
  orderPeriod.innerHTML =
    `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

  const headers = rows[2];
  const data = rows.slice(3);
  const h = n => headers.indexOf(n);

  const idx = {
    campaign: h("Campaign ID"),
    adgroup: h("AdGroup Name"),
    product: h("Product Name"),
    fsn: h("Advertised FSN / FSN ID"),
    date: h("Order Date"),
    direct: h("Direct Units Sold"),
    indirect: h("Indirect Units Sold"),
    revenue: h("Total Revenue (Rs.)")
  };

  const campMap = {}, adgMap = {}, prodMap = {}, dateMap = {};

  data.forEach(r => {
    const c = r[idx.campaign];
    if (!c) return;

    const ag = r[idx.adgroup] || "Unknown";
    const p = r[idx.product] || "Unknown";
    const f = r[idx.fsn] || "-";
    const d = r[idx.date];
    const du = +r[idx.direct] || 0;
    const iu = +r[idx.indirect] || 0;
    const rev = +r[idx.revenue] || 0;
    const units = du + iu;

    /* Campaign summary */
    if (!campMap[c]) campMap[c] = { o:0,d:0,i:0,r:0 };
    campMap[c].o++; campMap[c].d+=du; campMap[c].i+=iu; campMap[c].r+=rev;

    /* AdGroup */
    if (!adgMap[c]) adgMap[c] = {};
    if (!adgMap[c][ag]) adgMap[c][ag] = { o:0,u:0,r:0 };
    adgMap[c][ag].o++; adgMap[c][ag].u+=units; adgMap[c][ag].r+=rev;

    /* Product */
    const key = p+"||"+f;
    if (!prodMap[key]) prodMap[key] = { p,f,camps:new Set(),o:0,u:0,r:0 };
    prodMap[key].camps.add(c);
    prodMap[key].o++; prodMap[key].u+=units; prodMap[key].r+=rev;

    /* Date */
    if (d) {
      if (!dateMap[d]) dateMap[d] = { o:0,u:0,r:0 };
      dateMap[d].o++; dateMap[d].u+=units; dateMap[d].r+=rev;
    }
  });

  /* ================= SUMMARY ================= */
  const sumBody = orderCampaignTable.querySelector("tbody");
  sumBody.innerHTML = "";
  Object.entries(campMap)
    .sort((a,b)=>b[1].r-a[1].r)
    .forEach(([c,v])=>{
      const assist = v.d+v.i ? (v.i/(v.d+v.i))*100 : 0;
      sumBody.innerHTML += `
        <tr>
          <td>${c}</td><td>${v.o}</td>
          <td>${v.d}</td><td>${v.i}</td>
          <td>${v.d+v.i}</td>
          <td>${v.r.toFixed(0)}</td>
          <td>${assist.toFixed(1)}%</td>
        </tr>`;
    });

  /* ================= CAMPAIGN → ADGROUP ================= */
  const agBody = orderAdgroupTable.querySelector("tbody");
  agBody.innerHTML = "";
  let i=0;
  Object.entries(adgMap).forEach(([c,ags])=>{
    const gid="oadg"+(i++);
    const total = Object.values(ags)
      .reduce((a,v)=>({o:a.o+v.o,u:a.u+v.u,r:a.r+v.r}),{o:0,u:0,r:0});
    agBody.innerHTML += `
      <tr class="campaign-group" data-group="${gid}">
        <td><span class="campaign-toggle">▶</span>${c}</td>
        <td>${total.o}</td><td></td><td></td>
        <td>${total.u}</td><td>${total.r.toFixed(0)}</td>
      </tr>`;
    Object.entries(ags).forEach(([ag,v])=>{
      agBody.innerHTML += `
        <tr class="hidden-row" data-parent="${gid}">
          <td>${ag}</td><td>${v.o}</td><td></td><td></td>
          <td>${v.u}</td><td>${v.r.toFixed(0)}</td>
        </tr>`;
    });
  });

  document.querySelectorAll("#orderAdgroupTable .campaign-group")
    .forEach(r=>{
      r.onclick=()=>{
        const g=r.dataset.group;
        document.querySelectorAll(`[data-parent="${g}"]`)
          .forEach(x=>x.classList.toggle("hidden-row"));
        r.querySelector(".campaign-toggle").textContent =
          r.querySelector(".campaign-toggle").textContent==="▶"?"▼":"▶";
      };
    });

  /* ================= PRODUCT / FSN ================= */
  const pBody = orderProductTable.querySelector("tbody");
  pBody.innerHTML = "";
  Object.values(prodMap)
    .sort((a,b)=>b.r-a.r)
    .forEach(v=>{
      pBody.innerHTML += `
        <tr>
          <td>${v.p}</td><td>${v.f}</td>
          <td>${v.camps.size}</td>
          <td>${v.o}</td><td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
        </tr>`;
    });

  /* ================= DATE TREND ================= */
  const dBody = orderDateTable.querySelector("tbody");
  dBody.innerHTML = "";
  Object.keys(dateMap).sort((a,b)=>new Date(a)-new Date(b))
    .forEach(d=>{
      const v=dateMap[d];
      dBody.innerHTML += `
        <tr>
          <td>${d}</td><td>${v.o}</td>
          <td>${v.u}</td><td>${v.r.toFixed(0)}</td>
        </tr>`;
    });
};
;
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

function generateCampaignOrder() {
  const file = document.getElementById("orderFile").files[0];
  if (!file) return alert("Upload Campaign Order CSV");

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    /* ===== Header Detection ===== */
    const hRow = autoDetectHeader(rows, ["Campaign", "FSN", "Order"]);
    const headers = rows[hRow].map(h =>
      h.toLowerCase().replace(/\s+/g, "").replace(/[()₹]/g, "")
    );
    const data = rows.slice(hRow + 1);
    const col = k => headers.findIndex(h => h.includes(k));

    const idx = {
      campaign: col("campaign"),
      advFsn: col("advertisedfsn"),
      purFsn: col("purchasedfsn"),
      direct: col("directunit"),
      indirect: col("indirectunit"),
      revenue: col("revenue"),
      date: col("orderdate")
    };

    /* ===== Period ===== */
    const period = extractReportPeriod(rows);
    orderPeriod.innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    const campMap = {};
    const fsnMap = {};
    const dateMap = {};

    data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      const adv = r[idx.advFsn] || "Unknown FSN";
      const pur = idx.purFsn !== -1 ? r[idx.purFsn] : "-";
      const du = idx.direct !== -1 ? +r[idx.direct] || 0 : 0;
      const iu = idx.indirect !== -1 ? +r[idx.indirect] || 0 : 0;
      const units = du + iu || 1;
      const rev = idx.revenue !== -1 ? +r[idx.revenue] || 0 : 0;
      const d = idx.date !== -1 ? r[idx.date] : "";

      /* Campaign Summary */
      if (!campMap[c]) campMap[c] = { o:0,d:0,i:0,u:0,r:0, fsns:{} };
      campMap[c].o++;
      campMap[c].d += du;
      campMap[c].i += iu;
      campMap[c].u += units;
      campMap[c].r += rev;

      if (!campMap[c].fsns[adv])
        campMap[c].fsns[adv] = { o:0,u:0,r:0 };

      campMap[c].fsns[adv].o++;
      campMap[c].fsns[adv].u += units;
      campMap[c].fsns[adv].r += rev;

      /* FSN Contribution */
      if (!fsnMap[adv])
        fsnMap[adv] = { adv, pur, o:0,u:0,r:0 };
      fsnMap[adv].o++;
      fsnMap[adv].u += units;
      fsnMap[adv].r += rev;

      /* Date Trend */
      if (d) {
        if (!dateMap[d]) dateMap[d] = { o:0,u:0,r:0 };
        dateMap[d].o++;
        dateMap[d].u += units;
        dateMap[d].r += rev;
      }
    });

    /* ===== Campaign → FSN Drilldown ===== */
    const agBody = orderAdgroupTable.querySelector("tbody");
    agBody.innerHTML = "";
    let g = 0;

    Object.entries(campMap).forEach(([c,v]) => {
      const gid = "grp"+(g++);
      agBody.innerHTML += `
        <tr class="order-parent" data-group="${gid}">
          <td><b>${c}</b></td>
          <td>${v.o}</td>
          <td>${v.d}</td>
          <td>${v.i}</td>
          <td>${v.u}</td>
          <td>${v.r.toFixed(0)}</td>
        </tr>`;

      Object.entries(v.fsns).forEach(([f,x]) => {
        agBody.innerHTML += `
          <tr class="order-child-row" data-parent="${gid}">
            <td style="padding-left:20px">${f}</td>
            <td>${x.o}</td>
            <td></td>
            <td></td>
            <td>${x.u}</td>
            <td>${x.r.toFixed(0)}</td>
          </tr>`;
      });
    });

    /* ===== Product / FSN Contribution ===== */
    const pBody = orderProductTable.querySelector("tbody");
    pBody.innerHTML = "";
    Object.values(fsnMap)
      .sort((a,b)=>b.r-a.r)
      .forEach(v => {
        pBody.innerHTML += `
          <tr>
            <td>${v.adv}</td>
            <td>${v.pur}</td>
            <td>${v.o}</td>
            <td>${v.u}</td>
            <td>${v.r.toFixed(0)}</td>
          </tr>`;
      });

    /* ===== Order Date Trend ===== */
    const dBody = orderDateTable.querySelector("tbody");
    dBody.innerHTML = "";
    Object.keys(dateMap)
      .sort((a,b)=>new Date(a)-new Date(b))
      .forEach(d => {
        const v = dateMap[d];
        dBody.innerHTML += `
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


function expandAllOrderAdgroups(){
  document.querySelectorAll("#orderAdgroupTable .hidden-row")
    .forEach(r=>r.classList.remove("hidden-row"));
}
function collapseAllOrderAdgroups(){
  document.querySelectorAll("#orderAdgroupTable .hidden-row")
    .forEach(r=>r.classList.add("hidden-row"));
}






