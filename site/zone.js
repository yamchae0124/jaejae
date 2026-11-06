/* 지먹의 경계·선택 스타일과 패널 생산 함수를 독립 정적 지도에 연결한다. */
(function () {
  "use strict";
  const {zones,esc,number,data,search}=window.JJ, api=window.ZoneCore;
  const g=id=>document.getElementById(id);
  const aiLink=document.createElement("a");
  aiLink.id="zone-ai";aiLink.className="zone-ai-link";aiLink.textContent="이 구역 재재 AI에게 물어보기 →";
  g("zone-calc").insertAdjacentElement("beforebegin",aiLink);
  const map=window.zoneMap=L.map("map",{zoomControl:false}).setView([37.5665,126.9780],12);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
  L.control.zoom({position:"topleft"}).addTo(map);
  const key=window.VWORLD_KEY;
  L.tileLayer(key ? `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(key)}/Base/{z}/{y}/{x}.png` :
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,attribution:key?'© <a href="https://www.vworld.kr/">VWorld</a>':'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  const layer=L.layerGroup().addTo(map);
  const bands=["후보지","구역지정·추진위","조합설립·사업시행","관리처분","착공·준공"];
  g("map-legend").innerHTML=bands.map((label,i)=>`<span style="--jj-stage:var(--jj-stage-${i})"><i></i>${label}</span>`).join("");
  let selected=null,tab="progress",kind="villa",range="12",previousFocus=null;
  const band=z=>{const s=Number(z.stageNo)||0;return s===0?0:s<=2?1:s<=4?2:s<=7?3:4;};
  const tokens=getComputedStyle(document.body);
  const rows=zones.map(z=>{
    const geometry=window.ZONE_BOUNDS.items[z.id];
    const boundary=geometry?L.polygon(geometry,{className:"jj-zone-boundary",smoothFactor:0,noClip:true,bubblingMouseEvents:false})
      .on("click",()=>openZone(z)):null;
    if(boundary)boundary.on("add",()=>{boundary.getElement().dataset.zoneId=z.id;});
    const marker=L.marker([z.lat,z.lng],{icon:L.divIcon({className:"jj-zonemarker",iconSize:[0,0],html:""}),title:z.name,alt:z.name,zIndexOffset:700})
      .on("click",()=>openZone(z));
    return {z,boundary,marker};
  });
  function sync(){
    const gu=g("district-filter").value,k=g("kind-filter").value;
    const visible=rows.filter(({z})=>(!gu||z.sgg===gu)&&(!k||z.kind===k));
    g("zone-count").textContent=`${number(visible.length)}곳 · 자료 ${window.ZONES_DATA.asof}`;
    const ids=new Set(visible.map(({z})=>z.id));
    for(const {z,marker,boundary} of rows){
      const active=selected?.id===z.id,visible=ids.has(z.id);
      marker.setIcon(L.divIcon({className:"zonemarker jj-zonemarker",iconSize:[0,0],
        html:`<div class="jj-zone-label${active?" is-selected":map.getZoom()<15?" is-distant":""}" data-jj-stage="${band(z)}" data-zone-id="${esc(z.id)}"><span class="jj-zone-name"><i>${esc(z.kind)}</i>${esc(z.name)}</span><span class="jj-zone-status">${esc(z.stageName||(Number(z.stageNo)===0?"후보지":api.STAGES[Number(z.stageNo)-1])||"단계 미상")}</span></div>`}));
      if(visible&&!layer.hasLayer(marker))layer.addLayer(marker);
      if(!visible&&layer.hasLayer(marker))layer.removeLayer(marker);
      if(!boundary)continue;
      const color=tokens.getPropertyValue(active?"--accent":"--jj-stage-"+band(z)).trim();
      boundary.setStyle({color,fillColor:color,weight:active?3.5:2,fillOpacity:active?.24:.26});
      if(visible&&!layer.hasLayer(boundary))layer.addLayer(boundary);
      if(!visible&&layer.hasLayer(boundary))layer.removeLayer(boundary);
      if(active&&visible)boundary.bringToFront();
    }
    g("zone-list").innerHTML=visible.map(({z})=>`<button class="zone-row" data-zone-id="${esc(z.id)}" aria-pressed="${selected?.id===z.id}"><strong>${esc(z.name)}</strong><small>${esc(z.kind)} · ${esc(z.sgg)}<br>${esc(z.stageName||"단계 미상")}${window.ZONE_BOUNDS.items[z.id]?"":" · 경계 자료 없음"}</small></button>`).join("");
  }
  const districts=[...new Set(zones.map(z=>z.sgg))].sort((a,b)=>a.localeCompare(b,"ko"));
  g("district-filter").insertAdjacentHTML("beforeend",districts.map(d=>`<option>${esc(d)}</option>`).join(""));
  ["district-filter","kind-filter"].forEach(id=>g(id).addEventListener("change",()=>{
    sync();
    const selectedRows=rows.filter(({z})=>(!g("district-filter").value||z.sgg===g("district-filter").value)&&(!g("kind-filter").value||z.kind===g("kind-filter").value));
    if(selectedRows.length)map.fitBounds(selectedRows.map(({z})=>[z.lat,z.lng]),{padding:[24,24],maxZoom:14,animate:false});
  }));
  g("zone-list").addEventListener("click",e=>{
    const b=e.target.closest("[data-zone-id]");if(b)openZone(zones.find(z=>z.id===b.dataset.zoneId));
  });
  search(g("map-search"),z=>openZone(z));
  function nearHtml(bundle){
    if(!bundle.covered)return '<p class="map-message" data-near-scope="outside">수집 범위 밖 · 이 자치구의 아파트 실거래 DB가 없습니다.</p>';
    if(!bundle.located)return '<p class="map-message">구역 좌표가 없어 주변 실거래를 계산하지 않았습니다.</p>';
    const trades=bundle.trades,by=new Map();
    let sA=0,sP=0;
    for(const t of trades){
      const id=t.db+"|"+t.name+"|"+t.dong;
      if(!by.has(id))by.set(id,{name:t.name,n:0,a:0,p:0});
      const r=by.get(id);r.n++;if(t.py){r.a+=t.amt;r.p+=t.py;sA+=t.amt;sP+=t.py;}
    }
    const top=[...by.values()].filter(r=>r.p).sort((a,b)=>b.a/b.p-a.a/a.p).slice(0,3);
    return `<div class="near-summary" data-near-count="${trades.length}">반경 1km · 최근 24개월 · 매매 ${number(trades.length)}건 · 단지 ${by.size}곳<b>${sP?number(Math.round(sA/sP)):"자료 없음"}<small> 만원 / 전용 평당 평균</small></b></div>`+
      (top.length?`<table><thead><tr><th>평당가 상위 단지</th><th>거래</th><th>평당(만)</th></tr></thead><tbody>${top.map(r=>`<tr><td>${esc(r.name)}</td><td>${r.n}건</td><td>${number(Math.round(r.a/r.p))}</td></tr>`).join("")}</tbody></table>`:'<p class="source">저장된 자료에 해당 기간 유효 매매 거래가 없습니다.</p>')+
      `<p class="source">${bundle.from}~${bundle.asof} · 국토교통부 기존 수집본 · 직거래 포함 · 구역 대표 좌표에서 직선거리입니다.<br>${esc(bundle.coverage_note)}${selected.approx?" · 구역은 동 단위 대표점입니다.":""}</p>`+
      (trades.length?`<details><summary>최근 거래 내역 ${number(trades.length)}건</summary><div class="trade-scroll"><table><thead><tr><th>계약일·단지</th><th>전용㎡</th><th>매매(만원)</th></tr></thead><tbody>${trades.map(t=>`<tr><td>${t.date}<br>${esc(t.name)} · ${t.floor??"미상"}층</td><td>${t.area}</td><td>${number(t.amt)}</td></tr>`).join("")}</tbody></table></div></details>`:"");
  }
  async function render(){
    const z=selected;if(!z)return;
    g("panel-content").setAttribute("aria-labelledby","tab-"+tab);
    g("zpTabs").querySelectorAll("button").forEach(b=>{
      const on=b.dataset.tab===tab;b.classList.toggle("on",on);b.setAttribute("aria-selected",String(on));b.tabIndex=on?0:-1;
    });
    const source=`<p class="zp-foot">정보몽땅 자료 기준 ${esc(window.ZONES_DATA.asof)} · 공급은 계획값 · 법적 효력 없음</p>`;
    switch(tab){
      case "progress":g("panel-content").innerHTML=`<section id="zpProg">${api.progressHtml(z)}${source}</section>`;break;
      case "info":g("panel-content").innerHTML=`<section id="zpInfo">${api.infoHtml(z)}<h3>공급 계획</h3>${api.supplyHtml(z)}<h3>생활권·가까운 역</h3>${api.lifeHtml(z)}<h3>관련 문서</h3>${api.docsHtml(z)}<p class="zp-foot">경계: ${esc(window.ZONE_BOUNDS.source)} · ${esc(window.ZONE_BOUNDS.crsNote)}</p></section>`;break;
      case "regulation":g("panel-content").innerHTML=`<section id="zpRegulation">${window.MonthlyPanel.permitHtml(z)}<h3>규제 지역</h3>${api.regHtml(z)}</section>`;break;
      case "trade":{
        g("panel-content").innerHTML='<section id="zpTrade" aria-busy="true"><p class="source">저장된 실거래 자료를 읽고 있어요.</p></section>';
        try{
          const index=await data("data/zone_panel/index.json");
          const [bundle,near]=await Promise.all([data("data/zone_panel/"+index.districts[z.sgg]+".json"),data("data/trades/"+encodeURIComponent(encodeURIComponent(z.id))+".json")]);
          if(selected?.id!==z.id||tab!=="trade")return;
          g("panel-content").innerHTML=`<section id="zpTrade"><div class="jj-actual-trades">${window.MonthlyPanel.tradePanelHtml(bundle,z,kind,range)}</div><h3>주변 아파트 실거래</h3>${nearHtml(near)}<div class="jj-permit-block">${window.MonthlyPanel.permitHtml(z)}</div><h3>규제 지역</h3>${api.regHtml(z)}</section>`;
          g("zpTrade").dataset.ready="true";
        }catch(error){
          if(!(error instanceof Error))throw error;
          if(selected?.id===z.id&&tab==="trade")g("panel-content").innerHTML=`<p class="load-error" role="alert">${esc(error.message)}</p>`;
        }
        break;
      }
      default:throw new Error("알 수 없는 패널 탭: "+tab);
    }
    g("zpBody").scrollTop=0;
  }
  function openZone(z){
    if(!g("zonePanel").classList.contains("show"))previousFocus=document.activeElement;
    selected=z;tab="progress";kind="villa";range="12";
    g("zpName").textContent=z.name;g("zpAddr").textContent=z.addr||"";g("zpChip").textContent=z.kind;
    g("zone-calc").href="calc.html?zone="+encodeURIComponent(z.id);
    aiLink.href="ai.html?zone="+encodeURIComponent(z.id);
    g("zonePanel").classList.add("show");render();sync();
    history.replaceState(null,"","zone.html?zone="+encodeURIComponent(z.id));
    map.setView([z.lat,z.lng],Math.max(15,map.getZoom()),{animate:false});
    const offset=innerWidth>760?[-g("zonePanel").clientWidth/2,0]:[0,g("zonePanel").clientHeight/3];
    map.panBy(offset,{animate:false});g("zpClose").focus({preventScroll:true});
  }
  function close(){
    g("zonePanel").classList.remove("show");selected=null;sync();
    history.replaceState(null,"","zone.html");
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  g("zpClose").addEventListener("click",close);
  g("zonePanel").addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Escape")close();});
  g("zpTabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b){tab=b.dataset.tab;render();}});
  g("zpTabs").addEventListener("keydown",e=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
    const buttons=[...g("zpTabs").querySelectorAll("button")],i=buttons.indexOf(document.activeElement);
    const next=e.key==="Home"?0:e.key==="End"?3:(i+(e.key==="ArrowRight"?1:-1)+4)%4;
    e.preventDefault();buttons[next].focus();buttons[next].click();
  });
  g("panel-content").addEventListener("click",e=>{
    const b=e.target.closest("[data-kind],[data-range]");if(!b)return;
    if(b.dataset.kind)kind=b.dataset.kind;if(b.dataset.range)range=b.dataset.range;render();
  });
  L.DomEvent.disableScrollPropagation(g("zonePanel"));L.DomEvent.disableClickPropagation(g("zonePanel"));
  map.on("zoomend",sync);sync();
  const id=new URLSearchParams(location.search).get("zone");
  if(id){const z=zones.find(z=>z.id===id);if(z)openZone(z);else g("zone-count").textContent="해당 구역을 찾지 못했어요. 이름으로 다시 검색해주세요.";}
  document.documentElement.dataset.mapReady="true";
})();
