(function () {
  "use strict";
  const {zones,esc,number}=window.JJ, data=window.ZONES_DATA;
  const labels=["후보지","구역지정·추진위","조합설립·사업시행","관리처분","착공·준공"];
  const counts=[0,0,0,0,0];
  for(const z of zones){const s=Number(z.stageNo)||0;counts[s===0?0:s<=2?1:s<=4?2:s<=7?3:4]++;}
  document.getElementById("total-count").textContent=number(zones.length);
  document.getElementById("hero-basis").textContent=`서울 정비사업 ${number(zones.length)}곳 · 자료 기준 ${data.asof}`;
  document.getElementById("stats-source").textContent=`${data.source} · 기준일 ${data.asof} · 단계5색 분류 기준`;
  document.getElementById("stage-counts").innerHTML=labels.map((label,i)=>`<li data-stage-band="${i}"><span><i style="--jj-stage:var(--jj-stage-${i})" aria-hidden="true"></i>${label}</span><b data-count="${counts[i]}">${number(counts[i])}곳</b></li>`).join("");
  const dated=zones.map(z=>({z,dates:(z.stages||[]).map(e=>typeof e==="string"?e:e?.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d||"")&&d<=data.asof)}))
    .filter(x=>x.dates.length).map(x=>({z:x.z,last:x.dates.sort().at(-1)})).sort((a,b)=>b.last.localeCompare(a.last));
  document.getElementById("recent-zones").innerHTML=dated.slice(0,5).map(({z,last})=>`<li><a href="zone.html?zone=${encodeURIComponent(z.id)}"><b>${esc(z.name)}</b><small>${esc(z.stageName||"단계 미상")} · ${last}</small></a></li>`).join("");
  const z=zones.find(z=>z.name.includes("양평13"))||zones[0];
  document.getElementById("example-link").href="zone.html?zone="+encodeURIComponent(z.id);
  document.getElementById("actual-example").innerHTML=`<p class="kicker">${esc(z.kind)} · ${esc(z.stageName||"단계 미상")}</p><h3>${esc(z.name)}</h3><p class="source">${esc(z.addr)}</p><div class="facts"><div class="kv-row"><span>현재 단계</span><b>${esc(z.stageName||"자료 없음")}</b></div><div class="kv-row"><span>공급 계획</span><b>${z.plan?.total==null?"자료 없음":number(z.plan.total)+"세대"}</b></div><div class="kv-row"><span>기준일</span><b>${data.asof}</b></div></div><p class="source">정보몽땅 저장 자료 · 공급은 계획값 · 투자 권유가 아닙니다.</p>`;
  const sources=[["서울특별시","정비사업 정보몽땅","구역·추진경과·공급 계획"],["국토교통부","실거래가 공개시스템","수집된 거래·법정동 참고 추이"],["국가법령정보센터","법령 원문","조문·지역 지정 공고"],["서울 열린데이터광장","OA-22712","경계 · 비상업·변경금지"]];
  document.getElementById("source-marquee").innerHTML=[...sources,...sources].map(([org,title,what],i)=>`<li${i>=sources.length?' aria-hidden="true"':""}><span class="org">${org}</span><b>${title}</b><span class="what">${what}</span></li>`).join("");
})();
