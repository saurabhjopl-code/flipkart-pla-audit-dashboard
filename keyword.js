/*************************
 * KEYWORD REPORTS ONLY
 * NO TOUCHING OTHER TABS
 *************************/

function keywordSegment(roi){
  if(roi >= 7) return ["🟢 Scale","Increase bids"];
  if(roi >= 5) return ["🟠 Optimize","Test"];
  if(roi >= 3) return ["🟡 Caution","Reduce"];
  return ["🔴 Kill","Pause"];
}

function generateKeywordReport(){
  const file = document.getElementById("keywordFile").files[0];
  if(!file){
    alert("Upload Keyword CSV");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);   // reused safely
    const period = extractReportPeriod(rows);

    document.getElementById("keywordPeriod").innerHTML =
      `Report Period: <b>${period.start}</b> → <b>${period.end}</b>`;

    const headerRow = autoDetectHeader(rows, ["attributed_keyword","Spend"]);
    const headers = rows[headerRow];
    const data = rows.slice(headerRow + 1);
    const h = n => headers.indexOf(n);

    // 🔹 All keyword logic here (isolated)
    // 🔹 No reference to campaign / placement tables
  };

  reader.readAsText(file);
}
