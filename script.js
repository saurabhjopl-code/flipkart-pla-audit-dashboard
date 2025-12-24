/* TAB SWITCH */
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c=>c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

/* CSV PARSER */
function parseCSV(t){
  const r=[];let row=[],c="",q=false;
  for(let i=0;i<t.length;i++){
    const ch=t[i],n=t[i+1];
    if(ch=='"'&&q&&n=='"'){c+='"';i++;}
    else if(ch=='"')q=!q;
    else if(ch==","&&!q){row.push(c.trim());c="";}
    else if(ch=="\n"&&!q){row.push(c.trim());r.push(row);row=[];c="";}
    else c+=ch;
  }
  row.push(c.trim());r.push(row);
  return r;
}

const roiClass=r=>r<3?"roi-red":r<=5?"roi-orange":"roi-green";

/* ================= DAILY REPORT ================= */
function generateCampaign(){
  const f=campaignFile.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    const d=parseCSV(rd.result),h=n=>d[0].indexOf(n);
    let s=0,r=0,u=0,map={};
    d.slice(1).forEach(x=>{
      const n=x[h("Campaign Name")]; if(!n)return;
      const sp=+x[h("Ad Spend")]||0;
      const rv=+x[h("Total Revenue (Rs.)")]||0;
      const un=+x[h("Total converted units")]||0;
      s+=sp;r+=rv;u+=un;
      if(!map[n])map[n]={s:0,r:0,u:0};
      map[n].s+=sp;map[n].r+=rv;map[n].u+=un;
    });

    campaignKpi.innerHTML=`
      <div class="kpi">Spend<br>₹${s.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${r.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(r/s).toFixed(2)}</div>
      <div class="kpi">Units<br>${u}</div>`;

    const tb=campaignTable.querySelector("tbody"); tb.innerHTML="";
    Object.entries(map).sort((a,b)=>b[1].s-a[1].s).forEach(([n,c])=>{
      const roi=c.r/c.s;
      const flag=roi<3?"🔴 Loss":roi<=5?"🟠 Optimize":"🟢 Scale";
      tb.innerHTML+=`
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
  rd.readAsText(f);
}

/* ================= PLACEMENT PERFORMANCE ================= */
function generatePlacement(){
  const f=placementFile.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    const d=parseCSV(rd.result),h=n=>d[0].indexOf(n);
    const overall={},pivot={};

    d.slice(1).forEach(r=>{
      const c=r[h("Campaign Name")],p=r[h("Placement Type")];
      if(!c||!p)return;
      const id=r[h("Campaign ID")];
      const s=+r[h("Ad Spend")]||0;
      const u=(+r[h("Direct Units Sold")]||0)+(+r[h("Indirect Units Sold")]||0);
      const rv=(+r[h("Direct Revenue")]||0)+(+r[h("Indirect Revenue")]||0);

      if(!overall[p])overall[p]={s:0,r:0,u:0};
      overall[p].s+=s;overall[p].r+=rv;overall[p].u+=u;

      if(!pivot[c]){
        pivot[c]={__id:id};
      }
      if(!pivot[c][p])pivot[c][p]={s:0,r:0,u:0};
      pivot[c][p].s+=s;pivot[c][p].r+=rv;pivot[c][p].u+=u;
    });

    /* Overall table */
    const ob=placementOverallTable.querySelector("tbody"); ob.innerHTML="";
    Object.entries(overall).forEach(([p,c])=>{
      const roi=c.r/c.s;
      ob.innerHTML+=`
        <tr class="${roiClass(roi)}">
          <td>${p}</td>
          <td>${c.s.toFixed(0)}</td>
          <td>${c.r.toFixed(0)}</td>
          <td>${c.u}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;
    });

    /* Campaign-wise */
    const cb=placementCampaignTable.querySelector("tbody"); cb.innerHTML="";
    Object.keys(pivot).forEach((c,i)=>{
      const g=`grp-${i}`;
      const sum=Object.values(pivot[c]).filter(v=>v.s).reduce((a,x)=>{
        a.s+=x.s;a.r+=x.r;a.u+=x.u;return a;
      },{s:0,r:0,u:0});
      const roi=sum.r/sum.s;

      cb.innerHTML+=`
        <tr class="campaign-group" data-group="${g}">
          <td><span class="campaign-toggle">▶</span>${c} (${pivot[c].__id})</td>
          <td></td>
          <td>${sum.s.toFixed(0)}</td>
          <td>${sum.r.toFixed(0)}</td>
          <td>${sum.u}</td>
          <td>${roi.toFixed(2)}</td>
        </tr>`;

      const entries=Object.entries(pivot[c]).filter(x=>x[0]!=="__id");
      const best=entries.reduce((a,b)=>(b[1].r/b[1].s)>(a[1].r/a[1].s)?b:a);

      entries.forEach(([p,x])=>{
        const r=x.r/x.s;
        cb.innerHTML+=`
          <tr class="hidden-row ${roiClass(r)} ${p===best[0]?"best-placement":""}" data-parent="${g}">
            <td></td>
            <td>${p}${p===best[0]?" ⭐":""}</td>
            <td>${x.s.toFixed(0)}</td>
            <td>${x.r.toFixed(0)}</td>
            <td>${x.u}</td>
            <td>${r.toFixed(2)}</td>
          </tr>`;
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
  rd.readAsText(f);
}

function expandAllCampaigns(){
  document.querySelectorAll(".campaign-group").forEach(r=>{
    const g=r.dataset.group;
    document.querySelectorAll(`[data-parent="${g}"]`).forEach(x=>x.classList.remove("hidden-row"));
    r.querySelector(".campaign-toggle").textContent="▼";
  });
}

function collapseAllCampaigns(){
  document.querySelectorAll(".campaign-group").forEach(r=>{
    const g=r.dataset.group;
    document.querySelectorAll(`[data-parent="${g}"]`).forEach(x=>x.classList.add("hidden-row"));
    r.querySelector(".campaign-toggle").textContent="▶";
  });
}
