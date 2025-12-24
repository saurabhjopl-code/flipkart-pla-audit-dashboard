/* TAB SWITCH */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* CSV PARSER */
function parseCSV(text) {
  const rows = [];
  let row = [], current = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '"' && inQuotes && n === '"') { current += '"'; i++; }
    else if (c === '"') inQuotes = !inQuotes;
    else if (c === "," && !inQuotes) { row.push(current.trim()); current = ""; }
    else if (c === "\n" && !inQuotes) { row.push(current.trim()); rows.push(row); row = []; current = ""; }
    else current += c;
  }
  row.push(current.trim());
  rows.push(row);
  return rows;
}

const roiClass = roi => roi < 3 ? "roi-red" : roi <= 5 ? "roi-orange" : "roi-green";

/* DAILY REPORT (LOGIC LOCKED) */
function generateCampaign() {
  const file = campaignFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const d = parseCSV(reader.result);
    const h = n => d[0].indexOf(n);
    let spend=0,revenue=0,units=0,map={};

    d.slice(1).forEach(r=>{
      const n=r[h("Campaign Name")];
      if(!n) return;
      const s=+r[h("Ad Spend")]||0;
      const rev=+r[h("Total Revenue (Rs.)")]||0;
      const u=+r[h("Total converted units")]||0;
      spend+=s; revenue+=rev; units+=u;
      if(!map[n]) map[n]={spend:0,revenue:0,units:0};
      map[n].spend+=s; map[n].revenue+=rev; map[n].units+=u;
    });

    campaignKpi.innerHTML=`
      <div class="kpi">Spend<br>₹${spend.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${revenue.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(revenue/spend).toFixed(2)}</div>
      <div class="kpi">Units<br>${units}</div>`;

    const tb=campaignTable.querySelector("tbody");
    tb.innerHTML="";
    Object.entries(map).sort((a,b)=>b[1].spend-a[1].spend).forEach(([n,c])=>{
      const roi=c.revenue/c.spend;
      const flag=roi<3?"🔴 Loss":roi<=5?"🟠 Optimize":"🟢 Scale";
      tb.innerHTML+=`
        <tr>
          <td>${n}</td><td>${c.spend.toFixed(0)}</td>
          <td>${c.revenue.toFixed(0)}</td><td>${c.units}</td>
          <td>${roi.toFixed(2)}</td><td>${flag}</td>
        </tr>`;
    });
  };
  reader.readAsText(file);
}

/* PLACEMENT PERFORMANCE (LOGIC LOCKED) */
function generatePlacement() {
  const file = placementFile.files[0];
  if (!file) return;

  const reader=new FileReader();
  reader.onload=()=>{
    const d=parseCSV(reader.result);
    const h=n=>d[0].indexOf(n);
    const overall={},pivot={};

    d.slice(1).forEach(r=>{
      const c=r[h("Campaign Name")], p=r[h("Placement Type")];
      if(!c||!p) return;
      const s=+r[h("Ad Spend")]||0;
      const u=(+r[h("Direct Units Sold")]||0)+(+r[h("Indirect Units Sold")]||0);
      const rev=(+r[h("Direct Revenue")]||0)+(+r[h("Indirect Revenue")]||0);

      if(!overall[p]) overall[p]={spend:0,revenue:0,units:0};
      overall[p].spend+=s; overall[p].revenue+=rev; overall[p].units+=u;

      if(!pivot[c]) pivot[c]={};
      if(!pivot[c][p]) pivot[c][p]={spend:0,revenue:0,units:0};
      pivot[c][p].spend+=s; pivot[c][p].revenue+=rev; pivot[c][p].units+=u;
    });

    const oB=placementOverallTable.querySelector("tbody");
    oB.innerHTML="";
    Object.entries(overall).forEach(([p,c])=>{
      const roi=c.revenue/c.spend;
      oB.innerHTML+=`
        <tr class="${roiClass(roi)}">
          <td>${p}</td><td>${c.spend.toFixed(0)}</td>
          <td>${c.revenue.toFixed(0)}</td><td>${c.units}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;
    });

    const cB=placementCampaignTable.querySelector("tbody");
    cB.innerHTML="";
    Object.keys(pivot).forEach((camp,i)=>{
      const g=`grp-${i}`;
      cB.innerHTML+=`
        <tr class="campaign-group" data-group="${g}">
          <td colspan="6"><span class="campaign-toggle">▶</span>${camp}</td>
        </tr>`;
      const e=Object.entries(pivot[camp]);
      const best=e.reduce((a,b)=>(b[1].revenue/b[1].spend)>(a[1].revenue/a[1].spend)?b:a);
      e.forEach(([p,c])=>{
        const roi=c.revenue/c.spend;
        cB.innerHTML+=`
          <tr class="hidden-row ${roiClass(roi)} ${p===best[0]?"best-placement":""}" data-parent="${g}">
            <td></td><td>${p}${p===best[0]?" ⭐":""}</td>
            <td>${c.spend.toFixed(0)}</td>
            <td>${c.revenue.toFixed(0)}</td>
            <td>${c.units}</td>
            <td>${roi.toFixed(2)}</td>
          </tr>`;
      });
    });

    document.querySelectorAll(".campaign-group").forEach(r=>{
      r.onclick=()=>{
        const g=r.dataset.group;
        const rows=document.querySelectorAll(`[data-parent="${g}"]`);
        const icon=r.querySelector(".campaign-toggle");
        const c=rows[0].classList.contains("hidden-row");
        rows.forEach(x=>x.classList.toggle("hidden-row",!c));
        icon.textContent=c?"▼":"▶";
      };
    });
  };
  reader.readAsText(file);
}

/* UI CONTROLS */
function expandAllCampaigns() {
  document.querySelectorAll(".campaign-group").forEach(r=>{
    const g=r.dataset.group;
    document.querySelectorAll(`[data-parent="${g}"]`).forEach(x=>x.classList.remove("hidden-row"));
    r.querySelector(".campaign-toggle").textContent="▼";
  });
}

function collapseAllCampaigns() {
  document.querySelectorAll(".campaign-group").forEach(r=>{
    const g=r.dataset.group;
    document.querySelectorAll(`[data-parent="${g}"]`).forEach(x=>x.classList.add("hidden-row"));
    r.querySelector(".campaign-toggle").textContent="▶";
  });
}
