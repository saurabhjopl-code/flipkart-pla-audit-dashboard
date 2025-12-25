function generateKeyword(){
  const f = keywordFile.files[0];
  if(!f) return alert("Upload Keyword CSV");
  const r = new FileReader();
  r.onload = ()=>{
    const rows = parseCSV(r.result);
    keywordTable.innerHTML = rows.slice(3).map(r=>`
      <tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>
    `).join("");
  };
  r.readAsText(f);
}
