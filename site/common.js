/* 빌드 없이 읽는 공통 메뉴와 공개 자료 전송. */
(function () {
  "use strict";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const number = (n) => Number(n).toLocaleString("ko-KR");
  const normal = (s) => String(s || "").replace(/\s/g, "").toLowerCase();
  const zones = window.ZONES_DATA?.zones || [];
  const file = location.pathname.split("/").pop() || "index.html";
  const header = document.querySelector("[data-header]");
  if (header) header.innerHTML = `<a class="logo" href="index.html">재재이야</a><nav class="nav" aria-label="주 메뉴">` +
    [["knowledge.html","재재 지식"],["calc.html","계산기"],["zone.html","구역 지도"],["ai.html","재재 AI"]].map(([href,title]) =>
      `<a href="${href}"${(file.startsWith("calc") ? href === "calc.html" : file === href) ? ' aria-current="page"' : ""}>${title}</a>`).join("") + "</nav>";
  document.querySelectorAll("[data-footer]").forEach((el) => {
    el.innerHTML = `<a href="index.html">재재이야</a><span>투자 권유가 아닌 계산</span><a href="출처.html">자료 출처·이용 조건</a>`;
  });
  const pending = new Map();
  async function data(path) {
    if (location.protocol !== "file:") {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`자료를 읽지 못했습니다: ${path} (${response.status})`);
      return response.json();
    }
    if (!pending.has(path)) pending.set(path, new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = path.replace(/\.json$/, ".js");
      script.onload = () => { script.remove(); resolve(window.LOCAL_DATA[path]); };
      script.onerror = () => { script.remove(); reject(new Error("자료를 읽지 못했습니다: " + path)); };
      document.head.append(script);
    }));
    return pending.get(path);
  }
  function readLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (error) { if (error instanceof Error) return fallback; throw error; }
  }
  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { if (!(error instanceof Error)) throw error; }
  }
  const recentKey = "jaejae.recent-zones.v1";
  const recentZones = () => {
    const ids = readLocal(recentKey, []);
    return Array.isArray(ids) ? ids.map(id => zones.find(z => z.id === id)).filter(Boolean).slice(0, 3) : [];
  };
  function rememberZone(z) {
    writeLocal(recentKey, [z.id, ...recentZones().filter(item => item.id !== z.id).map(item => item.id)].slice(0, 3));
  }
  function search(form, onChoose, onQuestion) {
    const input = form.querySelector("input"), output = form.querySelector("[data-results]");
    const notice = document.createElement("p");
    notice.className = "search-notice";
    notice.setAttribute("role", "status");
    notice.hidden = true;
    form.append(notice);
    let matches = [];
    const render = (showRecent = false) => {
      const q = normal(input.value);
      notice.hidden = true;
      const found = q ? zones.filter((z) => normal(z.name + z.addr).includes(q)) : [];
      if (q && file === "index.html") {
        const rank = (z) => { const name = normal(z.name); return name === q ? 3 : name.startsWith(q) ? 2 : name.includes(q) ? 1 : 0; };
        found.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name, "ko", { numeric: true }));
      }
      matches = q ? found.slice(0, 8) :
        showRecent && file === "index.html" ? recentZones() : [];
      output.hidden = !q && !matches.length;
      output.innerHTML = (!q && matches.length ? "<p>최근 본 구역</p>" : "") +
        matches.map((z) => `<button type="button" data-zone="${esc(z.id)}"><b>${esc(z.name)}</b><small>${esc(z.sgg)} · ${esc(z.stageName || "단계 미상")}</small></button>`).join("") +
        (q && !matches.length ? `<p>${onQuestion ? "구역 이름이 아니면 보내기를 눌러 자료에서 답을 찾아보세요." : "일치하는 구역이 없어요. 이름이나 주소를 다시 넣어주세요."}</p>` : "");
    };
    input.addEventListener("input", () => render());
    input.addEventListener("focus", () => render(true));
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { output.hidden = true; notice.hidden = true; input.value = ""; } });
    document.addEventListener("pointerdown", (e) => { if (!form.contains(e.target)) output.hidden = true; });
    output.addEventListener("click", (e) => {
      const b = e.target.closest("[data-zone]");
      if (!b) return;
      output.hidden = true; onChoose(zones.find((z) => z.id === b.dataset.zone));
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault(); render();
      if (!input.value.trim()) {
        output.hidden = true; notice.textContent = "구역 이름을 입력해 주세요"; notice.hidden = false;
      }
      else if (matches.length) { output.hidden = true; onChoose(matches[0]); }
      else if (input.value.trim() && onQuestion) onQuestion(input.value.trim());
    });
  }
  function regHtml(z, flag, REG) {
    const items = window.REGULATIONS;
    return `<div class="zp-reg">${items.map((r) => {
      const v = flag(REG[r.set], z.sgg);
      return `<div class="${v === true ? "on" : v === null ? "unk" : ""}" data-reg="${r.id}" data-verified="${r.verified}"><b class="zp-reg-name">${r.label}</b><span><i aria-hidden="true"></i>${v === true ? "적용" : v === null ? "확인 필요" : "미적용"}</span></div>`;
    }).join("")}</div><div class="reg-bases">${items.map((r) =>
      `<details><summary>${r.label} · 원문 확인일 ${r.checked}</summary><p>${esc(r.basis)}</p>${r.links.map(([label,url]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join(" · ")}</details>`).join("")}</div>
      <p class="zp-foot">이후 추가 지정·해제는 국토부·기재부 공고로 확인하세요. 확인일은 위 공고의 원문 확인일이며, 이후 변경이 없음을 보증하지 않습니다. 목록에 없는 지역은 「미적용」, 시 단위만 알면 「확인 필요」입니다. 토지거래허가는 필지·면적·용도 등에 따라 별도 판단합니다.</p>`;
  }
  window.JJ = { esc, number, normal, zones, data, search, regHtml, readLocal, writeLocal, rememberZone };
  document.querySelectorAll("[data-zone-search]").forEach((form) => search(form, (z) => {
    location.href = "zone.html?zone=" + encodeURIComponent(z.id);
  }, file === "index.html" ? (question) => {
    const safe=question.replace(/\bsk-[\w-]+|\bAIza[\w-]+/g,"[열쇠 제외]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[이메일 제외]")
      .replace(/0?1[016789][- .]?\d{3,4}[- .]?\d{4}\b/g,"[전화번호 제외]");
    location.href = "ai.html?q=" + encodeURIComponent(safe);
  } : null));
  document.documentElement.dataset.ready = "true";
})();
