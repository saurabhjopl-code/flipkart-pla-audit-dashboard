/*************************************************
 * CAMPAIGN ORDER REPORT – FINAL (STABLE)
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
      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const rev = +r[idx.revenue] || 0;
      const dateStr = r[idx.date];

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
        campBody.innerHTML+=`
          <tr>
            <td>${c}</td>
            <td>${v.orders}</td>
            <td>${v.direct}</td>
            <td>${v.indirect}</td>
            <td>${v.units}</td>
            <td>${v.revenue.toFixed(0)}</td>
          </tr>`;
      });

    /* ================= CAMPAIGN → FSN (FIXED) ================= */
    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";
    let gid = 0;

    Object.entries(campaignMap).forEach(([c,v])=>{
      const g = "grp_"+gid++;
      fsnBody.innerHTML+=`
        <tr data-group="${g}" class="cor-campaign-row">
          <td style="cursor:pointer;font-weight:600">▶ ${c}</td>
          <td>${v.orders}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;
      Object.entries(v.fsns).forEach(([fsn,x])=>{
        fsnBody.innerHTML+=`
          <tr data-parent="${g}" class="hidden">
            <td style="padding-left:22px">${fsn}</td>
            <td>${x.orders}</td>
            <td>${x.units}</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });

    document.getElementById("corFsnTable").onclick = e => {
      const row = e.target.closest("tr[data-group]");
      if (!row) return;
      const g = row.dataset.group;
      const kids = document.querySelectorAll(`tr[data-parent="${g}"]`);
      const open = kids[0].classList.contains("hidden");
      kids.forEach(r=>r.classList.toggle("hidden",!open));
      row.firstElementChild.textContent =
        (open?"▼ ":"▶ ")+row.firstElementChild.textContent.slice(2);
    };

    /* ================= DIRECT vs INDIRECT (FSN TOP 20) ================= */
    const diFsnBody=document.querySelector("#diFsnTable tbody");
    diFsnBody.innerHTML="";
    const fsnAgg={};

    Object.values(campaignMap).forEach(v=>{
      const ratio=v.indirect/Math.max(v.direct+v.indirect,1);
      Object.entries(v.fsns).forEach(([fsn,x])=>{
        if(!fsnAgg[fsn]) fsnAgg[fsn]={d:0,i:0,r:0};
        fsnAgg[fsn].d+=Math.round(x.units*(1-ratio));
        fsnAgg[fsn].i+=Math.round(x.units*ratio);
        fsnAgg[fsn].r+=x.revenue;
      });
    });

    Object.entries(fsnAgg)
      .map(([fsn,v])=>({fsn,...v,u:v.d+v.i}))
      .sort((a,b)=>b.u-a.u)
      .forEach((v,i)=>{
        diFsnBody.innerHTML+=`
          <tr class="${i>=20?"hidden fsn-extra":""}">
            <td>${v.fsn}</td>
            <td>${v.d}</td>
            <td>${v.i}</td>
            <td>${((v.i/Math.max(v.u,1))*100).toFixed(1)}%</td>
            <td>${v.r.toFixed(0)}</td>
          </tr>`;
      });
  };
  reader.readAsText(fileInput.files[0]);
}
