/* 15b calculation / 16차 현금 흐름·패널 비교 재사용. 세금·수수료는 합계 제외. */
(function(){
  "use strict";
  const {esc,number,zones}=window.JJ,g=id=>document.getElementById(id);
  const host=g("calc-content"),mode=host.dataset.calculator;
  const query=new URLSearchParams(location.search),zone=zones.find(z=>z.id===query.get("zone"));
  const tabs=[["calc.html","총투자금 타임라인","total"],["calc_share.html","추가분담금","share"],["calc_profit.html","수익 분석","profit"],["calc_zones.html","구역 비교","zones"]];
  document.querySelector("[data-calc-tabs]").innerHTML=tabs.map(([url,label,key])=>`<a href="${url}${zone?"?zone="+encodeURIComponent(zone.id):""}"${mode===key?' aria-current="page"':""}>${label}</a>`).join("");
  const amount=(n)=>{
    const value=Math.round(Math.abs(n)),eok=Math.floor(value/10000),rest=value%10000;
    return(n<0&&value?"−":"")+(eok?number(eok)+"억":"")+(rest||!eok?(eok?" ":"")+number(rest)+"만원":"원");
  };
  // Original 15b owner: round at won precision, not at displayed manwon precision.
  const calculation=(appraisal,ratio,price)=>{
    const won=value=>Math.round(value*10000)/10000,right=won(appraisal*ratio/100);
    return{right,additional:won(price-right),low:won(price-appraisal*(ratio+10)/100),high:won(price-appraisal*Math.max(0,ratio-10)/100)};
  };
  const field=(id,label,unit="만원",hint="")=>`<label class="field" for="${id}">${label}<span><input id="${id}" type="text" inputmode="decimal" data-number="${unit}" autocomplete="off" maxlength="20" value=""><small>${unit}</small></span>${hint?`<small>${hint}</small>`:""}</label>`;
  const foot=`<footer class="calc-foot">입력한 값 기준의 관행적 계산 · 법정 산식이 아니며 투자 권유가 아닙니다. <b>세금·수수료 별도</b> · 비례율·분양가·대출 약정은 조합·금융기관에 확인하세요. 실제 납부 순서·비율·시기는 사업마다 다릅니다. <a href="knowledge.html">근거 지식 보기 →</a></footer>`;
  const selectedZone=`<p class="source wide">${zone?`계산하는 구역 <b>${esc(zone.name)}</b> · ${esc(zone.stageName||"단계 미상")}`:"구역을 고르지 않아도 계산할 수 있어요."} <a href="zone.html">지도에서 구역 고르기 →</a></p>`;
  function inputValue(id){
    const input=g(id),raw=input.value.replaceAll(",","").trim();
    if(!raw)return null;
    return input.validity.valid&&/^\d+(?:\.\d+)?$/.test(raw)?Number(raw):null;
  }
  function bind(render){
    const form=g("calc-form");
    form.addEventListener("submit",e=>{e.preventDefault();render();});
    form.addEventListener("input",e=>{
      const input=e.target;
      if(input.matches("[data-number]")){
        const raw=input.value.replaceAll(",",""),valid=raw===""||(/^\d+(?:\.\d*)?$/.test(raw)&&Number(raw)<=100000000);
        input.setCustomValidity(valid?"":"0 이상 1억 만원 이하의 숫자를 입력하세요.");
        input.setAttribute("aria-invalid",String(!valid));
      }
      render();
    });
    form.addEventListener("change",e=>{if(e.target.matches("select"))render();});render();
  }
  const line=(label,value,id="")=>`<div class="kv-row"><span>${label}</span><b${id?` id="${id}" data-value="${value}"`:""}>${amount(value)}</b></div>`;
  function layout(inputs){host.innerHTML=`${selectedZone}<div class="calc-layout"><form id="calc-form" class="calc-inputs" autocomplete="off">${inputs}</form><section class="calc-output" id="calc-result" aria-live="polite"></section></div>${foot}`;}
  function invalid(required){
    const bad=host.querySelector("input:invalid");
    if(bad)return bad.validationMessage;
    if(required.some(id=>inputValue(id)==null))return"왼쪽에 내 조건을 입력하면 계산 결과가 나와요. 빈칸을 임의의 금액으로 채우지 않습니다.";
    return"";
  }
  switch(mode){
    case "share":{
      layout(field("appraisal","종전자산 평가액")+field("ratio","비례율","%")+field("price","조합원 분양가"));
      let offset=0;
      const render=()=>{
        const out=g("calc-result"),message=invalid(["appraisal","ratio","price"]);
        if(message){out.innerHTML=`<p class="empty" role="status">${esc(message)}</p>`;return;}
        const appraisal=inputValue("appraisal"),ratio=inputValue("ratio"),price=inputValue("price");
        const cases=[-20,-10,0,10,20].filter(delta=>ratio+delta>=0).map(delta=>({offset:delta,ratio:ratio+delta,...calculation(appraisal,ratio+delta,price)}));
        if(!cases.some(c=>c.offset===offset))offset=0;
        const index=cases.findIndex(c=>c.offset===offset),r=cases[index],base=calculation(appraisal,ratio,price);
        out.innerHTML=`<div class="result-top"><div><p class="source">선택 가정 · 비례율 ${number(r.ratio)}%</p><h2>${r.additional<0?"돌려받는 금액(청산금)":"예상 추가분담금"}</h2><output class="big-value" id="additional" data-value="${r.additional}">${amount(Math.abs(r.additional))}</output></div><div><p class="source">입력한 조합원 분양가</p><b>${amount(price)}</b></div></div>
          <div class="stops" style="grid-template-columns:repeat(${cases.length},minmax(0,1fr));--stop-end:${100/cases.length}%" role="group" aria-label="비례율 가정 선택">${cases.map(c=>`<button type="button" class="stop${c.offset===offset?" sel":""}" data-scenario="${c.offset}" aria-pressed="${c.offset===offset}"><i></i><b>${number(c.ratio)}%</b><small>${amount(c.additional)}</small></button>`).join("")}</div>
          <div class="det"><div><h2>비례율 ${number(r.ratio)}%일 때</h2><p class="why">평가액 × 비례율 = 권리가액.<br>조합원 분양가에서 권리가액을 빼면 분담금이에요.</p><p class="source">왼쪽 입력 ${number(ratio)}%를 기준으로 ±10·20%p 가정만 바꿉니다. 0% 미만 가정은 제외해요.</p><div class="progress"><i style="width:${(index+1)/cases.length*100}%"></i></div><div class="pn"><button type="button" data-scenario="${cases[Math.max(0,index-1)].offset}"${index===0?" disabled":""}>← 이전 가정</button><span class="source">${index+1} / ${cases.length}</span><button type="button" data-scenario="${cases[Math.min(cases.length-1,index+1)].offset}"${index===cases.length-1?" disabled":""}>다음 가정 →</button></div></div><div>${line("종전자산 평가액",appraisal)}${line("선택 가정의 권리가액",r.right,"right-value")}${line("조합원 분양가",price)}</div></div>
          <div class="cash-check"><div><p>입력 비례율 −10%p</p><b id="high-value" data-value="${base.high}">${amount(base.high)}</b></div><div><p>선택 가정 ${number(r.ratio)}%</p><b>${amount(r.additional)}</b></div><div><p>입력 비례율 +10%p</p><b id="low-value" data-value="${base.low}">${amount(base.low)}</b></div></div><p class="source">비례율 변화에 따른 참고 계산 · 인가된 관리처분계획과 다를 수 있습니다.</p>`;
        out.querySelectorAll("[data-scenario]").forEach(b=>b.addEventListener("click",()=>{offset=Number(b.dataset.scenario);render();}));
      };
      bind(render);break;
    }
    case "profit":{
      layout(field("purchase","매입 가격")+field("contribution","예상 추가분담금")+field("sale","직접 정한 매도 가격")+field("loan","매수 대출 원금")+field("rate","직접 정한 연이율","%")+field("years","보유 기간","년"));
      let offset=0;
      const render=()=>{
        const out=g("calc-result"),message=invalid(["purchase","contribution","sale","loan","rate","years"]);
        if(message){out.innerHTML=`<p class="empty" role="status">${esc(message)}</p>`;return;}
        const purchase=inputValue("purchase"),contribution=inputValue("contribution"),sale=inputValue("sale"),loan=inputValue("loan");
        if(loan>purchase){out.innerHTML='<p class="empty negative" role="status">매수 대출 원금은 매입 가격 이하여야 해요.</p>';return;}
        const years=inputValue("years"),rate=inputValue("rate");
        const cases=[-2,-1,0,1,2].filter(delta=>years+delta>=0).map(delta=>{
          const interest=Math.round(loan*rate/100*(years+delta)*10000)/10000;
          return{offset:delta,years:years+delta,interest,profit:sale-purchase-contribution-interest};
        });
        if(!cases.some(c=>c.offset===offset))offset=0;
        const index=cases.findIndex(c=>c.offset===offset),current=cases[index],interest=current.interest;
        const total=purchase+contribution+interest,profit=sale-total;
        out.innerHTML=`<div class="result-top"><div><p class="source">선택 가정 · ${number(current.years)}년 보유</p><output class="big-value ${profit<0?"negative":"positive"}" id="profit" data-value="${profit}">${amount(profit)}</output><p class="source">${profit<0?"예상 손실":"예상 수익"} · 세금·수수료 별도</p></div><div><p class="source">입력한 매도가 고정</p><b>${amount(sale)}</b></div></div>
          <div class="stops" style="grid-template-columns:repeat(${cases.length},minmax(0,1fr));--stop-end:${100/cases.length}%" role="group" aria-label="보유 기간 가정 선택">${cases.map(c=>`<button type="button" class="stop${c.offset===offset?" sel":""}" data-scenario="${c.offset}" aria-pressed="${c.offset===offset}"><i></i><b>${number(c.years)}년</b><small>${amount(c.profit)}</small></button>`).join("")}</div>
          <div class="det"><div><h2>${number(current.years)}년 보유할 때</h2><p class="why">매도 가격은 입력값으로 고정하고 보유 기간만 바꿔요. 기간에 따라 매수 대출 단리 이자가 달라집니다.</p><p class="source">입력 기간 ${number(years)}년을 기준으로 ±1·2년 가정 · 0년 미만 가정은 제외</p><div class="progress"><i style="width:${(index+1)/cases.length*100}%"></i></div><div class="pn"><button type="button" data-scenario="${cases[Math.max(0,index-1)].offset}"${index===0?" disabled":""}>← 이전 가정</button><span class="source">${index+1} / ${cases.length}</span><button type="button" data-scenario="${cases[Math.min(cases.length-1,index+1)].offset}"${index===cases.length-1?" disabled":""}>다음 가정 →</button></div></div><div>${line("매입 가격",purchase)}${line("추가분담금",contribution)}${line("매수 대출 단리 이자",interest,"interest")}${line("총투자금 · 대출 원금 중복 제외",total,"investment")}${line("손익분기 매도가",total,"breakeven")}</div></div>
          <div class="cash-check"><div><p>직접 정한 매도 가격</p><b>${amount(sale)}</b></div><div><p>선택 가정의 투자금</p><b>${amount(total)}</b></div><div><p>${number(current.years)}년 예상 손익</p><b class="${profit<0?"negative":"positive"}">${amount(profit)}</b></div></div><p class="source" id="return-rate">${total>0?"총투자금 대비 수익률 "+(profit/total*100).toFixed(2)+"%":"총투자금이 0이라 수익률은 계산하지 않아요."}<br>대출 원금은 매입가 안에 포함됩니다. 원금 상환은 비용에 다시 더하지 않아요. 이자는 원금 고정·단리 가정이며 이주비·중도금 대출이자는 포함하지 않습니다.</p>`;
        out.querySelectorAll("[data-scenario]").forEach(b=>b.addEventListener("click",()=>{offset=Number(b.dataset.scenario);render();}));
      };
      bind(render);break;
    }
    case "total":{
      layout(field("purchase","매입 가격")+field("contribution","추가분담금 또는 청산금")+`<label class="field" for="direction">분담금 방향<select id="direction"><option value="pay">추가분담금 납부</option><option value="refund">돌려받는 금액</option></select></label>`+
        field("mortgage","매수 담보대출","만원","빈칸은 대출 없이 계산")+field("move-loan","이주비 대출","만원","빈칸은 대출 없이 계산")+
        field("deposit","분담금 계약금 비율","%")+field("middle","분담금 중도금 비율","%")+field("balance","분담금 잔금 비율","%")+field("cash","가진 현금"));
      let step=0;
      const labels=["매입","관리처분","이주","착공·중도금","입주·청산"];
      const descriptions=["매입 가격에서 매수 담보대출을 뺀 현금이에요. 세금·수수료는 별도예요.","이 단계에서 분담금이 정해질 수 있어요. 실제 납부 일정은 조합 계획을 확인하세요.","직접 입력한 이주비 대출을 받는 것으로 계산해요. 받은 대출은 입주 때 갚아요.","추가분담금의 계약금과 중도금을 납부하는 구간을 묶었어요.","분담금 잔금과 이주비 대출을 상환해요. 돌려받는 청산금은 이전고시 후의 값으로 같은 구간에 묶었어요."];
      const render=()=>{
        const out=g("calc-result"),refund=g("direction").value==="refund";
        ["deposit","middle","balance"].forEach(id=>{g(id).disabled=refund;});
        const message=invalid(["purchase","contribution","cash",...refund?[]:["deposit","middle","balance"]]);
        if(message){out.innerHTML=`<p class="empty" role="status">${esc(message)}</p>`;return;}
        const purchase=inputValue("purchase"),contribution=inputValue("contribution"),cash=inputValue("cash");
        const mortgage=inputValue("mortgage")??0,loan=inputValue("move-loan")??0;
        const ratios=["deposit","middle","balance"].map(id=>inputValue(id));
        if(mortgage>purchase||!refund&&Math.abs(ratios.reduce((s,n)=>s+n,0)-100)>.000001){
          out.innerHTML=`<p class="empty negative" role="status">${mortgage>purchase?"매수 담보대출은 매입 가격 이하여야 해요.":"분담금 납부 비율의 합을 100%로 맞춰주세요."}</p>`;return;
        }
        // 16차 8구간의 0현금 구간을 합친다. 청산금은 최종 구간에서만 차감.
        const flows=[purchase-mortgage,0,-loan,refund?0:contribution*(ratios[0]+ratios[1])/100,loan+(refund?-contribution:contribution*ratios[2]/100)];
        const cumulative=[];let sum=0;for(const value of flows){sum+=value;cumulative.push(sum);}
        const peak=Math.max(0,...cumulative),shortage=Math.max(0,peak-cash),total=purchase+(refund?-contribution:contribution);
        const current=zone?window.ZoneCore.stageState(zone):null;
        const stageNo=current?(current.done?4:current.last<0?0:current.last<4?1:current.last<5?2:current.last<9?3:4):-1;
        out.innerHTML=`<div class="result-top"><div><p class="source">매입부터 입주·청산까지 총투자금</p><output class="big-value" id="total-investment" data-value="${total}">${amount(total)}</output><p class="source">대출은 조달 수단 · 세금·수수료·이자는 별도</p></div><div><p class="source">현금으로 더 모아야 할 돈</p><output id="shortage" class="${shortage?"negative":"positive"}" data-value="${shortage}">${amount(shortage)}</output></div></div>`+
          `<div class="stops" role="group" aria-label="현금 단계">${labels.map((label,i)=>`<button type="button" class="stop${i<step?" done":""}${i===step?" sel":""}" data-step="${i}" aria-pressed="${i===step}"><i></i><b>${label}</b><small>${i===stageNo?"지금 · ":""}${flows[i]===0?"현금 납부 없음":amount(flows[i])}</small></button>`).join("")}</div>`+
          `<div class="det"><div><h2>${labels[step]}</h2><p class="why">${descriptions[step]}</p><p class="source">여기까지의 누적 필요 현금 ${amount(cumulative[step])}</p><div class="progress"><i style="width:${total>0?Math.max(0,Math.min(100,cumulative[step]/total*100)):0}%"></i></div><div class="pn"><button type="button" data-next="${step-1}"${step===0?" disabled":""}>← 이전 단계</button><span class="source">${step+1} / 5</span><button type="button" data-next="${step+1}"${step===4?" disabled":""}>다음 단계 →</button></div></div><div>${line(flows[step]<0?"이번에 들어오는 현금":"이번에 낼 현금",Math.abs(flows[step]),"stage-cash")}${line("이번 단계의 대출 수령",step===0?mortgage:step===2?loan:0)}${line("쌓인 필요 현금",cumulative[step],"cumulative-cash")}</div></div>`+
          `<div class="cash-check"><div><p>최대로 필요한 현금</p><b id="peak-cash" data-value="${peak}">${amount(peak)}</b></div><div><p>가진 현금</p><b>${amount(cash)}</b></div><div><p>더 모아야 할 돈</p><b class="${shortage?"negative":"positive"}">${amount(shortage)}</b></div></div><p class="source">선택 구역의 현재 단계와 별개로 매입부터 전체 흐름을 계산합니다. 빈 대출 항목은 0원으로 제외해요.</p>`;
        out.querySelectorAll("[data-step],[data-next]").forEach(b=>b.addEventListener("click",()=>{
          step=Number(b.dataset.step??b.dataset.next);render();
        }));
      };
      bind(render);break;
    }
    case "zones":{
      const api=window.ZoneCore;
      const fields=[["kind","종류"],["district","자치구"],["region","생활권"],["stage","현재 단계(날짜)"],["speed","진행 속도"],["move","입주 예상"],["transfer","조합원 지위 양도"],["regulations","규제 4칸"],["area","사업면적"],["existing","기존 세대"],["supply","공급계획(계획값)"],["station","가까운 역"],["linked","청약홈 연결 공고"]];
      host.innerHTML=`<div class="calc-layout compare-layout"><aside class="calc-inputs compare-inputs"><h2>비교하는 구역</h2><div id="compare-chosen"></div><form class="search" id="compare-search"><label class="field" for="compare-input">구역 더하기 · 최대 3곳</label><div class="search-row"><input id="compare-input" type="search" placeholder="구역 이름·주소" autocomplete="off"><button class="primary">추가</button></div><div data-results class="search-results" hidden></div></form><p class="source" role="status" id="compare-notice">구역 두 곳 이상을 골라보세요.</p><p class="source">매입가·분담금·미래 시세는 구역 자료에 없어 임의의 기본값이나 구역 간 금액 차이를 표시하지 않습니다.</p><a href="calc.html">내 조건으로 총투자금 계산 →</a></aside><section class="calc-output" id="compare-result" aria-live="polite"></section></div>${foot}`;
      let chosen=zone?[zone]:[],active=zone?.id||"",notice="";
      const stageLabels=["구역지정","추진위","조합설립","사업시행","관리처분","착공","준공·입주"];
      const stageOf=z=>{const s=Number(z.stageNo)||0;return s===0?-1:s<=5?s-1:s<=9?5:6;};
      const value=(v,key)=>key==="linked"?v.linked.length?v.linked.map(a=>a.name).join(" · "):"자료 없음":v[key];
      const render=()=>{
        g("compare-notice").textContent=notice||`${chosen.length} / 3곳 · 항목 값은 원본 패널과 같습니다.`;
        g("compare-chosen").innerHTML=chosen.map(z=>`<div class="compare-choice"><button type="button" data-active-zone="${esc(z.id)}" aria-pressed="${active===z.id}"><i></i><b>${esc(z.name)}</b><small>${esc(z.stageName||"단계 미상")}</small></button><button type="button" class="remove-zone" data-remove-zone="${esc(z.id)}" aria-label="${esc(z.name)} 비교에서 빼기">빼기</button></div>`).join("");
        const result=g("compare-result");
        if(!chosen.length){result.innerHTML='<p class="empty">왼쪽에서 실제 구역을 고르면 단계 줄과 비교 결과가 나와요.</p>';return;}
        const selected=chosen.find(z=>z.id===active)||chosen[0];active=selected.id;
        const values=chosen.map(api.panelValues),v=values[chosen.indexOf(selected)];
        const state=api.stageState(selected),stage=stageOf(selected);
        result.innerHTML=`<p class="source">선택한 실제 구역</p><h2 class="compare-hero">${esc(selected.name)}</h2><p class="source">${esc(selected.stageName||"단계 미상")} · ${esc(selected.sgg)} · 자료 ${window.ZONES_DATA.asof}</p>
          <div class="compare-stages" role="group" aria-label="구역별 현재 단계">${stageLabels.map((label,i)=>`<div class="compare-stage${stage===i?" selected":""}${chosen.some(z=>stageOf(z)===i)?" has-zone":""}"><div class="stage-names">${chosen.filter(z=>stageOf(z)===i).map(z=>`<button type="button" data-active-zone="${esc(z.id)}">${esc(z.name)}</button>`).join("")}</div><i></i><b>${label}</b></div>`).join("")}</div>
          <div class="det"><div><h2>${esc(selected.name)} · ${esc(selected.stageName||"단계 미상")}</h2><p class="why">${esc(v.speed)}</p><p class="source">단계 이름과 완료 날짜는 구분해 읽어주세요. 입주 예상은 같은 종류 구역의 저장된 날짜 표본을 쓴 추정입니다.</p><div class="progress"><i style="width:${Math.max(0,stage+1)/7*100}%"></i></div><p class="source">${state.last<0?"기록된 완료 날짜 없음":`마지막 완료 날짜 ${new Date(state.dates[state.last]).toISOString().slice(0,10)}`}</p><div class="pn"><button type="button" data-compare-next="-1"${chosen.length<2?" disabled":""}>← 이전 구역</button><span class="source">${chosen.indexOf(selected)+1} / ${chosen.length}</span><button type="button" data-compare-next="1"${chosen.length<2?" disabled":""}>다음 구역 →</button></div></div><div><div class="kv-row"><span>입주 예상</span><b>${esc(v.move)}</b></div><div class="kv-row"><span>지위 양도</span><b>${esc(v.transfer)}</b></div><div class="kv-row"><span>공급 계획</span><b>${esc(v.supply)}</b></div><a href="zone.html?zone=${encodeURIComponent(selected.id)}">구역 지도에서 보기 →</a></div></div>
          <div class="compare-summary">${chosen.map((z,i)=>`<div><p>${esc(z.name)}</p><b>${esc(z.stageName||"단계 미상")}</b><small>${esc(values[i].move)}</small></div>`).join("")}</div>
          <h3 class="section-title">같은 항목으로 나란히</h3><table class="compare-table"><thead><tr><th>비교 항목</th>${chosen.map(z=>`<th>${esc(z.name)}</th>`).join("")}</tr></thead><tbody>${fields.map(([key,label])=>`<tr data-compare-row="${key}"><th>${label}</th>${values.map(v=>`<td>${esc(value(v,key))}</td>`).join("")}</tr>`).join("")}</tbody></table>
          <div class="compare-cards">${chosen.map((z,i)=>`<section data-compare-zone="${esc(z.id)}"><h2>${esc(z.name)}</h2><dl>${fields.map(([key,label])=>`<dt>${label}</dt><dd data-card-field="${key}">${esc(value(values[i],key))}</dd>`).join("")}</dl></section>`).join("")}</div><p class="source">정보몽땅 자료 기준 ${window.ZONES_DATA.asof} · 16차 원본 패널 비교 함수 · 없는 값은 자료 없음</p>`;
      };
      window.JJ.search(g("compare-search"),z=>{
        if(chosen.some(x=>x.id===z.id))notice="이미 담은 구역이에요.";
        else if(chosen.length===3)notice="구역은 최대 3곳까지 비교할 수 있어요.";
        else{chosen.push(z);active=z.id;notice="";g("compare-input").value="";}
        render();
      });
      host.addEventListener("click",e=>{
        const pick=e.target.closest("[data-active-zone]"),remove=e.target.closest("[data-remove-zone]"),next=e.target.closest("[data-compare-next]");
        if(pick){active=pick.dataset.activeZone;render();}
        if(remove){chosen=chosen.filter(z=>z.id!==remove.dataset.removeZone);if(active===remove.dataset.removeZone)active=chosen[0]?.id||"";notice="";render();}
        if(next&&chosen.length){active=chosen[(chosen.findIndex(z=>z.id===active)+Number(next.dataset.compareNext)+chosen.length)%chosen.length].id;render();}
      });
      render();break;
    }
    default:throw new Error("알 수 없는 계산기: "+mode);
  }
  document.documentElement.dataset.calcReady="true";
})();
