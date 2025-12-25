/*************************************************
 * CAMPAIGN ORDER REPORT – FINAL (LOCKED)
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("generateCampaignOrderBtn");
  if (btn) btn.addEventListener("click", generateCampaignOrderReport);
});

function generateCampaignOrderReport() {
  const fileInput = document.getElementById("campaignOrderFile");
  if (!fileInput || !fileInput.files.length) {
    alert("Upload Campaign Order Report CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);

    const headers = rows[2];
    const data = rows.slice(3);

    const idx = {
      campaign: headers.indexOf("Campaign ID"),
      fsn: headers.indexOf("Advertised FSN ID"),
      date: headers.indexOf("Date"),
      direct: headers.indexOf("Direct Units Sold"),
      indirect: headers.indexOf("Indirect Units Sold"),
      revenue: headers.indexOf("Total Revenue (Rs.)")
    };

    for (const k in idx) {
      if (idx[k] === -1) {
        alert("Campaign Order CSV missing column: " + k);
        return;
      }
    }

    const campaignMap = {};
    const dateMap = {};
    const dowMap = {
      Monday:{},Tuesday:{},Wednesday:{},
      Thursday:{},Friday:{},Saturday:{},Sunday:{}
    };

    data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      const fsn = r[idx.fsn];
      const date = r[idx.date];

      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const rev = +r[idx.revenue] || 0;

      if (!campaignMap[c]) {
        campaignMap[c] = {
          orders:0,direct:0,indirect:0,units:0,revenue:0,fsns:{}
        };
      }

      campaignMap[c].orders++;
      campaignMap[c].direct += du;
      campaignMap[c].indirect += iu;
      campaignMap[c].units += units;
      campaignMap[c].revenue += rev;

      if (!campaignMap[c].fsns[fsn]) {
        campaignMap[c].fsns[fsn] = {units:0,revenue:0};
      }

      campaignMap[c].fsns[fsn].units += units;
      campaignMap[c].fsns[fsn].revenue += rev;

      if (!dateMap[date]) {
        dateMap[date] = {o:0,d:0,i:0,u:0,r:0};
      }

      dateMap[date].o++;
      dateMap[date].d += du;
      dateMap[date].i += iu;
      dateMap[date].u += units;
      dateMap[date].r += rev;

      const day = new Date(date).toLocaleDateString("en-US",{weekday:"long"});
      if (!dowMap[day].o) dowMap[day] = {o:0,d:0,i:0,u:0,r:0};

      dowMap[day].o++;
      dowMap[day].d += du;
      dowMap[day].i += iu;
      dowMap[day].u += units;
      dowMap[day].r += rev;
    });

    /* ================= FSN LEVEL – DIRECT vs INDIRECT ================= */

    const fsnAgg = {};
    Object.values(campaignMap).forEach(c => {
      const ratio = c.indirect / Math.max(c.direct + c.indirect, 1);
      Object.entries(c.fsns).forEach(([fsn,v]) => {
        if (!fsnAgg[fsn]) {
          fsnAgg[fsn] = {units:0,revenue:0,ratio};
        }
        fsnAgg[fsn].units += v.units;
        fsnAgg[fsn].revenue += v.revenue;
      });
    });

    const fsnSorted = Object.entries(fsnAgg)
      .sort((a,b)=>b[1].units - a[1].units);

    const fsnBody = document.querySelector("#diFsnTable tbody");
    fsnBody.innerHTML = "";

    fsnSorted.forEach(([fsn,v],i)=>{
      const hidden = i >= 10 ? "fsn-extra hidden" : "";
      fsnBody.innerHTML += `
        <tr class="${hidden}">
          <td>${fsn}</td>
          <td>${Math.round(v.units * (1 - v.ratio))}</td>
          <td>${Math.round(v.units * v.ratio)}</td>
          <td>${(v.ratio*100).toFixed(1)}%</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;
    });

    /* ===== Expand / Collapse FSN ===== */
    document.getElementById("expandFsn")?.onclick = () =>
      document.querySelectorAll(".fsn-extra").forEach(r=>r.classList.remove("hidden"));

    document.getElementById("collapseFsn")?.onclick = () =>
      document.querySelectorAll(".fsn-extra").forEach(r=>r.classList.add("hidden"));

    /* ================= DAY OF WEEK ================= */

    const dowBody = document.querySelector("#dowTable tbody");
    dowBody.innerHTML = "";

    Object.entries(dowMap).forEach(([d,v])=>{
      if(!v.o) return;
      const assist = (v.i / Math.max(v.d + v.i,1)) * 100;
      dowBody.innerHTML += `
        <tr>
          <td>${d}</td>
          <td>${v.o}</td>
          <td>${v.d}</td>
          <td>${v.i}</td>
          <td>${v.u}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.r.toFixed(0)}</td>
        </tr>`;
    });

    /* ================= CANNIBALIZATION ================= */

    const cannibalBody = document.querySelector("#cannibalTable tbody");
    cannibalBody.innerHTML = "";

    Object.entries(campaignMap).forEach(([c,v])=>{
      const assist = (v.indirect / Math.max(v.direct + v.indirect,1)) * 100;
      let flag="🟢 Good";
      if(assist>=70) flag="🔴 Action";
      else if(assist>=40) flag="🟠 Highlight";

      cannibalBody.innerHTML += `
        <tr>
          <td>${c}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.direct}</td>
          <td>${v.indirect}</td>
          <td>${v.revenue.toFixed(0)}</td>
          <td><b>${flag}</b></td>
        </tr>`;
    });
  };

  reader.readAsText(fileInput.files[0]);
}
