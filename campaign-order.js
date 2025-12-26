/*************************************************
 * CAMPAIGN ORDER REPORT – FINAL CLEAN VERSION
 * Reset to last stable + correct additions
 *************************************************/

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("generateCampaignOrderBtn")
    ?.addEventListener("click", generateCampaignOrderReport);
});

function generateCampaignOrderReport() {
  const file = document.getElementById("campaignOrderFile")?.files?.[0];
  if (!file) {
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
        alert("Missing column: " + k);
        return;
      }
    }

    /* =====================================================
       AGGREGATION (STRICTLY SEPARATED MAPS)
    ===================================================== */

    const campaignMap = {};
    const dateMap = {};
    const dowMap = {};
    const fsnDIMap = {};

    data.forEach(r => {
      const c = r[idx.campaign];
      const fsn = r[idx.fsn];
      const date = r[idx.date];
      if (!c || !fsn || !date) return;

      const du = +r[idx.direct] || 0;
      const iu = +r[idx.indirect] || 0;
      const units = du + iu;
      const rev = +r[idx.revenue] || 0;

      /* ---------- Campaign map ---------- */
      if (!campaignMap[c]) {
        campaignMap[c] = {
          orders: 0,
          direct: 0,
          indirect: 0,
          units: 0,
          revenue: 0,
          fsns: {}
        };
      }
      campaignMap[c].orders++;
      campaignMap[c].direct += du;
      campaignMap[c].indirect += iu;
      campaignMap[c].units += units;
      campaignMap[c].revenue += rev;

      if (!campaignMap[c].fsns[fsn]) {
        campaignMap[c].fsns[fsn] = { orders: 0, units: 0, revenue: 0 };
      }
      campaignMap[c].fsns[fsn].orders++;
      campaignMap[c].fsns[fsn].units += units;
      campaignMap[c].fsns[fsn].revenue += rev;

      /* ---------- Date trend ---------- */
      if (!dateMap[date]) {
        dateMap[date] = { o: 0, d: 0, i: 0, u: 0, r: 0 };
      }
      dateMap[date].o++;
      dateMap[date].d += du;
      dateMap[date].i += iu;
      dateMap[date].u += units;
      dateMap[date].r += rev;

      /* ---------- Day of week ---------- */
      const day = new Date(date).toLocaleDateString("en-US", {
        weekday: "long"
      });
      if (!dowMap[day]) {
        dowMap[day] = { o: 0, d: 0, i: 0, u: 0, r: 0 };
      }
      dowMap[day].o++;
      dowMap[day].d += du;
      dowMap[day].i += iu;
      dowMap[day].u += units;
      dowMap[day].r += rev;

      /* ---------- FSN DI ---------- */
      if (!fsnDIMap[fsn]) {
        fsnDIMap[fsn] = { direct: 0, indirect: 0, revenue: 0 };
      }
      fsnDIMap[fsn].direct += du;
      fsnDIMap[fsn].indirect += iu;
      fsnDIMap[fsn].revenue += rev;
    });

    /* =====================================================
       CAMPAIGN SUMMARY (RESTORED – STABLE)
    ===================================================== */

    const campBody = document.querySelector("#corCampaignTable tbody");
    campBody.innerHTML = "";

    Object.entries(campaignMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .forEach(([c, v]) => {
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

    /* =====================================================
       CAMPAIGN → FSN PERFORMANCE (PARENT / CHILD)
       DEFAULT COLLAPSED – WORKING
    ===================================================== */

    const fsnBody = document.querySelector("#corFsnTable tbody");
    fsnBody.innerHTML = "";

    let gid = 0;
    Object.entries(campaignMap).forEach(([c, v]) => {
      const g = "grp_" + gid++;

      fsnBody.innerHTML += `
        <tr class="cor-campaign-row" data-group="${g}">
          <td style="cursor:pointer;font-weight:600">▶ ${c}</td>
          <td>${v.orders}</td>
          <td>${v.units}</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;

      Object.entries(v.fsns).forEach(([fsn, x]) => {
        fsnBody.innerHTML += `
          <tr class="cor-fsn-row hidden" data-parent="${g}">
            <td style="padding-left:22px">${fsn}</td>
            <td>${x.orders}</td>
            <td>${x.units}</td>
            <td>${x.revenue.toFixed(0)}</td>
          </tr>`;
      });
    });

    document.getElementById("corFsnTable").onclick = e => {
      const row = e.target.closest(".cor-campaign-row");
      if (!row) return;
      const g = row.dataset.group;
      const kids = document.querySelectorAll(`[data-parent="${g}"]`);
      const open = kids[0]?.classList.contains("hidden");
      kids.forEach(k => k.classList.toggle("hidden", !open));
      row.querySelector("td").innerHTML =
        (open ? "▼ " : "▶ ") + row.querySelector("td").innerText.slice(2);
    };

    /* =====================================================
       ORDER DATE TREND (FIXED)
    ===================================================== */

    const dateBody = document.querySelector("#corDateTable tbody");
    dateBody.innerHTML = "";

    Object.entries(dateMap)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .forEach(([d, v]) => {
        dateBody.innerHTML += `
          <tr>
            <td>${d}</td>
            <td>${v.o}</td>
            <td>${v.d}</td>
            <td>${v.i}</td>
            <td>${v.u}</td>
            <td>${v.r.toFixed(0)}</td>
          </tr>`;
      });

    /* =====================================================
       DIRECT vs INDIRECT – FSN LEVEL (TOP 20)
    ===================================================== */

    const fsnRows = Object.entries(fsnDIMap)
      .map(([fsn, v]) => ({
        fsn,
        direct: v.direct,
        indirect: v.indirect,
        units: v.direct + v.indirect,
        revenue: v.revenue
      }))
      .sort((a, b) => b.units - a.units);

    const fsnDIbody = document.querySelector("#diFsnTable tbody");
    fsnDIbody.innerHTML = "";

    fsnRows.forEach((v, i) => {
      const assist = (v.indirect / Math.max(v.units, 1)) * 100;
      const hidden = i >= 20 ? "hidden fsn-extra" : "";
      fsnDIbody.innerHTML += `
        <tr class="${hidden}">
          <td>${v.fsn}</td>
          <td>${v.direct}</td>
          <td>${v.indirect}</td>
          <td>${assist.toFixed(1)}%</td>
          <td>${v.revenue.toFixed(0)}</td>
        </tr>`;
    });

    document.getElementById("showAllFsn")?.onclick = () =>
      document.querySelectorAll(".fsn-extra")
        .forEach(r => r.classList.remove("hidden"));

    document.getElementById("showTopFsn")?.onclick = () =>
      document.querySelectorAll(".fsn-extra")
        .forEach(r => r.classList.add("hidden"));
  };

  reader.readAsText(file);
}
