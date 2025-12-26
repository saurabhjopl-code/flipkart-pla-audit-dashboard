/*************************************************
 * CAMPAIGN ORDER REPORT – FINAL
 * Fully isolated | JS only | Stable
 *
 * FIXED HEADER CONTRACT (DO NOT CHANGE):
 * Campaign ID
 * AdGroup Name
 * Listing ID
 * Product Name
 * Advertised FSN ID
 * Date
 * order_id
 * AdGroup CPC
 * Expected ROI
 * Purchased FSN ID
 * Total Revenue (Rs.)
 * Direct Units Sold
 * Indirect Units Sold
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

    /* ===== Header (fixed row) ===== */
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

    /* ===== Aggregation ===== */
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

      /* Campaign */
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

      /* Campaign → FSN */
      if (!campaignMap[c].fsns[fsn]) {
        campaignMap[c].fsns[fsn] = { orders:0, units:0, revenue:0 };
      }

      campaignMap[c].fsns[fsn].orders++;
      campaignMap[c].fsns[fsn].units += units;
      campaignMap[c].fsns[fsn].revenue += rev;

      /* Date */
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { orders:0,direct:0,indirect:0,units:0,revenue:0 };
      }

      dateMap[dateStr].orders++;
      dateMap[dateStr].direct += du;
      dateMap[dateStr].indirect += iu;
      dateMap[dateStr].units += units;
      dateMap[dateStr].revenue += rev;

      /* Day of week */
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

    /* ================= CAMPAIGN → FSN (EXPAND / COLLAPSE) ================= */
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

    document.querySelectorAll(".cor-campaign-row").forEach(row=>{
      row.onclick=()=>{
        const g=row.dataset.group;
        const cell=row.querySelector("td");
        const kids=document.querySelectorAll(`[data-parent="${g}"]`);
        const collapsed=kids[0]?.classList.contains("hidden");

        kids.forEach(r=>r.classList.toggle("hidden",!collapsed));
        cell.innerHTML=cell.innerHTML.replace(
          collapsed?"▶":"▼",
          collapsed?"▼":"▶"
        );
      };
    });

    /* ================= ORDER DATE TREND ================= */
    const dateBody=document.querySelector("#corDateTable tbody");
    dateBody.innerHTML="";

    Object.entries(dateMap)
      .sort((a,b)=>new Date(a[0])-new Date(b[0]))
      .forEach(([d,v])=>{
        dateBody.innerHTML+=`
          <tr>
            <td>${d}</td>
            <td>${v.orders}</td>
            <td>${v.direct}</td>
            <td>${v.indirect}</td>
            <td>${v.units}</td>
            <td>${v.revenue.toFixed(0)}</td>
          </tr>`;
      });

    /* ================= DIRECT vs INDIRECT IMPACT ================= */
    const diCampBody=document.querySelector("#diCampaignTable tbody");
    diCampBody.innerHTML="";

    Object.entries(campaignMap).forEach(([c,v])=>{
      const assist=(v.indirect/Math.max(v.direct+v.indirect,1))*100;
      const dRev=v.revenue*(v.direct/Math.max(v.direct+v.indirect,1));
      const iRev=v.revenue*(v.indirect/Math.max(v.direct+v.indirect,1));

      diCampBody.innerHTML+=`
        <tr>
          <td>${c}</td>
          <td>${v.direct}</td>
          <td>${v.indirect}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${dRev.toFixed(0)}</td>
          <td>${iRev.toFixed(0)}</td>
        </tr>`;
    });

    const diFsnBody=document.querySelector("#diFsnTable tbody");
    /* ===== PATCH 2: FSN Level – Top 20 toggle ===== */

const diFsnBody = document.querySelector("#diFsnTable tbody");
const fsnRows = Array.from(diFsnBody.querySelectorAll("tr"));

fsnRows.forEach((row, index) => {
  if (index >= 20) row.classList.add("hidden", "fsn-extra");
});

/* Controls (create once) */
if (!document.getElementById("fsnToggleControls")) {
  const controls = document.createElement("div");
  controls.id = "fsnToggleControls";
  controls.style.margin = "8px 0";

  controls.innerHTML = `
    <button id="showTop20Fsn">Show Top 20</button>
    <button id="showAllFsn">Show All FSN</button>
  `;

  document
    .getElementById("diFsnTable")
    .parentNode
    .insertBefore(controls, document.getElementById("diFsnTable"));
}

document.getElementById("showAllFsn").onclick = () =>
  document.querySelectorAll(".fsn-extra")
    .forEach(r => r.classList.remove("hidden"));

document.getElementById("showTop20Fsn").onclick = () =>
  document.querySelectorAll(".fsn-extra")
    .forEach(r => r.classList.add("hidden"));

    diFsnBody.innerHTML="";

    Object.entries(campaignMap).forEach(([_,v])=>{
      const ratio=v.indirect/Math.max(v.direct+v.indirect,1);
      Object.entries(v.fsns).forEach(([fsn,x])=>{
        diFsnBody.innerHTML+=`
          <tr>
            <td>${fsn}</td>
            <td>${Math.round(x.units*(1-ratio))}</td>
            <td>${Math.round(x.units*ratio)}</td>
            <td>${(ratio*100).toFixed(1)}%</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });

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
/* ===== PATCH 1: Campaign → FSN expand / collapse (event delegation) ===== */

const corFsnTable = document.getElementById("corFsnTable");

if (corFsnTable && !corFsnTable.dataset.bound) {
  corFsnTable.dataset.bound = "true";

  corFsnTable.addEventListener("click", function (e) {
    const campaignRow = e.target.closest("tr[data-group]");
    if (!campaignRow) return;

    const groupId = campaignRow.dataset.group;
    const fsnRows = corFsnTable.querySelectorAll(
      `tr[data-parent="${groupId}"]`
    );

    if (!fsnRows.length) return;

    const isCollapsed = fsnRows[0].classList.contains("hidden");

    fsnRows.forEach(row =>
      row.classList.toggle("hidden", !isCollapsed)
    );

    const firstCell = campaignRow.querySelector("td");
    firstCell.textContent =
      (isCollapsed ? "▼ " : "▶ ") + firstCell.textContent.slice(2);
  });
}

