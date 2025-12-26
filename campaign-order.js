/*************************************************
 * CAMPAIGN ORDER REPORT – FINAL (STABLE + FIXED)
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

    /* ================= AGGREGATION ================= */

    const campaignMap = {};
    const dateMap = {};
    const dowMap = {
      Monday:{o:0,d:0,i:0,u:0,r:0},
      Tuesday:{o:0,d:0,i:0,u:0,r:0},
      Wednesday:{o:0,d:0,i:0,u:0,r:0},
      Thursday:{o:0,d:0,i:0,u:0,r:0},
      Friday:{o:0,d:0,i:0,u:0,r:0},
      Saturday:{o:0,d:0,i:0,u:0,r:0},
      Sunday:{o:0,d:0,i:0,u:0,r:0}
    };

    data.forEach(r => {
      const c = r[idx.campaign];
      if (!c) return;

      const fsn = r[idx.fsn];
      const dateStr = r[idx.date];

      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const rev = +r[idx.revenue] || 0;

      if (!campaignMap[c]) {
        campaignMap[c] = {
          orders:0, direct:0, indirect:0,
          units:0, revenue:0, fsns:{}
        };
      }

      campaignMap[c].orders++;
      campaignMap[c].direct += du;
      campaignMap[c].indirect += iu;
      campaignMap[c].units += units;
      campaignMap[c].revenue += rev;

      if (!campaignMap[c].fsns[fsn]) {
        campaignMap[c].fsns[fsn] = { orders:0, units:0, revenue:0 };
      }

      campaignMap[c].fsns[fsn].orders++;
      campaignMap[c].fsns[fsn].units += units;
      campaignMap[c].fsns[fsn].revenue += rev;

      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { orders:0,direct:0,indirect:0,units:0,revenue:0 };
      }

      dateMap[dateStr].orders++;
      dateMap[dateStr].direct += du;
      dateMap[dateStr].indirect += iu;
      dateMap[dateStr].units += units;
      dateMap[dateStr].revenue += rev;

      const day = new Date(dateStr).toLocaleDateString("en-US",{weekday:"long"});
      if (dowMap[day]) {
        dowMap[day].o++;
        dowMap[day].d += du;
        dowMap[day].i += iu;
        dowMap[day].u += units;
        dowMap[day].r += rev;
      }
    });

    /* ================= CAMPAIGN SUMMARY ================= */
    const campBody = document.querySelector("#corCampaignTable tbody");
    campBody.innerHTML = "";

    Object.entries(campaignMap)
      .sort((a,b)=>b[1].revenue-a[1].revenue)
      .forEach(([c,v])=>{
        campBody.innerHTML += `
          <tr>
            <td>${c}</td>
            <td>${v.orders}</td>
            <td>${v.direct}</td>
            <td>${v.indirect}</td>
            <td>${v.units}</td>
            <td>${v.revenue.toFixed(0)}</td>
          </tr>`;
      });

    /* ================= CAMPAIGN → FSN (FIXED EXPAND / COLLAPSE) ================= */
    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";

    let gid = 0;
    Object.entries(campaignMap).forEach(([c,v])=>{
      const g = "grp_"+gid++;

      fsnBody.innerHTML += `
        <tr class="cor-campaign-row" data-group="${g}">
          <td style="cursor:pointer;font-weight:600">▶ ${c}</td>
          <td>${v.orders}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;

      Object.entries(v.fsns).forEach(([fsn,x])=>{
        fsnBody.innerHTML += `
          <tr class="cor-fsn-row hidden" data-parent="${g}">
            <td style="padding-left:22px">${fsn}</td>
            <td>${x.orders}</td>
            <td>${x.units}</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });

    /* ✅ EVENT DELEGATION — ALWAYS WORKS */
    document.getElementById("corFsnTable").onclick = e => {
      const row = e.target.closest(".cor-campaign-row");
      if (!row) return;

      const g = row.dataset.group;
      const kids = document.querySelectorAll(`[data-parent="${g}"]`);
      const open = kids[0].classList.contains("hidden");

      kids.forEach(r => r.classList.toggle("hidden", !open));
      row.querySelector("td").innerHTML =
        (open ? "▼ " : "▶ ") + row.querySelector("td").innerText.slice(2);
    };

    /* ================= DIRECT vs INDIRECT – FSN LEVEL (TOP 20) ================= */

    const fsnAgg = {};

    Object.values(campaignMap).forEach(v=>{
      const ratio = v.indirect / Math.max(v.direct + v.indirect,1);
      Object.entries(v.fsns).forEach(([fsn,x])=>{
        if (!fsnAgg[fsn]) {
          fsnAgg[fsn] = { direct:0, indirect:0, revenue:0 };
        }
        fsnAgg[fsn].direct += Math.round(x.units * (1 - ratio));
        fsnAgg[fsn].indirect += Math.round(x.units * ratio);
        fsnAgg[fsn].revenue += x.revenue;
      });
    });

    const fsnSorted = Object.entries(fsnAgg)
      .map(([fsn,v])=>({
        fsn,
        direct:v.direct,
        indirect:v.indirect,
        units:v.direct+v.indirect,
        revenue:v.revenue
      }))
      .sort((a,b)=>b.units-a.units);

    const diFsnBody = document.querySelector("#diFsnTable tbody");
    diFsnBody.innerHTML = "";

    fsnSorted.forEach((v,i)=>{
      const assist = (v.indirect / Math.max(v.units,1)) * 100;
      const hidden = i >= 20 ? "hidden fsn-extra" : "";

      diFsnBody.innerHTML += `
        <tr class="${hidden}">
          <td>${v.fsn}</td>
          <td>${v.direct}</td>
          <td>${v.indirect}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;
    });

    /* Show All / Show Top 20 */
    document.getElementById("showAllFsn")?.onclick = () =>
      document.querySelectorAll(".fsn-extra").forEach(r=>r.classList.remove("hidden"));

    document.getElementById("showTopFsn")?.onclick = () =>
      document.querySelectorAll(".fsn-extra").forEach(r=>r.classList.add("hidden"));

    /* ================= DAY OF WEEK IMPACT ================= */
    const dowBody=document.querySelector("#dowTable tbody");
    dowBody.innerHTML="";

    Object.entries(dowMap).forEach(([day,v])=>{
      if(!v.o) return;
      const assist=(v.i/Math.max(v.d+v.i,1))*100;

      dowBody.innerHTML+=`
        <tr>
          <td>${day}</td>
          <td>${v.o}</td>
          <td>${v.d}</td>
          <td>${v.i}</td>
          <td>${v.u}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.r.toFixed(0)}</td>
        </tr>`;
    });

    /* ================= CANNIBALIZATION RISK ================= */
    const cannibalBody=document.querySelector("#cannibalTable tbody");
    cannibalBody.innerHTML="";

    Object.entries(campaignMap).forEach(([c,v])=>{
      const assist=(v.indirect/Math.max(v.direct+v.indirect,1))*100;
      let flag="🟢 Good";
      if(assist>=70) flag="🔴 Bad";
      else if(assist>=40) flag="🟠 Average";

      cannibalBody.innerHTML+=`
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
