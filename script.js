/******** TAB SWITCH ********/
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

/******** CSV PARSER ********/
function parseCSV(text){
  return text.trim().split("\n").map(r=>r.split(",").map(x=>x.trim()));
}

/******** PERIOD ********/
function extractReportPeriod(rows){
  return {
    start: rows[0].join(" ").replace(/.*:/,"").trim(),
    end: rows[1].join(" ").replace(/.*:/,"").trim()
  };
}

/******** HEADER ********/
function autoDetectHeader(rows, keys){
  for(let i=0;i<5;i++){
    if(keys.every(k=>rows[i].includes(k))) return i;
  }
  throw "Header not found";
}

/******** ROI SEGMENT ********/
function kwSegment(roi){
  if(roi>=7) return ["🟢 Scale","Increase"];
  if(roi>=5) return ["🟠 Optimize","Test"];
  if(roi>=3) return ["🟡 Caution","Reduce"];
  return ["🔴 Kill","Pause"];
}

/******** KEYWORD REPORT ********/
function generateKeywordReport(){
  const f=keywordFile.files[0];
  if(!f) return alert("Upload Keyword CSV");

  const r=new FileReader();
  r.onload=()=>{
    const rows=parseCSV(r.result);
    const period=extractReportPeriod(rows);
    keywordPeriod.innerHTML=`Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    const hRow=autoDetectHeader(rows,["attributed_keyword","Spend"]);
    const hds=rows[hRow];
    const d=rows.slice(hRow+1);
    const h=n=>hds.indexOf(n);

    const kw={}, day={}, week={};
    let TS=0,TR=0;

    d.forEach(x=>{
      const k=x[h("attributed_keyword")];
      if(!k) return;
      const date=x[h("Date")];
      const s=+x[h("Spend")]||0;
      const dr=+x[h("Direct Revenue")]||0;
      const ir=+x[h("Indirect Revenue")]||0;
      const du=+x[h("Direct Units")]||0;
      const iu=+x[h("Indirect Units")]||0;

      const r=dr+ir, u=du+iu;
      TS+=s; TR+=r;

      if(!kw[k]) kw[k]={s:0,r:0,u:0};
      kw[k].s+=s; kw[k].r+=r; kw[k].u+=u;

      if(date){
        if(!day[date]) day[date]={s:0,r:0,u:0};
        day[date].s+=s; day[date].r+=r; day[date].u+=u;
      }
    });

    keywordExecutive.innerHTML=`
      <div class="kpi">Spend<br>₹${TS.toFixed(0)}</div>
      <div class="kpi">Revenue<br>₹${TR.toFixed(0)}</div>
      <div class="kpi">ROI<br>${(TR/TS).toFixed(2)}</div>
      <div class="kpi">Keywords<br>${Object.keys(kw).length}</div>
    `;

    kwSegment.querySelector("tbody").innerHTML=
      Object.entries(kw).map(([k,v])=>{
        const roi=v.s?v.r/v.s:0;
        const [seg,act]=kwSegment(roi);
        return `<tr>
          <td>${k}</td><td>${v.s.toFixed(0)}</td>
          <td>${v.r.toFixed(0)}</td><td>${v.u}</td>
          <td>${roi.toFixed(2)}</td><td>${seg}</td><td>${act}</td>
        </tr>`;
      }).join("");
  };
  r.readAsText(f);
}
