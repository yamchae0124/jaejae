/* 지먹18c-2 표시·산식 그대로. */
(function () {
'use strict';
const api=window.ZoneCore, esc=window.JJ.esc;
const number=(n)=>Number(n).toLocaleString('ko-KR');
const tradeKinds={villa:'빌라',detached:'단독',land:'토지'};
const monthSerial=(month)=>Number(month.slice(0,4))*12+Number(month.slice(5,7));
  function permitHtml(z) {
    if (!api.regionOf(z)) return "";
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
    const active = today >= "2025-10-20" && today <= "2026-12-31";
    const original = "https://land.seoul.go.kr/land/other/downloadAppointPbancFile.do?fileUuid=59d9172df7ab0038e063621d0f8d00381085112";
    return `<h4>토지거래허가</h4><dl class="jj-permit"><div><dt>아파트</dt><dd><span class="${active ? "jj-permit-required" : ""}">${active ? '<i aria-hidden="true"></i>허가 필요' : "지정기간 밖 · 최신 공고 확인"}</span></dd></div>` +
      `<div><dt>빌라</dt><dd>${active ? "일부 지번만 허가 필요 · 토지이음 확인" : "지정기간 밖 · 최신 공고 확인"}</dd></div></dl>` +
      `<p class="zp-foot jj-permit-source">국토교통부 공고 제2025-1219호 · 서울 25구 · 2025-10-20~2026-12-31 · 확인일 2026-11-06<br>` +
      `연립·다세대는 공고 붙임2 지번만 해당합니다. 공고의 기준면적 등 허가 요건과 별도·중첩 지정이 있어 개별 필지 확정은 <a href="https://www.eum.go.kr/" target="_blank" rel="noopener noreferrer">토지이음</a>에서 확인하세요.<br>` +
      `<a href="${original}" target="_blank" rel="noopener noreferrer">공고 원문(서울부동산정보광장)</a></p>`;
  }
  function monthlyLine(rows, label) {
    if (!rows.length) return '<p class="zp-foot">해당 법정동·기간에 유효한 거래가 없습니다.</p>';
    const first = monthSerial(rows[0][0]), last = monthSerial(rows.at(-1)[0]);
    const values = rows.map((row) => row[2]), low = Math.min(...values), high = Math.max(...values);
    const pad = Math.max((high - low) * .1, high * .05, 1), min = Math.max(0, low - pad), max = high + pad;
    const x = (row) => 64 + (monthSerial(row[0]) - first) / Math.max(1, last - first) * 320;
    const y = (row) => 174 - (row[2] - min) / (max - min) * 148;
    const path = rows.map((row, i) => `${i && monthSerial(row[0]) - monthSerial(rows[i - 1][0]) === 1 ? "L" : "M"}${x(row).toFixed(2)},${y(row).toFixed(2)}`).join(" ");
    const grid = [0, .5, 1].map((part) => {
      const py = 174 - part * 148, value = Math.round(min + part * (max - min));
      return `<line x1="60" x2="384" y1="${py}" y2="${py}" class="jj-chart-grid"/><text x="54" y="${py + 5}" text-anchor="end">${number(value)}</text>`;
    }).join("");
    const ticks = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];
    return `<svg class="jj-monthly-line" viewBox="0 0 400 212" role="img" aria-label="${esc(label)} 평당가 월별 중앙값" data-points="${rows.length}">` +
      `${grid}<path d="${path}" class="jj-chart-line"/>` + rows.map((row) =>
        `<circle class="jj-month-point" cx="${x(row)}" cy="${y(row)}" r="3.5" data-month="${row[0]}" data-count="${row[1]}" data-median="${row[2]}"><title>${row[0]} · ${number(row[2])}만원/평 · ${number(row[1])}건</title></circle>`).join("") +
      ticks.map((index) => `<text x="${x(rows[index])}" y="202" text-anchor="${index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"}">${rows[index][0].slice(2).replace("-", ".")}</text>`).join("") + `</svg>`;
  }
  function tradePanelHtml(bundle, zone, kind, range) {
    const item = bundle.zones[zone.id];
    if (!item?.dong) return '<p class="zp-foot">구역 주소에서 법정동을 확정하지 못해 추이를 계산하지 않았습니다.</p>';
    const end = monthSerial(bundle.asof.slice(0, 7)), span = range === "all" ? Infinity : Number(range);
    const rows = (bundle.dongs[item.dong]?.[kind] || []).filter((row) => monthSerial(row[0]) > end - span);
    const count = rows.reduce((sum, row) => sum + row[1], 0), label = tradeKinds[kind];
    const controls = (name, values, selected) => `<div class="jj-trade-controls" role="group" aria-label="${name === "kind" ? "거래 유형" : "거래 기간"}">` +
      values.map(([value, text]) => `<button type="button" data-${name}="${value}" aria-pressed="${value === selected}">${text}</button>`).join("") + `</div>`;
    return controls("kind", Object.entries(tradeKinds), kind) +
      controls("range", [["12", "1년"], ["36", "3년"], ["all", "전체"]], range) +
      `<p class="jj-trade-scope"><b>법정동 기준 근사</b> · ${esc(item.dong)}<br>${item.boundary ? "구역 주소 법정동 기준 · 경계 교차 법정동 미확인" : "경계 자료 없음 · 구역 주소 법정동 기준"}</p>` +
      `<p class="jj-trade-total">${label} <strong>${number(count)}</strong>건 <span>평당가 월별 중앙값 · 만원/평</span></p>` +
      monthlyLine(rows, label) +
      `<p class="zp-foot">${esc(bundle.basis[kind])} 기준 · 수집 범위 ${bundle.period[0].slice(0, 4)}.${bundle.period[0].slice(4)}~${bundle.period[1].slice(0, 4)}.${bundle.period[1].slice(4)}<br>` +
      `기준일 ${esc(bundle.asof)} · ${esc(bundle.source)}<br>해제 거래 제외 · 같은 조건의 별개 거래는 원문 행 수 그대로 집계 · 신고 지연으로 최근 월은 적을 수 있습니다.</p>` +
      (kind === "villa" && item.boundary ? `<p class="zp-foot jj-spatial-limit">연립 지번은 전부 공개됐지만 필지 좌표 자료가 없어 「구역 안 거래」는 계산하지 못했습니다. 위 선은 법정동 참고 추이입니다.</p>` : "") +
      `<details class="jj-monthly-table"><summary>월별 거래 내역</summary><table><thead><tr><th>월</th><th>거래</th><th>중앙값(만원/평)</th></tr></thead><tbody>` +
      rows.map((row) => `<tr><td>${row[0]}</td><td>${number(row[1])}건</td><td>${number(row[2])}</td></tr>`).join("") + `</tbody></table></details>`;
  }

window.MonthlyPanel={permitHtml,tradePanelHtml};
})();
