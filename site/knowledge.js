/* 지먹의 지식 자료·분류·원문 연결을 사용한다. */
(function(){
  "use strict";
  const {esc,normal}=window.JJ,kb=window.JAEJAE_KB,g=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search),initial=kb.items.find(i=>i.id===params.get("item"));
  let category=initial?.category||(kb.categories.some(c=>c.id===params.get("category"))?params.get("category"):""),query="",selected=initial?.id||"";
  g("kb-date").textContent=`저장된 지식 기준일 ${kb.asof} · 최신 법령 원문 재대조 전 참고 자료`;
  function answer(item){
    selected=item?.id||"";
    g("kb-answer").innerHTML=item?`<p class="source">${esc(item.applies)} · ${esc(item.stages.join(" / "))}</p><h2>${esc(item.title)}</h2><p>${esc(item.answer)}</p>`+
      (item.exceptions?`<details><summary>예외·적용 조건 · 원문 대조 전 참고</summary><p>${esc(item.exceptions)}</p><p class="source">이 문장만으로 개별 사안의 적용 여부를 단정하지 않습니다. 아래 원문과 조합·전문가 확인이 필요해요.</p></details>`:"")+
      `<h3>근거 조문</h3>${item.refs.map(ref=>{
        const article=ref.article.startsWith("부칙")?"":ref.article.match(/제\d+조(?:의\d+)?/)?.[0];
        const href="https://www.law.go.kr/법령/"+encodeURIComponent(ref.law.replace(/\s/g,""))+(article?"/"+encodeURIComponent(article):"");
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${esc(ref.law)} ${esc(ref.article)} ↗</a><blockquote>${esc(ref.quote)}</blockquote>`;
      }).join("")}<ul>${item.needs_check.map(s=>`<li>${esc(s)}</li>`).join("")}</ul><p class="source">자료 기준일 ${kb.asof} · 원문 링크의 현행·연혁과 개별 적용 요건을 확인하세요.</p><a href="calc.html">내 조건으로 계산해보기 →</a>`:'<p class="empty">일치하는 질문이 없어요. 다른 단어로 찾아보세요.</p>';
    g("kb-questions").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.item===selected)));
  }
  function render(){
    const items=kb.items.filter(item=>(!category||item.category===category)&&(!query||normal([item.title,...item.questions,item.answer].join(" ")).includes(normal(query))));
    g("kb-categories").innerHTML=[{id:"",name:"전체"},...kb.categories].map(c=>`<button type="button" data-category="${c.id}" aria-pressed="${c.id===category}">${esc(c.name)} <small>${c.id?kb.items.filter(i=>i.category===c.id).length:kb.items.length}</small></button>`).join("");
    g("kb-questions").innerHTML=items.map(item=>`<button type="button" data-item="${item.id}" aria-pressed="${item.id===selected}">${esc(item.title)}</button>`).join("");
    g("kb-count").textContent=items.length+"개 질문";
    answer(items.find(i=>i.id===selected)||items[0]);
  }
  g("kb-search").addEventListener("input",e=>{query=e.target.value;render();});
  g("kb-categories").addEventListener("click",e=>{const b=e.target.closest("[data-category]");if(b){category=b.dataset.category;selected="";render();}});
  g("kb-questions").addEventListener("click",e=>{const b=e.target.closest("[data-item]");if(b)answer(kb.items.find(i=>i.id===b.dataset.item));});
  render();
})();
