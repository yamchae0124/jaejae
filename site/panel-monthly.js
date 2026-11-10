/* 장기 연립·단독 대지 평당가. 허가 안내는 기존 렌더를 보존한다. */
(function () {
'use strict';
const api=window.ZoneCore, esc=window.JJ.esc;
const number=(n)=>Number(n).toLocaleString('ko-KR');
const tradeKinds={villa:'연립·다세대',detached:'단독·다가구'};
const monthSerial=(month)=>Number(month.slice(0,4))*12+Number(month.slice(5,7));
  function permitHtml(z) {
    if (!api.regionOf(z)) return "";
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
    const active = today >= "2025-10-20" && today <= "2026-12-31";
    const original = "https://land.seoul.go.kr/land/other/downloadAppointPbancFile.do?fileUuid=59d9172df7ab0038e063621d0f8d00381085112";
    return `<h4>이 구역에서 사려면</h4><dl class="jj-permit" aria-label="토지거래허가"><div><dt><span class="tf-icon" aria-hidden="true">🔒</span>아파트</dt><dd><span class="${active ? "jj-permit-required" : ""}">${active ? '허가 필요' : "지정기간 밖 · 최신 공고 확인"}</span></dd></div>` +
      `<div><dt><span class="tf-icon" aria-hidden="true">🔒</span>빌라</dt><dd class="${active ? "jj-permit-required" : ""}">${active ? "일부 지번만 허가 필요 · 토지이음 확인" : "지정기간 밖 · 최신 공고 확인"}</dd></div></dl>` +
      `<p class="zp-foot jj-permit-source">국토교통부 공고 제2025-1219호 · 서울 25구 · 2025-10-20~2026-12-31 · 확인일 2026-11-06<br>` +
      `연립·다세대는 공고 붙임2 지번만 해당합니다. 공고의 기준면적 등 허가 요건과 별도·중첩 지정이 있어 개별 필지 확정은 <a href="https://www.eum.go.kr/" target="_blank" rel="noopener noreferrer">토지이음</a>에서 확인하세요.<br>` +
      `<a href="${original}" target="_blank" rel="noopener noreferrer">공고 원문(서울부동산정보광장)</a></p>`;
  }
  const price=value=>value==null?"자료 없음":number(Math.round(value));
  const controls=(name,values,selected)=>`<div class="jj-trade-controls" role="group" aria-label="${name==="range"?"거래 기간":"거래 유형"}">`+
    values.map(([value,label])=>`<button type="button" data-${name}="${value}" aria-pressed="${value===selected}">${label}</button>`).join("")+`</div>`;
  function chart(bundle,zone,range){
    const end=monthSerial(bundle.period[1]),start=range==="all"?monthSerial(bundle.period[0]):Math.max(monthSerial(bundle.period[0]),end-Number(range)+1);
    const visible=row=>monthSerial(row[0])>=start&&monthSerial(row[0])<=end;
    const kinds=Object.keys(tradeKinds),values=kinds.flatMap(k=>bundle.series[k].rows.filter(visible).map(r=>r[1]).filter(v=>v!=null)).sort((a,b)=>a-b);
    const lines=kinds.flatMap(k=>bundle.series[k].line.filter(visible).map(r=>r[1]).filter(v=>v!=null));
    const high=Math.max(4000,values[Math.floor((values.length-1)*.95)]||0,...lines);
    const step=Math.pow(10,Math.floor(Math.log10(high)))/2,cap=Math.ceil(high/step)*step;
    const x=m=>40+(monthSerial(m)-start+.5)/(end-start+1)*384,y=v=>160-Math.min(cap,v)/cap*136;
    let svg=[0,1,2,3,4].map(i=>`<line class="jj-chart-grid" x1="40" x2="424" y1="${160-i*34}" y2="${160-i*34}"/><text x="34" y="${163-i*34}" text-anchor="end">${price(cap*i/4)}</text>`).join("");
    const quarters=new Map();
    for(const key of kinds)for(const row of bundle.series[key].rows.filter(visible)){
      const q=`${row[0].slice(0,4)}-Q${Math.ceil(Number(row[0].slice(5))/3)}`;
      quarters.set(q,(quarters.get(q)||0)+1);
    }
    const volumeMax=Math.max(1,...quarters.values());
    svg+=[...quarters].map(([q,n])=>{
      const m=q.slice(0,4)+"-"+String((Number(q.at(-1))-1)*3+2).padStart(2,"0"),cx=Math.max(42,Math.min(422,x(m)));
      return `<rect class="jj-quarter" x="${cx-2.5}" y="${196-n/volumeMax*24}" width="5" height="${n/volumeMax*24}" data-quarter="${q}" data-count="${n}"><title>${q} · ${number(n)}건</title></rect>`;
    }).join("");
    const current=api.STAGE_BY_NAME[zone.stageName]??-1;
    const band=Number(zone.stageNo)||0,colour=`var(--jj-stage-${band===0?0:band<=2?1:band<=4?2:band<=7?3:4})`;
    const stages=(zone.stages||[]).map((date,i)=>({date,i})).filter(({date})=>/^\d{4}-\d{2}-\d{2}$/.test(date||"")&&visible([date.slice(0,7)]));
    svg+=stages.map(({date,i},index)=>{
      const cx=x(date.slice(0,7))+(Number(date.slice(8))-15)/31*384/(end-start+1),on=i===current;
      return `<g class="jj-stage-date" data-date="${date}" data-stage-index="${i}" data-current="${on}" style="color:${on?colour:"var(--sub)"}"><line x1="${cx}" x2="${cx}" y1="22" y2="198"/><text x="${Math.max(42,Math.min(422,cx))}" y="${index%2?21:10}" text-anchor="${cx>320?"end":"start"}">${esc(api.STAGES[i].replace(/인가|신고|승인/g,""))}</text><title>${esc(api.STAGES[i])} · ${date}${on?" · 지금":""}</title></g>`;
    }).join("");
    const outliers=[];
    for(const key of ["detached","villa"]){
      let connected=false;
      const path=bundle.series[key].line.filter(visible).map(row=>{
        if(row[1]==null){connected=false;return "";}
        const segment=`${connected?"L":"M"}${x(row[0]).toFixed(2)},${y(row[1]).toFixed(2)}`;connected=true;return segment;
      }).join("");
      svg+=`<path class="jj-moving-line ${key}" data-kind="${key}" d="${path}"/>`;
      svg+=bundle.series[key].rows.filter(visible).filter(row=>row[1]!=null).map(row=>{
        const count=bundle.series[key].line.find(r=>r[0]===row[0])?.[2]||0;
        const attrs=`data-trade-point="${key}" data-month="${row[0]}" data-value="${row[1]}" data-count="${count}"`;
        if(row[1]>cap){
          outliers.push(`${row[0].replace("-",".")} ${key==="villa"?"연립":"단독"} ▲ ${price(row[1])}만/평`);
          return `<path class="jj-trade-point jj-outlier ${key}" d="M${x(row[0])} 24l-3 6h6z" ${attrs}><title>${esc(outliers.at(-1))}</title></path>`;
        }
        return `<circle class="jj-trade-point ${key}" cx="${x(row[0])}" cy="${y(row[1])}" r="2.5" ${attrs}/>`;
      }).join("");
    }
    const tickMonths=[...new Set([start,Math.round((start+end)/2),end])];
    svg+=tickMonths.map(m=>`<text x="${40+(m-start+.5)/(end-start+1)*384}" y="212" text-anchor="${m===start?"start":m===end?"end":"middle"}">${Math.floor((m-1)/12)}.${String((m-1)%12+1).padStart(2,"0")}</text>`).join("");
    // Month-wide hit targets also work when individual trades are hidden on a phone.
    const hits=bundle.series.villa.line.filter(visible).map(row=>`<rect class="jj-month-hit" x="${x(row[0])-192/(end-start+1)}" y="24" width="${384/(end-start+1)}" height="174" data-month-hit="${row[0]}"/>`).join("");
    return `<div class="jj-trade-chart"><svg class="jj-zone-chart" viewBox="0 0 432 218" role="img" tabindex="0" aria-label="연립·단독 대지 평당가 거래 점, 12개월 이동 중앙값, 분기 거래 수와 단계 날짜" data-start="${start}" data-end="${end}" data-cap="${cap}">${hits}${svg}</svg><output class="jj-trade-tooltip" hidden aria-live="polite"></output></div>`+
      (outliers.length?`<details class="jj-outlier-values"><summary>축 밖 거래 ${outliers.length}건 · ${esc(outliers[0])}</summary>${outliers.map(text=>`<p>${esc(text)}</p>`).join("")}</details>`:"");
  }
  function tradePanelHtml(bundle,zone,kind,range,limit=20){
    const summaries=Object.entries(tradeKinds).map(([key,label])=>{
      const s=bundle.series[key],v=s.summary,count=`최근 12개월 ${number(v.recent_n)}건`;
      const change=v.growth==null?`<em class="jj-summary-count">${count}</em>`:`<em>${v.growth>=0?"+":""}${Math.round(v.growth)}%</em>`;
      return `<div data-summary="${key}" data-count="${s.n}"><span class="tf-icon" aria-hidden="true">${key==="villa"?"🏘️":"🏠"}</span><span><small>${label} ${number(s.n)}건</small><b>${v.recent==null?"자료 없음":price(v.recent)+"만"} ${change}</b>${v.growth==null?"":`<small class="jj-summary-count">${count}</small>`}</span></div>`;
    }).join("");
    const any=Object.values(bundle.series).some(s=>s.n);
    const rows=Object.entries(bundle.series).filter(([key])=>kind==="all"||key===kind).flatMap(([key,s])=>s.rows.map(row=>({key,row}))).sort((a,b)=>b.row[0].localeCompare(a.row[0])||b.row[5]-a.row[5]);
    const scopes=`연립 <b>${bundle.scope.villa==="parcel"?"구역 안(필지 기준)":"법정동 근사"}</b> · 단독 <b>법정동 근사</b>`;
    return `<div class="zp-trade-summary">${summaries}</div><p class="jj-summary-basis">2016년 중앙값 → 최근 12개월 중앙값<br>상승률은 거래가 5건 이상일 때만 보여요.</p>`+
      (any?controls("range",[["12","1년"],["36","3년"],["60","5년"],["all","전체"]],range)+'<p class="jj-trade-unit">대지 평당가 · 만원/평</p>'+chart(bundle,zone,range):'<p class="jj-trade-empty">이 구역의 연립·단독 거래 자료가 없어요</p>')+
      `<p class="jj-trade-scope">점 = 거래 1건 · 선 = 12개월 중앙값 · 막대 = 분기 거래 수<br>${scopes}</p>`+
      `<p class="zp-foot">${esc(bundle.scope_reason)}${bundle.dong?" · "+esc(bundle.dong):""}<br>단독은 지번 비공개로 구역 주소 법정동을 사용해요.<br>대지권면적(연립)·대지면적(단독) 기준 · ${bundle.period.join("~")}<br>기준일 ${esc(bundle.asof)} · ${esc(bundle.source)}<br>해제 거래 제외 · 같은 조건의 별개 거래는 그대로 집계 · 신고 지연으로 최근 월은 적을 수 있어요.<br>면적 없음: 연립 ${bundle.series.villa.missing}건 · 단독 ${bundle.series.detached.missing}건(가격 점·선 제외, 건수 포함)</p>`+
      `<details class="jj-trade-method"><summary>시작값·상승률·연 환산 기준</summary>${Object.entries(tradeKinds).map(([key,label])=>{
        const s=bundle.series[key].summary;
        return `<p>${label} ${price(s.base)} → ${price(s.recent)}만/평${s.growth==null?"":` · 상승률 ${s.growth.toFixed(1)}% · 연 환산 ${s.annual.toFixed(1)}%`}<br>2016년 ${number(s.base_n)}건 · 최근 12개월 ${number(s.recent_n)}건 · 비교 창 중간일 간 ${s.years.toFixed(2)}년<br>두 기간 모두 거래가 5건 이상일 때만 계산해요.</p>`;
      }).join("")}</details>`+
      (any?`<h4 class="jj-history-heading">거래 내역</h4>${controls("kind",[["all","전체"],["villa","연립"],["detached","단독"]],kind)}<p class="zp-foot">최근 순 · ${number(rows.length)}건 · 평당가는 대지 기준</p><table class="jj-trade-history"><thead><tr><th>계약·지번</th><th>면적·층</th><th>대지 평당가</th></tr></thead><tbody>${rows.slice(0,limit).map(({key,row})=>`<tr data-history-kind="${key}"><td>${row[0].replace("-",".")}.${String(row[5]).padStart(2,"0")} · ${key==="villa"?"연립":"단독"}<br>${esc(row[4])}</td><td>${number(row[3])}㎡<br>${row[2]==null?"층 미공개":row[2]+"층"}</td><td>${row[1]==null?"면적 없음":price(row[1])+"만/평"}</td></tr>`).join("")}</tbody></table>${rows.length>limit?`<button type="button" class="jj-trades-more" data-more-trades>20건 더 보기</button>`:""}`:"");
  }
  function bind(root,bundle){
    const tip=root.querySelector(".jj-trade-tooltip"),svg=root.querySelector(".jj-zone-chart");
    if(!tip||!svg)return;
    const show=(month,point)=>{
      tip.textContent=point?`${month.replace("-",".")} · ${point.dataset.tradePoint==="villa"?"연립":"단독"} ${price(Number(point.dataset.value))}만/평 · 그 달 ${point.dataset.count}건`:
        ["villa","detached"].map(k=>{const r=bundle.series[k].line.find(row=>row[0]===month);return `${k==="villa"?"연립":"단독"} ${price(r?.[1])}${r?.[1]==null?"":"만/평"} · ${r?.[2]||0}건`;}).join(" / ");
      if(!point)tip.textContent=month.replace("-",".")+" · "+tip.textContent;
      tip.hidden=false;
    };
    svg.addEventListener("pointermove",event=>{
      const point=event.target.closest("[data-trade-point]"),hit=event.target.closest("[data-month-hit]");
      if(point)show(point.dataset.month,point);else if(hit)show(hit.dataset.monthHit);
    });
    svg.addEventListener("click",event=>{
      const rect=svg.getBoundingClientRect(),start=Number(svg.dataset.start),end=Number(svg.dataset.end);
      const serial=start+Math.max(0,Math.min(end-start,Math.floor(((event.clientX-rect.left)/rect.width*432-40)/384*(end-start+1))));
      const month=`${Math.floor((serial-1)/12)}-${String((serial-1)%12+1).padStart(2,"0")}`;
      const point=event.target.closest("[data-trade-point]");
      show(point?.dataset.month||month,point);
    });
    svg.addEventListener("keydown",event=>{
      if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
      event.preventDefault();
      const start=Number(svg.dataset.start),end=Number(svg.dataset.end);
      const next=event.key==="Home"?start:event.key==="End"?end:Math.max(start,Math.min(end,Number(svg.dataset.cursor||start)+(event.key==="ArrowRight"?1:-1)));
      svg.dataset.cursor=String(next);show(`${Math.floor((next-1)/12)}-${String((next-1)%12+1).padStart(2,"0")}`);
    });
    svg.addEventListener("pointerleave",()=>{tip.hidden=true;});
  }
window.MonthlyPanel={permitHtml,tradePanelHtml,bind};
})();
