/* 지먹의 경계·선택 스타일과 패널 생산 함수를 독립 정적 지도에 연결한다. */
(function () {
  "use strict";
  const {zones,esc,number,data,search}=window.JJ, api=window.ZoneCore;
  const g=id=>document.getElementById(id);
  g("zpName").insertAdjacentHTML("beforebegin",'<p id="zpStage"></p>');
  g("zpName").insertAdjacentHTML("afterend",'<p id="zpBoundaryNotice" class="map-message" hidden>이 구역은 경계 자료가 없어 위치만 표시해요</p>');
  g("zonePanel").insertAdjacentHTML("afterbegin",'<div class="panel-tools"><button id="panel-expand" type="button" aria-expanded="false">더 보기</button><button id="panel-collapse" type="button">접기</button></div>');
  g("zone-count").insertAdjacentHTML("afterend",'<button id="zone-list-open" type="button">목록</button>');
  const listDialog=document.createElement("dialog");
  listDialog.id="zone-list-dialog";listDialog.setAttribute("aria-label","구역 목록");
  listDialog.innerHTML='<div class="list-head"><h2>구역 목록</h2><button type="button" id="zone-list-close">닫기</button></div>';
  document.body.append(listDialog);
  g("zone-list-open").addEventListener("click",()=>{listDialog.append(g("zone-list"));listDialog.showModal();});
  g("zone-list-close").addEventListener("click",()=>listDialog.close());
  listDialog.addEventListener("click",e=>{if(e.target===listDialog)listDialog.close();});
  listDialog.addEventListener("close",()=>document.querySelector(".finder").insertBefore(g("zone-list"),document.querySelector(".finder-source")));
  const aiLink=document.createElement("a");
  aiLink.id="zone-ai";aiLink.className="zone-ai-link";aiLink.textContent="이 구역 재재 AI에게 물어보기 →";
  g("zpBody").append(aiLink);
  const map=window.zoneMap=L.map("map",{zoomControl:false,trackResize:false}).setView([37.5665,126.9780],12);
  const finderKey="jaejae.finder-collapsed.v1",desktop=matchMedia("(min-width: 761px)");
  let finderCollapsed=window.JJ.readLocal(finderKey,false)===true;
  function setFinderCollapsed(value,focus=false){
    finderCollapsed=value;
    const collapsed=desktop.matches&&value;
    document.querySelector(".map-shell").classList.toggle("finder-collapsed",collapsed);
    for(const id of ["finder-collapse","finder-open"])g(id).setAttribute("aria-expanded",String(!collapsed));
    if(focus)g(collapsed?"finder-open":"finder-collapse").focus({preventScroll:true});
  }
  g("finder-collapse").addEventListener("click",()=>{setFinderCollapsed(true,true);window.JJ.writeLocal(finderKey,true);});
  g("finder-open").addEventListener("click",()=>{setFinderCollapsed(false,true);window.JJ.writeLocal(finderKey,false);});
  desktop.addEventListener("change",()=>setFinderCollapsed(finderCollapsed));
  setFinderCollapsed(finderCollapsed);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
  L.control.zoom({position:"topleft"}).addTo(map);
  const key=window.VWORLD_KEY;
  L.tileLayer(key ? `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(key)}/Base/{z}/{y}/{x}.png` :
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,attribution:key?'© <a href="https://www.vworld.kr/">VWorld</a>':'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  const layer=L.layerGroup().addTo(map);
  const bands=["후보지","구역지정·추진위","조합설립·사업시행","관리처분","착공·준공"];
  g("map-legend").innerHTML='<div id="legend-bands">'+bands.map((label,i)=>`<span style="--jj-stage:var(--jj-stage-${i})"><i></i>${label}</span>`).join("")+'</div><button id="legend-toggle" type="button" aria-label="범례 접기" aria-expanded="true" aria-controls="legend-bands">접기</button>';
  g("legend-toggle").addEventListener("click",()=>{
    const hidden=!g("legend-bands").hidden;g("legend-bands").hidden=hidden;
    g("legend-toggle").setAttribute("aria-expanded",String(!hidden));g("legend-toggle").textContent=hidden?"범례":"접기";g("legend-toggle").setAttribute("aria-label",hidden?"범례 펼치기":"범례 접기");
  });
  let selected=null,tab="progress",kind="all",range="all",tradeLimit=20,previousFocus=null;
  const band=z=>{const s=Number(z.stageNo)||0;return s===0?0:s<=2?1:s<=4?2:s<=7?3:4;};
  const tokens=getComputedStyle(document.body);
  const hoverPointer=matchMedia("(hover: hover) and (pointer: fine)");
  const hoverCard=document.createElement("div");
  hoverCard.id="zone-hover";hoverCard.hidden=true;hoverCard.setAttribute("aria-hidden","true");
  map.getContainer().append(hoverCard);
  let hovered=null,moving=false;
  function paint(z,boundary){
    if(!boundary)return;
    const active=selected?.id===z.id,over=hovered?.z.id===z.id;
    const color=tokens.getPropertyValue(active?"--accent":"--jj-stage-"+band(z)).trim();
    boundary.setStyle({color,fillColor:color,weight:active?3.5:over?3:2,fillOpacity:active?.24:over?.34:.26});
  }
  function hideHover(){
    hoverCard.hidden=true;
    const row=hovered;hovered=null;
    if(row)paint(row.z,row.boundary);
  }
  function showHover(row){
    hideHover();
    if(!hoverPointer.matches||moving||selected?.id===row.z.id&&g("zonePanel").classList.contains("show"))return;
    hovered=row;paint(row.z,row.boundary);
    const z=row.z,move=document.createElement("div");
    move.innerHTML=api.moveSummary(z);
    const estimate=move.querySelector("b").textContent,total=api.nz(z.plan?.total),area=api.nz(z.area_m2,true);
    hoverCard.style.setProperty("--jj-stage",tokens.getPropertyValue("--jj-stage-"+band(z)));
    hoverCard.innerHTML=`<div class="hover-title"><span><i></i>${esc(z.kind)}</span><strong>${esc(z.name)}</strong></div><p class="hover-stage">${esc(z.sgg)} · ${esc(z.stageName||"단계 미상")}</p><div class="hover-metrics"><div><span>입주 예상</span><b>${esc(estimate==="계산 불가"?"–":estimate)}</b></div><div><span>총 세대</span><b>${total==null?"–":number(total)}</b></div><div><span>면적</span><b>${area>0?number(Math.round(area/3.305785)):"–"}</b>${area>0?"<small>평</small>":""}</div></div><p class="hover-hint">누르면 구역 정보가 열려요</p>`;
    hoverCard.hidden=false;
    const box=map.getContainer().getBoundingClientRect(),label=row.marker.getElement().querySelector(".jj-zone-label").getBoundingClientRect();
    const boundary=row.boundary?.getElement().getBoundingClientRect();
    const anchor=boundary?label.width&&label.height?{left:Math.min(boundary.left,label.left),right:Math.max(boundary.right,label.right),top:Math.min(boundary.top,label.top),bottom:Math.max(boundary.bottom,label.bottom)}:boundary:label;
    const w=hoverCard.offsetWidth,h=hoverCard.offsetHeight;
    const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));
    let x=clamp((anchor.left+anchor.right)/2-box.left-w/2,12,box.width-w-12);
    let y=anchor.top-box.top-h-12;
    if(y<12){
      y=anchor.bottom-box.top+12;
      if(y+h>box.height-12){
        x=anchor.right+12+w<=box.right?anchor.right-box.left+12:anchor.left-box.left-w-12;
        x=clamp(x,12,box.width-w-12);y=clamp((anchor.top+anchor.bottom)/2-box.top-h/2,12,box.height-h-12);
      }
    }
    hoverCard.style.left=x+"px";hoverCard.style.top=y+"px";
  }
  hoverPointer.addEventListener("change",hideHover);
  map.on("movestart zoomstart",()=>{moving=true;hideHover();});
  map.on("moveend zoomend",()=>{moving=false;});
  const rows=zones.map(z=>{
    const geometry=window.ZONE_BOUNDS.items[z.id];
    const boundary=geometry?L.polygon(geometry,{className:"jj-zone-boundary",smoothFactor:0,noClip:true,bubblingMouseEvents:false})
      .on("click",()=>openZone(z)):null;
    if(boundary)boundary.on("add",()=>{boundary.getElement().dataset.zoneId=z.id;});
    const marker=L.marker([z.lat,z.lng],{icon:L.divIcon({className:"jj-zonemarker",iconSize:[0,0],html:""}),title:z.name,alt:z.name,zIndexOffset:700})
      .on("click",()=>openZone(z));
    const row={z,boundary,marker,area:Number(z.area_m2)||0};
    for(const target of [boundary,marker].filter(Boolean))target.on("mouseover",()=>showHover(row)).on("mouseout",hideHover);
    return row;
  });
  function placeLabels(){
    const candidates=rows.filter(({marker})=>layer.hasLayer(marker)).map(row=>({
      ...row,label:row.marker.getElement()?.querySelector(".jj-zone-label")
    })).filter(row=>row.label);
    candidates.forEach(({label})=>{label.hidden=false;});
    if(map.getZoom()<15)return;
    candidates.sort((a,b)=>Number(b.z.id===selected?.id)-Number(a.z.id===selected?.id)||b.area-a.area);
    const box=map.getContainer().getBoundingClientRect(),kept=[];
    for(const {z,label} of candidates){
      const rect=label.getBoundingClientRect(),active=z.id===selected?.id;
      const outside=rect.right<box.left||rect.left>box.right||rect.bottom<box.top||rect.top>box.bottom;
      const overlaps=kept.some(r=>rect.left<r.right+4&&rect.right>r.left-4&&rect.top<r.bottom+4&&rect.bottom>r.top-4);
      if(!active&&(outside||overlaps))label.hidden=true;
      else kept.push(rect);
    }
  }
  function sync(){
    hideHover();
    const gu=g("district-filter").value,k=g("kind-filter").value;
    const visible=rows.filter(({z})=>(!gu||z.sgg===gu)&&(!k||z.kind===k));
    g("zone-count").textContent=`${number(visible.length)}곳 · 자료 ${window.ZONES_DATA.asof}`;
    const ids=new Set(visible.map(({z})=>z.id));
    for(const {z,marker,boundary} of rows){
      const active=selected?.id===z.id,visible=ids.has(z.id);
      marker.setLatLng(active&&innerWidth<=760&&boundary?
        [boundary.getBounds().getNorth(),boundary.getBounds().getCenter().lng]:[z.lat,z.lng]);
      marker.setZIndexOffset(active?1000:700);
      marker.setIcon(L.divIcon({className:"zonemarker jj-zonemarker",iconSize:[0,0],
        html:`<div class="jj-zone-label${boundary?" has-boundary":""}${active?" is-selected":map.getZoom()<15?" is-distant":""}" data-jj-stage="${band(z)}" data-zone-id="${esc(z.id)}"><span class="jj-zone-name"><em aria-hidden="true"></em><i>${esc(z.kind)}</i><b>${esc(z.name)}</b></span><span class="jj-zone-status">${esc(z.stageName||(Number(z.stageNo)===0?"후보지":api.STAGES[Number(z.stageNo)-1])||"단계 미상")}</span></div>`}));
      if(visible&&!layer.hasLayer(marker))layer.addLayer(marker);
      if(!visible&&layer.hasLayer(marker))layer.removeLayer(marker);
      if(!boundary)continue;
      paint(z,boundary);
      if(visible&&!layer.hasLayer(boundary))layer.addLayer(boundary);
      if(!visible&&layer.hasLayer(boundary))layer.removeLayer(boundary);
      if(active&&visible)boundary.bringToFront();
    }
    placeLabels();
    g("zone-list").innerHTML=[...visible].sort((a,b)=>Number(Boolean(b.boundary))-Number(Boolean(a.boundary))).map(({z})=>`<button class="zone-row" data-zone-id="${esc(z.id)}" aria-pressed="${selected?.id===z.id}"><strong>${esc(z.name)}</strong><small>${esc(z.kind)} · ${esc(z.sgg)}<br>${esc(z.stageName||"단계 미상")}${window.ZONE_BOUNDS.items[z.id]?"":" · 경계 자료 없음"}</small></button>`).join("");
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
    if(!bundle.covered)return '<p class="map-message" data-near-scope="outside">이 자치구의 아파트 거래 자료는 아직 모으지 못했어요. <a href="https://rt.molit.go.kr/" target="_blank" rel="noopener noreferrer">국토교통부 실거래가 공개시스템 ↗</a></p>';
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
  const panelScroller=()=>innerWidth<=760?g("zonePanel"):g("zpBody");
  const readingLine=()=>innerWidth<=760?Math.max(g("zonePanel").getBoundingClientRect().top,g("zpTabs").getBoundingClientRect().bottom):g("zpBody").getBoundingClientRect().top;
  let contentsTarget=null;
  function scrollSection(id){
    const root=panelScroller(),section=g(id);
    root.scrollBy({top:section.getBoundingClientRect().top-root.getBoundingClientRect().top-(innerWidth<=760?g("zpTabs").offsetHeight:0),
      behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  function updateContents(){
    const sections=[...g("panel-content").children];if(!sections.length)return;
    const root=panelScroller(),line=readingLine()+2;
    const current=root.scrollTop>0&&root.scrollHeight-root.clientHeight-root.scrollTop<2?sections.at(-1):
      sections.findLast(s=>s.getBoundingClientRect().top<=line)||sections[0];
    tab=current.dataset.section;
    g("zpTabs").querySelectorAll("button").forEach(b=>{
      const on=b.dataset.tab===tab;b.classList.toggle("on",on);
      if(on)b.setAttribute("aria-current","true");else b.removeAttribute("aria-current");
    });
  }
  let tradeRequest=0;
  async function renderTrade(){
    const z=selected,request=++tradeRequest,tradeKind=kind,tradeRange=range;
    delete g("zpTrade").dataset.ready;
    g("zpTradeData").setAttribute("aria-busy","true");
    try{
      let bundle=await data("data/zone_trades/"+encodeURIComponent(encodeURIComponent(z.id))+".json");
      if(bundle.series_ref){
        const {series_ref,...metadata}=bundle;
        const series=await data("data/zone_trades/"+series_ref);
        bundle={...metadata,source:"국토교통부 실거래가 공개시스템 · 연속지적도(브이월드)",basis:"대지 평당가 · 만원/평",series};
      }
      if(selected?.id!==z.id||request!==tradeRequest)return;
      const root=panelScroller(),anchor=[...g("panel-content").children].findLast(s=>s.getBoundingClientRect().top<=readingLine()+2);
      const before=anchor?.getBoundingClientRect().top;
      g("zpTradeData").innerHTML=window.MonthlyPanel.tradePanelHtml(bundle,z,tradeKind,tradeRange,tradeLimit);
      window.MonthlyPanel.bind(g("zpTradeData"),bundle);
      g("zpTradeData").setAttribute("aria-busy","false");g("zpTrade").dataset.ready="true";
      if(contentsTarget)scrollSection(contentsTarget);
      else if(anchor){
        const shift=anchor.getBoundingClientRect().top-before;
        if(shift)root.scrollTop+=shift;
      }
      updateContents();
    }catch(error){
      if(!(error instanceof Error))throw error;
      if(selected?.id!==z.id||request!==tradeRequest)return;
      g("zpTradeData").innerHTML=`<p class="load-error" role="alert">${esc(error.message)}</p>`;
      g("zpTradeData").setAttribute("aria-busy","false");
    }
  }
  function render(){
    const z=selected;if(!z)return;
    contentsTarget=null;
    const source=`<p class="zp-foot">정보몽땅 자료 기준 ${esc(window.ZONES_DATA.asof)} · 공급은 계획값 · 법적 효력 없음 · <a href="출처.html">자료 출처 보기 →</a><br>이 페이지에는 토스팀에서 제공한 토스페이스가 적용되어 있습니다.</p>`;
    const section=(id,key,title,item,html)=>`<section id="${id}" data-section="${key}" aria-labelledby="heading-${key}"><h3 class="panel-section-title" id="heading-${key}">${title}</h3>${html}<p class="zp-foot"><a href="knowledge.html?item=${item}#kb-answer">근거 지식 보기 →</a></p></section>`;
    g("panel-content").innerHTML=
      section("zpProg","progress","진행상황","c1-07",api.progressHtml(z))+
      section("zpTrade","trade","실거래·규제","c3-04",`<div id="zpTradeData" aria-busy="true"><p class="source">저장된 실거래 자료를 읽고 있어요.</p></div><div id="zpRegulation">${window.MonthlyPanel.permitHtml(z)}<div class="zp-regulation-row"><span class="tf-icon" aria-hidden="true">🛡️</span><span>규제 지역</span></div>${api.regHtml(z)}<p class="zp-foot"><a href="knowledge.html?item=c2-07#kb-answer">규제 근거 지식 보기 →</a></p></div>`)+
      section("zpSupply","supply","공급 계획","c1-06",api.supplyHtml(z))+
      section("zpInfo","info","구역 정보","c1-06",`${api.infoHtml(z)}<h4>관련 문서</h4>${api.docsHtml(z)}`)+
      section("zpNear","near","가까운 역","c1-06",api.lifeHtml(z,true)+source);
    g("zpBody").scrollTop=0;
    g("zonePanel").scrollTop=0;
    updateContents();renderTrade();requestAnimationFrame(()=>showCurrentStage());
  }
  function showCurrentStage(){
    const rail=g("panel-content").querySelector(".zp-arrows"),current=rail?.querySelector('[aria-current="step"]');
    if(current)rail.scrollTo({left:current.offsetLeft-rail.offsetLeft-(rail.clientWidth-current.offsetWidth)/2,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  function frameSelected(onClose=false){
    if(!selected||!onClose&&!g("zonePanel").classList.contains("show"))return;
    const row=rows.find(row=>row.z.id===selected.id),box=map.getContainer().getBoundingClientRect();
    const mobile=innerWidth<=760,open=g("zonePanel").classList.contains("show");
    const panel=g("zonePanel").getBoundingClientRect(),legend=g("map-legend").getBoundingClientRect();
    const right=!mobile&&open?Math.max(20,box.right-panel.left+20):20;
    let bottom=mobile&&open?Math.max(20,box.bottom-panel.top+20):20,top=20;
    if(legend.height&&legend.left<box.right-right&&legend.right>box.left){
      if(legend.top<box.top+box.height/2)top=Math.max(top,legend.bottom-box.top+12);
      else bottom=Math.max(bottom,box.bottom-legend.top+12);
    }
    if(mobile&&row.boundary)top+=row.marker.getElement().querySelector(".jj-zone-label").getBoundingClientRect().height+8;
    const options={paddingTopLeft:[28,top],paddingBottomRight:[right,bottom],maxZoom:16,animate:false};
    if(row.boundary)map.fitBounds(row.boundary.getBounds(),options);
    else{
      const point=L.latLng(selected.lat,selected.lng);
      map.fitBounds(L.latLngBounds(point,point),{...options,maxZoom:15});
      const label=row.marker.getElement()?.querySelector(".jj-zone-label");
      if(label){
        const rect=label.getBoundingClientRect(),available=box.width-right-28;
        if(rect.width>available)label.style.maxWidth=Math.max(80,available)+"px";
        map.panBy([label.getBoundingClientRect().width/2,0],{animate:false});
      }
    }
  }
  function openZone(z,fromHistory=false){
    if(listDialog.open)listDialog.close();
    const wasOpen=g("zonePanel").classList.contains("show");
    if(!wasOpen)previousFocus=document.activeElement;
     selected=z;tab="progress";kind="all";range="all";tradeLimit=20;
    window.JJ.rememberZone(z);
    g("zpName").textContent=z.name;g("zpAddr").textContent=z.addr||"";g("zpChip").textContent=z.kind;
    g("zpStage").innerHTML=`<i style="background:var(--jj-stage-${band(z)})"></i>${esc(z.kind)} · <b>${esc(z.stageName||"단계 미상")}</b>`;
    g("zpBoundaryNotice").hidden=Boolean(window.ZONE_BOUNDS.items[z.id]);
    g("zone-calc").href="calc.html?zone="+encodeURIComponent(z.id);
    aiLink.href="ai.html?zone="+encodeURIComponent(z.id);
    g("zonePanel").classList.remove("expanded","collapsed");g("panel-expand").hidden=false;g("panel-expand").setAttribute("aria-expanded","false");g("panel-collapse").textContent="접기";
    g("zonePanel").classList.add("show");render();sync();
    if(!fromHistory)history[wasOpen?"replaceState":"pushState"]({...history.state,zonePanel:z.id},"","zone.html?zone="+encodeURIComponent(z.id));
    frameSelected();g("zpClose").focus({preventScroll:true});
  }
  function close(navigate=true){
    const wasOpen=g("zonePanel").classList.contains("show");
    g("zonePanel").classList.remove("show","expanded","collapsed");sync();if(wasOpen)frameSelected(true);
    if(navigate&&history.state?.zonePanel)history.back();
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  g("zpClose").addEventListener("click",()=>close());
  const collapse=()=>{
    g("zonePanel").classList.remove("expanded");g("zonePanel").classList.add("collapsed");
    g("panel-collapse").textContent="펼치기";
    g("zonePanel").scrollTop=0;g("panel-expand").hidden=false;g("panel-expand").setAttribute("aria-expanded","false");frameSelected();
  };
  const restore=()=>{
    g("zonePanel").classList.remove("expanded","collapsed");g("panel-collapse").textContent="접기";
    g("zonePanel").scrollTop=0;g("panel-expand").hidden=false;g("panel-expand").setAttribute("aria-expanded","false");frameSelected();
  };
  g("panel-collapse").addEventListener("click",()=>g("zonePanel").classList.contains("collapsed")?restore():collapse());
  g("zonePanel").querySelector(".zp-head").addEventListener("click",e=>{if(g("zonePanel").classList.contains("collapsed")&&!e.target.closest("button"))restore();});
  const expand=()=>{
    g("zonePanel").classList.remove("collapsed");g("zonePanel").classList.add("expanded");g("panel-expand").hidden=true;g("panel-expand").setAttribute("aria-expanded","true");g("panel-collapse").textContent="접기";
    g("zonePanel").scrollTop=0;
  };
  g("panel-expand").addEventListener("click",expand);
  const grip=g("zonePanel").querySelector(".panel-tools");
  let dragY=null;
  grip.addEventListener("pointerdown",e=>{dragY=e.clientY;});
  window.addEventListener("pointerup",e=>{
    if(dragY==null)return;
    const dy=e.clientY-dragY;dragY=null;
    if(dy < -40)expand();
    if(dy > 40){if(g("zonePanel").classList.contains("expanded"))restore();else collapse();}
  });
  grip.addEventListener("pointercancel",()=>{dragY=null;});
  new ResizeObserver(()=>{
    const center=map.getCenter(),zoom=map.getZoom();
    map.invalidateSize({pan:false});
    if(g("zonePanel").classList.contains("show")){
      if(!g("zonePanel").classList.contains("expanded"))frameSelected();
    }else map.setView(center,zoom,{animate:false,reset:true});
    showCurrentStage();
  }).observe(map.getContainer());
  g("zonePanel").addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Escape")close();});
  for(const id of ["zonePanel","zpBody"]){
    g(id).addEventListener("scroll",updateContents,{passive:true});
    g(id).addEventListener("scrollend",()=>{contentsTarget=null;});
  }
  g("zpTabs").addEventListener("click",e=>{
    const b=e.target.closest("[data-tab]");if(!b)return;
    if(g("zonePanel").classList.contains("collapsed"))restore();
    contentsTarget=b.getAttribute("aria-controls");scrollSection(contentsTarget);
    updateContents();
  });
  g("zpTabs").addEventListener("keydown",e=>{
    if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
    const buttons=[...g("zpTabs").querySelectorAll("button")],i=buttons.indexOf(document.activeElement);
    const next=e.key==="Home"?0:e.key==="End"?3:(i+(e.key==="ArrowRight"?1:-1)+4)%4;
    e.preventDefault();buttons[next].focus();buttons[next].click();
  });
  g("panel-content").addEventListener("click",e=>{
    const b=e.target.closest("button[data-kind],button[data-range],[data-more-trades]");if(!b)return;
    if(b.dataset.kind){kind=b.dataset.kind;tradeLimit=20;}
    if(b.dataset.range)range=b.dataset.range;
    if(b.hasAttribute("data-more-trades"))tradeLimit+=20;
    renderTrade();
  });
  L.DomEvent.disableScrollPropagation(g("zonePanel"));L.DomEvent.disableClickPropagation(g("zonePanel"));
  map.on("zoomend",()=>{
    sync();
    if(!g("zonePanel").classList.contains("show"))return;
    const label=map.getContainer().querySelector(".jj-zone-label.is-selected");
    if(!label)return;
    const rect=label.getBoundingClientRect(),box=map.getContainer().getBoundingClientRect();
    const legend=g("map-legend").getBoundingClientRect(),panel=g("zonePanel").getBoundingClientRect();
    let right=box.right-12,top=box.top+12,bottom=box.bottom-12;
    if(g("zonePanel").classList.contains("show")){
      if(innerWidth<=760)bottom=Math.min(bottom,panel.top-8);else right=Math.min(right,panel.left-8);
    }
    if(legend.height){
      if(legend.top<box.top+box.height/2)top=Math.max(top,legend.bottom+8);
      else bottom=Math.min(bottom,legend.top-8);
    }
    const dx=rect.left<box.left+12?rect.left-box.left-12:Math.max(0,rect.right-right);
    const dy=rect.top<top?rect.top-top:Math.max(0,rect.bottom-bottom);
    if(dx||dy)map.panBy([dx,dy],{animate:false});
  });
  map.on("moveend",placeLabels);sync();
  new ResizeObserver(()=>frameSelected()).observe(g("map-legend"));
  window.addEventListener("popstate",e=>{
    const z=zones.find(z=>z.id===e.state?.zonePanel);
    if(z)openZone(z,true);else close(false);
  });
  const id=new URLSearchParams(location.search).get("zone");
  if(id){const z=zones.find(z=>z.id===id);if(z){history.replaceState({...history.state,zonePanel:null},"","zone.html");openZone(z);}else g("zone-count").textContent="해당 구역을 찾지 못했어요. 이름으로 다시 검색해주세요.";}
  document.documentElement.dataset.mapReady="true";
})();
