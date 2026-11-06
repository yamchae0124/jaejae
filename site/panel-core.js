/* 지먹 map_leaflet.html의 패널 생산 함수 이관. */
(function () {
'use strict';
const esc = window.JJ.esc;
const trInk = () => '#4E5968';
  const norm = (s) => String(s || "").replace(/\s+/g, "");
  const SIDO = { "서울특별시": "서울", "서울시": "서울", "경기도": "경기", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남", "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주" };
  const PROVINCES = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
  const key = (s) => norm(s).replace(/시/g, "");
  function parseSgg(s) {
    const tokens = String(s).trim().split(/\s+/);
    let province = SIDO[tokens[0]] || (PROVINCES.includes(tokens[0]) ? tokens[0] : ""), rest = tokens.slice(1).join("");
    if (!province && tokens.length === 1) {
      const name = Object.keys(SIDO).find((n) => n !== "서울시" && tokens[0].startsWith(n));
      if (name) { province = SIDO[name]; rest = tokens[0].slice(name.length); }
    }
    return province ? { province, rest, restKey: rest.replace(/시/g, "") } : null;
  }
  const num = (n) => (n == null ? "–" : Number(n).toLocaleString());
  const nz = (v, decimal = false) => {
    if (v == null || (typeof v !== "number" && typeof v !== "string") || (typeof v === "string" && !/^\s*\d+(\.\d+)?\s*$/.test(v))) return null;
    const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 1e7 && (decimal || Number.isInteger(n)) ? n + 0 : null;
  };
  // 정비사업 정보몽땅 「추진경과」 분류(2026-11-03 Sol 조사 · 원문 단계명) — 이름이 있다고 해당 단계를 마친 것은 아니다
  const STAGES = ["정비구역지정", "조합설립추진위원회승인", "조합설립인가", "사업시행인가", "관리처분인가", "이주", "철거신고", "착공신고", "일반분양승인", "준공인가", "이전고시"];

  // ── 규제 4칸 — 국토부 공고 지역 목록(시군구 이름 기준 · 코드표 매핑 오류를 피하려고 이름으로 비교) ──
  const SEOUL = "종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구".split(" ").map((n) => "서울" + n);
  const GG = ["과천시", "광명시", "의왕시", "하남시", "구리시", "성남시분당구", "성남시수정구", "성남시중원구", "수원시영통구", "수원시장안구", "수원시팔달구", "안양시동안구", "용인시수지구", "용인시기흥구", "화성시동탄구"].map((n) => "경기" + n);
  const FOUR = ["서울강남구", "서울서초구", "서울송파구", "서울용산구"];
  const GG_NAMES = "수원 성남 의정부 안양 부천 광명 평택 동두천 안산 고양 과천 구리 남양주 오산 시흥 군포 의왕 하남 용인 파주 이천 안성 김포 화성 광주 양주 포천 여주 연천 가평 양평".split(" ").map(key);
  const REG = {
    asof: "2026-11-06",
    adj: new Set(SEOUL.concat(GG).map(key)), // 조정대상지역 · 투기과열지구(같은 목록)
    four: new Set(FOUR.map(key)),           // 소득세법상 투기지역 · 민간택지 분양가상한제 지정지역(같은 4구)
  };
  // true 적용 · false 미적용 · null 확인 필요(시 단위만 알고 일반구를 모를 때 등)
  function flag(set, sgg) {
    const p = parseSgg(sgg); if (!p) return null;
    const n = p.province + p.restKey;
    if (set.has(n)) return true;
    for (const x of set) if (n.startsWith(x)) return true;
    for (const x of set) if (x.startsWith(n)) return null;
    if (p.province === "서울") return SEOUL.some((x) => p.restKey.startsWith(x.slice(2))) ? false : null;
    if (p.province === "경기") return GG_NAMES.some((x) => p.restKey.startsWith(x)) ? false : null;
    return /^[가-힣]{1,6}(시|군|구)/.test(p.rest) ? false : null;
  }

  // ── 공급 계획 ──
  function bldg(u, gn, r) {
    const tot = u + gn + r, H = 140, y0 = 30;
    if (!Number.isFinite(tot) || tot <= 0) return "";
    const hu = Math.round(H * u / tot), hr = Math.min(H - hu, Math.round(H * r / tot)), hg = Math.max(0, H - hu - hr);
    return `<svg class="zp-bldg" viewBox="0 0 132 206" role="img" aria-label="공급 구성 막대 건물 그림 — 위부터 조합원분양, 일반분양, 임대">` +
      `<defs><pattern id="zpWin" width="14" height="12" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="8" height="6" fill="#fff" fill-opacity=".38"/></pattern></defs>` +
      `<rect x="30" y="${y0}" width="72" height="${hu}" fill="#16A34A"/><rect x="30" y="${y0 + hu}" width="72" height="${hg}" fill="#0071E3"/><rect x="30" y="${y0 + hu + hg}" width="72" height="${hr}" fill="#8B95A1"/>` +
      `<rect x="30" y="${y0}" width="72" height="${H}" fill="url(#zpWin)"/><rect x="24" y="${y0 - 8}" width="84" height="8" fill="#4E5968"/>` +
      `<rect x="56" y="${y0 + H - 22}" width="20" height="22" fill="#fff" fill-opacity=".85"/><rect x="10" y="${y0 + H}" width="112" height="6" fill="#E5E8EB"/>` +
      `<circle cx="16" cy="${y0 + H - 12}" r="10" fill="#86C99C"/><circle cx="116" cy="${y0 + H - 12}" r="10" fill="#86C99C"/></svg>`;
  }
  function supplyHtml(z) {
    const p = z.plan;
    if (!p || ![p.total, p.sale, p.rent].some((v) => nz(v) > 0)) return `<div class="zp-card zp-foot" style="margin:0">공급계획 자료가 없습니다</div>`;
    const sale = nz(p.sale), rent = nz(p.rent), sum = sale != null && rent != null ? sale + rent : null;
    const total = p.total === null ? null : nz(p.total) ?? (Number.isFinite(sum) ? sum : null);
    if (sale == null || rent == null) return `<div class="zp-card zp-foot" style="margin:0">분양·임대 세대수가 모자라 공급 구성을 그릴 수 없습니다${total != null ? ` · 총 공급세대 ${esc(num(total))}세대` : ""}</div>`;
    const owners = nz(z.owners), known = owners != null && owners > 0;
    const union = known ? Math.min(owners, sale) : null, gen = known ? sale - union : null;
    const pc = (n) => (total > 0 ? Math.round(n / total * 100) + "%" : "–");
    const row = (cls, color, lb, n) => `<div class="zp-row"><span class="zp-sw" style="background:${color}"></span><div class="zp-rc"><div class="lb">${lb}</div><div class="nn"><span class="n">${num(n)}<small>세대</small></span><span class="p">${pc(n)}</span></div></div></div>`;
    const rows = known
      ? row("u", "#16A34A", "조합원분양(추정)", union) + row("g", "#0071E3", "일반분양(추정)", gen) + row("r", "#8B95A1", "임대", rent)
      : row("s", "#0071E3", "분양(조합원+일반)", sale) + row("r", "#8B95A1", "임대", rent);
    const art = (known ? bldg(union, gen, rent) : bldg(0, sale, rent)) || `<div class="zp-foot">공급세대 합계가 유효하지 않아 공급 구성을 그릴 수 없습니다.</div>`;
    const line = known ? `<div class="zp-foot" style="margin-top:12px">토지등소유자 ${esc(num(owners))}명${union > 0 ? ` · 일반분양은 소유자 대비 ${esc(Math.round(gen / union * 100))}%` : ""}</div>` : `<div class="zp-foot" style="margin-top:12px">토지등소유자 수 미확인 · 조합원·일반분양은 토지등소유자 수(정보몽땅 화면에만 공개)를 몰라 나누지 않았습니다.</div>`;
    const warning = (total != null && total !== sale + rent ? `<div class="zp-foot">합계와 분양+임대가 다릅니다(원자료) · 총 공급세대(${esc(num(total))})와 분양+임대(${esc(num(sale + rent))})가 다릅니다</div>` : "") +
      (known && owners > sale ? `<div class="zp-foot">토지등소유자 수가 분양 총량보다 많아 일반분양을 0으로 둡니다</div>` : "");
    const tip = `<div class="zp-tip"><div style="font-size:20px;line-height:1"></div><div><b>일반분양 비중이 클수록 사업성이 좋아지는 편입니다</b><p>조합원분양은 토지등소유자 수를 그대로 쓴 추정값이고, 일반분양은 분양 전체에서 그 수를 뺀 값입니다. 실제 분양 대상 조합원 수나 인가 내용과 다를 수 있습니다. 공급세대도 계획값이라 인가 변경에 따라 달라집니다.</p></div></div>`;
    const tbl = (title, arr, expect) => {
      if (!Array.isArray(arr) || !arr.length) return "";
      arr = arr.filter((x) => x != null).map((x) => ({ l: x.l, n: nz(x.n) })).filter((x) => x.n != null);
      if (!arr.length) return "";
      const s = arr.reduce((a, b) => a + b.n, 0);
      return `<div class="zp-card" style="margin-top:10px"><h4 style="font-size:13px;margin-bottom:6px">${title}</h4><table><thead><tr><th>전용면적</th><th>세대수</th></tr></thead><tbody>` +
        arr.map((x) => `<tr><td>${esc(x.l)}</td><td><b>${num(x.n)}</b>세대</td></tr>`).join("") +
        `<tr><td>합계</td><td><b>${num(s)}</b>세대${s !== expect ? ` <span style="color:var(--sem-risk)">· 전체 ${num(expect)}과 다름</span>` : ""}</td></tr></tbody></table></div>`;
    };
    return `<div class="zp-card"><div class="zp-sup">${art}<div class="zp-sup-r"><div class="zp-tot">총 공급세대<b>${total == null ? "자료 없음" : num(total) + "<small>세대</small>"}</b></div>${rows}</div></div>${line}</div>${warning}${tip}` +
      tbl("분양 · 전용면적별", p.types && p.types.sale, sale) + tbl("임대 · 전용면적별", p.types && p.types.rent, rent);
  }

  // 날짜 쌍 통계와 권역 집계는 전체 공개 자료에서 한 번만 만든다. 원자료 날짜는 바꾸지 않는다.
  const MONTH_MS = 86400000 * 365.25 / 12;
  const REGIONS = {
    "도심권": "종로구 중구 용산구", "동북권": "성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구",
    "서북권": "은평구 서대문구 마포구", "서남권": "양천구 강서구 구로구 금천구 영등포구 동작구 관악구",
    "동남권": "서초구 강남구 송파구 강동구",
  };
  function dateMs(entry) {
    const d = typeof entry === "string" ? entry : entry && entry.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return null;
    const ms = Date.parse(d + "T00:00:00Z");
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === d ? ms : null;
  }
  function regionOf(z) {
    const p = parseSgg(z.sgg);
    return p && p.province === "서울" ? Object.keys(REGIONS).find((r) => REGIONS[r].split(" ").includes(p.rest)) || null : null;
  }
  function percentile(sorted, p) {
    if (!sorted.length) return null;
    const at = (sorted.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
  }
  let stageMemo = null;
  function stageStatistics() {
    if (stageMemo) return stageMemo;
    const pairs = new Map(), regions = Object.fromEntries(Object.keys(REGIONS).map((r) => [r, { kinds: {}, steps: [0, 0, 0, 0, 0, 0] }]));
    for (const z of (window.ZONES_DATA && window.ZONES_DATA.zones) || []) {
      const region = regionOf(z);
      if (z.demo || !region) continue;
      const group = regions[region];
      group.kinds[z.kind] = (group.kinds[z.kind] || 0) + 1;
      group.steps[Math.max(0, Math.min(5, Math.trunc(Number(z.stageNo) || 0)))]++;
      const dates = STAGES.map((_, i) => dateMs((z.stages || [])[i]));
      for (let j = 0; j < dates.length; j++) for (let i = j + 1; i < dates.length; i++) {
        if (j === 0 && i === 1 || dates[j] == null || dates[i] == null || dates[i] <= dates[j]) continue;
        const k = z.kind + ":" + j + ":" + i;
        if (!pairs.has(k)) pairs.set(k, []);
        pairs.get(k).push((dates[i] - dates[j]) / MONTH_MS);
      }
    }
    for (const [k, values] of pairs) {
      values.sort((a, b) => a - b);
      pairs.set(k, { n: values.length, median: percentile(values, .5), q25: percentile(values, .25), q75: percentile(values, .75) });
    }
    stageMemo = { pairs, regions };
    return stageMemo;
  }
  function pairStats(kind, from, to) {
    const s = stageStatistics().pairs.get(kind + ":" + from + ":" + to);
    return s && s.n >= 10 ? s : null;
  }
  function stageState(z) {
    const dates = STAGES.map((_, i) => dateMs((z.stages || [])[i]));
    let last = -1;
    dates.forEach((d, i) => { if (d != null) last = i; });
    const asof = dateMs(window.ZONES_DATA && window.ZONES_DATA.asof);
    return { dates, last, done: dates[9] != null || dates[10] != null,
      elapsed: last < 0 || asof == null ? null : Math.max(0, (asof - dates[last]) / MONTH_MS), asof };
  }
  function durationPath(kind, from, target) {
    if (from >= target) return [];
    for (let to = from + 1; to <= target; to++) {
      const s = pairStats(kind, from, to);
      if (!s) continue;
      const rest = durationPath(kind, to, target);
      if (rest) return [{ ...s, from, to }, ...rest];
    }
    return null;
  }
  function remainingMonths(z, target = 9) {
    if (z.demo) return null;
    const state = stageState(z);
    if (state.last < 0 || state.last >= target || state.elapsed == null) return null;
    const path = durationPath(z.kind, state.last, target);
    if (!path) return null;
    const sum = (field) => path.reduce((total, s, i) => total + Math.max(0, s[field] - (i === 0 ? state.elapsed : 0)), 0);
    const widest = path.reduce((a,b) => b.q75-b.q25 > a.q75-a.q25 ? b : a);
    return { median: sum("median"), q25: sum("q25"), q75: sum("q75"), asof: state.asof,
      overrun: state.elapsed > path[0].median,
      spread: { from: STAGES[widest.from], to: STAGES[widest.to], q25: widest.q25, q75: widest.q75 } };
  }
  const pace = (months, median) => months <= median * .8 ? "빠른 편" : months <= median * 1.2 ? "중앙값 수준" : "느린 편";
  let moveMemo;
  function renewalMoveStatistics() {
    if (moveMemo !== undefined) return moveMemo;
    const first = new Map();
    for (const a of (window.APPLYHOME_DATA && window.APPLYHOME_DATA.items) || []) {
      if (!/^서울(?:특별시|시)?\s/.test(a.addr || "") || !a.flags || a.flags.renewal !== true ||
        /보류지|취소분|잔여|무순위|추가|재공급|취소후|임의공급|계약취소/.test(a.name) || !a.dates.notice || !a.moveIn) continue;
      const key = a.name.replace(/\([^)]*\)|\s+/g,""), old = first.get(key);
      if (!old || a.dates.notice < old.dates.notice) first.set(key,a);
    }
    const values = [...first.values()]
      .map((a) => {
        const from = dateMs(a.dates && a.dates.notice), to = dateMs(a.moveIn ? a.moveIn + "-01" : null);
        return from != null && to != null && to > from ? (to-from)/MONTH_MS : null;
      }).filter((n) => n != null && n >= 12).sort((a,b) => a-b);
    moveMemo = values.length >= 10 ? { n: values.length, median: percentile(values,.5),
      q25: percentile(values,.25), q75: percentile(values,.75) } : null;
    return moveMemo;
  }
  function moveEstimate(z) {
    const stats = renewalMoveStatistics(), state = stageState(z);
    if (!stats || z.demo || state.done || state.asof == null) return null;
    const spread = { from: "모집공고", to: "입주예정", q25: stats.q25, q75: stats.q75 };
    const construction = state.dates[7];
    if (construction != null) {
      const elapsed = Math.max(0,(state.asof-construction)/MONTH_MS);
      return { median: Math.max(0,stats.median-elapsed), q25: Math.max(0,stats.q25-elapsed),
        q75: Math.max(0,stats.q75-elapsed), asof: state.asof, overrun: elapsed >= stats.median, basis: "applyhome", spread };
    }
    const before = remainingMonths(z,7);
    if (before) return { median: before.median+stats.median, q25: before.q25+stats.q25,
      q75: before.q75+stats.q75, asof: before.asof, overrun: before.overrun, basis: "applyhome",
      spread: before.spread.q75-before.spread.q25 >= spread.q75-spread.q25 ? before.spread : spread };
    const observed = remainingMonths(z);
    return observed ? { ...observed, basis: "stages" } : null;
  }
  const durationLabel = (months) => "약 " + Math.round(months < 12 ? months : months / 12) + (months < 12 ? "개월" : "년");
  function transferStatus(z) {
    const regulated = flag(REG.adj, z.sgg);
    if (regulated === false) return { label: "제한 없음", detail: "투기과열지구가 아님" };
    if (regulated == null || !["재건축", "재개발"].includes(z.kind)) return { label: "확인 필요", detail: "" };
    const rebuild = z.kind === "재건축", index = rebuild ? 2 : 4, name = rebuild ? "조합설립인가" : "관리처분인가";
    const state = stageState(z), step = z.stageNo == null || z.stageNo === "" ? NaN : Number(z.stageNo);
    if (state.last >= index || step > index + 1) {
      const permit = dateMs((z.stages || [])[3]);
      const transitional = !rebuild && permit != null && permit < dateMs("2018-01-24");
      return { label: transitional ? "제한(경과규정 확인 필요)" : "제한",
        detail: transitional ? "2018.1.24 전에 사업시행인가를 신청한 구역은 이 제한이 적용되지 않을 수 있습니다" : name + " 후 양수하면 조합원 자격 없음 · 예외 있음" };
    }
    if (!Number.isInteger(step) || step < 0 || step > index) return { label: "확인 필요", detail: "" };
    const left = rebuild ? null : remainingMonths(z, 4);
    return { label: name + " 전까지 가능", detail: left ? left.median <= 0 ? "남은 기간 추정 불가(중앙값 넘김)" : durationLabel(left.median) + " 남음(추정)" : "" };
  }
  function moveSummary(z) {
    const state = stageState(z), s = state.last < 0 ? null : pairStats(z.kind, state.last, state.last + 1);
    const left = state.done ? null : moveEstimate(z);
    const overrun = !state.done && (left && left.overrun || s && state.elapsed > s.median);
    const year = (m) => new Date(left.asof + m * MONTH_MS).getUTCFullYear();
    const wide = left && left.q75 - left.q25 >= 120;
    const range = left && left.median > 0 ? wide ? `구역마다 편차가 큼(${year(left.q25)}~${year(left.q75)})` : `${year(left.q25)}~${year(left.q75)}년` : "";
    return `<b>${state.done ? "완료" : left ? left.median <= 0 ? "남은 기간 추정 불가(중앙값 넘김)" : durationLabel(left.median) + " 후" : "계산 불가"}</b><p>${range ? `<span>${range}</span>` : ""}${overrun ? (left ? "<br>" : "") + "진행 중 단계가 중앙값 기간을 넘겨 그 몫은 0으로 계산" : ""}</p>`;
  }
  function summaryHtml(z) {
    if (z.demo) return "";
    const state = stageState(z), s = state.last < 0 ? null : pairStats(z.kind, state.last, state.last + 1);
    const speed = state.done ? "완료" : state.elapsed == null ? "자료 없음" : s ? state.elapsed <= s.median ? "중앙값 이내" : "중앙값 넘김" : "비교 표본 부족";
    const elapsed = !state.done && state.elapsed != null ? `<span class="zp-unit">${Math.floor(state.elapsed)}개월째</span>` + (s ? ` · 중앙값 <span class="zp-unit">${Math.round(s.median)}개월</span> · 표본 <span class="zp-unit">${s.n}곳</span>` : "") : "";
    const left = state.done ? null : moveEstimate(z), moveStats = renewalMoveStatistics();
    const wide = left && left.q75-left.q25 >= 120;
    const spreadTip = wide && left.spread ? ` 가장 편차가 큰 단계: ${esc(left.spread.from)}→${esc(left.spread.to)}(25~75% 구간 ${left.spread.q25.toFixed(1)}~${left.spread.q75.toFixed(1)}개월)` : "";
    const transfer = transferStatus(z);
    return `<div class="zp-summary">` +
      `<div class="zp-metric${document.body.classList.contains("mode-jaejae") && speed === "중앙값 이내" ? " jj-positive" : ""}" data-metric="speed"><span>진행 속도</span><b>${speed}</b><p>${elapsed}</p></div>` +
      `<div class="zp-metric" data-metric="move"><span>입주 예상</span>${moveSummary(z)}<details><summary>계산 기준 ⓘ</summary>${left && left.basis === "stages" ? "착공까지 경로는 분리할 수 없지만 준공까지의 실제 날짜 쌍 표본이 있어 기존 준공 경로의 중앙값 합을 썼습니다." : `착공까지는 서울 정비사업 정보몽땅의 같은 종류 구역 단계별 소요 기간 중앙값 합을 씁니다. 가정: 착공 무렵 일반분양을 한다. 착공 이후는 청약홈 서울 정비사업 공고 ${moveStats ? moveStats.n : 0}건의 모집공고→입주예정 중앙값을 더하고, 착공 날짜가 있으면 경과 기간을 뺍니다. 보류지·취소분·잔여·무순위 공고, 12개월 미만 제외 · 단지당 첫 공고(추가모집도 제외).`} 범위는 각 구간 25·75백분위의 합입니다. 사업마다 크게 다르며 예측이 아닙니다.${spreadTip}</details></div>` +
      `<div class="zp-metric${document.body.classList.contains("mode-jaejae") ? transfer.label.includes("가능") || transfer.label === "제한 없음" ? " jj-positive" : transfer.label.startsWith("제한") ? " jj-critical" : "" : ""}" data-metric="transfer"><span>조합원 지위 양도</span><b>${transfer.label}</b><p>${transfer.detail}</p><details><summary>법령과 예외 ⓘ</summary>도시 및 주거환경정비법 제39조 제2항 · 법률 제14943호 부칙 제2조. 상속·이혼, 근무·질병·해외이주·1세대1주택 장기보유 등 예외가 있습니다. 실제 거래 전 조합·전문가 확인이 필요합니다.</details>${window.__jaejae ? window.__jaejae.transferHtml(z) : ""}</div></div>`;
  }
  function stageClass(z, state, i) {
    const current = z.demo ? (Number(z.stageNo) || 1) - 1 : state.done || state.last < 0 ? -1 : state.last + 1;
    return i === current ? "cur" : i < current || !z.demo && i <= state.last ? "done" : "";
  }
  function arrowsHtml(z, state) {
    const names = ["구역지정", "추진위", "조합설립", "사업시행", "관리처분", "이주", "철거", "착공", "일반분양", "준공", "이전고시"];
    return `<ol class="zp-arrows" tabindex="0" aria-label="정비사업 단계">` + names.map((n, i) => {
      const cls = stageClass(z, state, i);
      return `<li class="zp-arrow${cls === "done" ? " done" : ""}"${cls === "cur" ? ' aria-current="step"' : ""}>${cls === "cur" ? "<em>지금</em>" : ""}${n}</li>`;
    }).join("") + `</ol>`;
  }
  // ── 진행상황 · 실거래 · 구역정보 · 관련문서 · 생활권 ──
  function progressHtml(z) {
    const state = stageState(z);
    let previous = -1;
    const li = STAGES.map((nm, i) => {
      const entry = Array.isArray(z.stages) && z.stages[i];
      const d = typeof entry === "string" ? entry : entry && entry.date;
      let duration = "";
      if (!z.demo && state.dates[i] != null) {
        if (previous >= 0 && !(previous === 0 && i === 1)) {
          const months = (state.dates[i] - state.dates[previous]) / MONTH_MS, s = pairStats(z.kind, previous, i);
          duration = months <= 0 ? "날짜 순서 확인 필요" : "직전 날짜 단계부터 " + Math.round(months) + "개월" + (s ? " · " + pace(months, s.median) + " (중앙값 " + Math.round(s.median) + "개월)" : " · 비교 표본 부족");
        }
        previous = i;
      } else if (!z.demo && stageClass(z, state, i) === "cur" && state.elapsed != null) duration = Math.floor(state.elapsed) + "개월째 진행";
      return `<li class="${stageClass(z, state, i)}">${esc(nm)}${d ? `<small>${esc(d)}</small>` : ""}${duration ? `<span class="zp-duration">${duration}</span>` : ""}</li>`;
    }).join("");
    return summaryHtml(z) + arrowsHtml(z, state) + `<div class="zp-card">${Number(z.stageNo) === 0 ? `<div class="zp-pre">정비구역 지정 전 · ${esc(z.stageName || "단계 미상")}</div>` : ""}<ol class="zp-steps">${li}</ol></div><div class="zp-foot">단계 이름은 서울시 정비사업 정보몽땅의 추진경과 분류를 따릅니다. 이름이 있다고 그 단계를 마친 것은 아니며, 추진위원회를 구역지정 전에 구성하거나 생략하는 사업도 있어 모든 사업이 같은 순서는 아닙니다.${z.demo ? "" : "<br>비교 표본: 같은 종류 서울 구역 10곳 이상 · 같은 단계 쌍의 날짜 순서가 거꾸로이거나 기간이 0인 경우 제외."}</div>` + (window.__jaejae ? window.__jaejae.faqHtml(z) : "");
  }
  function lifeHtml(z) {
    if (z.demo) return `<div class="zp-card zp-foot">예시 구역은 생활권 통계를 계산하지 않습니다.</div>`;
    const region = regionOf(z), group = region && stageStatistics().regions[region];
    const chips = Object.keys(REGIONS).map((r) => `<span class="zp-region${r === region ? " on" : ""}"${r === region ? ' aria-current="true"' : ""}>${r}</span>`).join("");
    const labels = ["정비구역 지정 전", "구역지정", "추진위", "조합설립", "사업시행", "관리처분 이후"];
    const max = group && Math.max(1, ...group.steps);
    const area = group ? `<div class="zp-regions">${chips}</div><b>${region}</b><p class="zp-foot">${REGIONS[region].split(" ").join(" · ")}</p><p class="zp-life-counts">${["재개발", "재건축", "신속통합기획"].map((k) => k + " " + (group.kinds[k] || 0) + "곳").join(" · ")}</p>${labels.map((n, i) => `<div class="zp-bar"><span>${n}</span><i><span style="width:${group.steps[i] / max * 100}%"></span></i><span>${group.steps[i]}곳</span></div>`).join("")}` : "서울 밖 — 생활권 구분 없음";
    const stations = new Map();
    for (const s of Array.isArray(z.stations) ? z.stations : []) {
      if (!s || typeof s.name !== "string" || !Number.isFinite(s.m) || s.m < 0 || s.m > 1000) continue;
      const parts = s.name.trim().split(/\s+/), last = parts.findLastIndex((p) => p.endsWith("역"));
      const name = last >= 0 ? parts.slice(0, last + 1).join(" ") : s.name;
      const line = last >= 0 && last < parts.length - 1 ? parts.slice(last + 1).join(" ") : s.line;
      const key = Array.isArray(s.lines) ? s : name;
      if (!stations.has(key)) stations.set(key, { name, m: s.m, lines: new Set() });
      const row = stations.get(key); row.m = Math.min(row.m, s.m);
      for (const label of Array.isArray(s.lines) ? s.lines : line ? [line] : []) if (label) row.lines.add(label);
    }
    const color = (name) => {
      const line = ((window.TRANSIT_DATA && window.TRANSIT_DATA.lines) || []).find((l) => norm(l.n) === norm(name) || norm(l.n).replace(/^수도권/, "") === norm(name));
      return line && /^#[0-9a-f]{6}$/i.test(line.c) ? trInk(line.c) : "#6B7280";
    };
    const rows = [...stations.values()].sort((a, b) => a.m - b.m);
    const stationHtml = z.approx ? "위치가 동 단위 대표점이라 역 거리를 계산하지 않았습니다" : !Array.isArray(z.stations) ? "지하철역 자료를 수집하지 못했습니다" : !rows.length ? "반경 1km 안 지하철역 없음" : `<ul class="zp-stations">${rows.map((s) => `<li><span class="zp-lines">${[...s.lines].map((l) => `<span class="zp-line" style="color:${color(l)}">${esc(l)}</span>`).join("")}</span>${esc(s.name)}<span class="zp-distance">직선 ${s.m}m · 도보 약 ${Math.ceil(s.m / 67)}분</span></li>`).join("")}</ul>`;
    return `<div class="zp-card">${area}</div><h4 style="margin-top:20px">지하철 ${z.approx || !Array.isArray(z.stations) ? "–" : rows.length}</h4><div class="zp-card">${stationHtml}</div><div class="zp-foot">서울시 역사마스터 정보(서울 열린데이터광장 · 공공누리 제1유형) · 구역 대표 좌표 기준 직선거리<br>도보 시간은 직선거리 기준으로 분당 67m를 걸을 때의 환산값입니다.<br><small>노선은 역사마스터 행 기준 — 일부 환승 노선이 빠질 수 있음</small></div>`;
  }
  function infoHtml(z) {
    const owners = nz(z.owners), area = nz(z.area_m2, true), members = nz(z.members), dongs = nz(z.dongs);
    const existing = nz(z.existing);
    const floors = typeof z.floors === "string" && /지상\s*(\d+)층\s*\/\s*지하\s*(\d+)층/.exec(z.floors);
    const kv = [["구분", z.kind], ["위치", z.addr], ["사업면적", area > 0 ? num(area) + "㎡" : null], ["현존 세대수", existing != null ? num(existing) + "세대" : null], ["토지등소유자", owners > 0 ? num(owners) + "명" : null],
      ["조합원", members != null ? num(members) + "명" : null], ["층수", floors && Number(floors[1]) < Number(floors[2]) ? null : z.floors], ["동수", dongs != null ? num(dongs) + "개동" : null]]
      .filter((x) => x[1] != null && x[1] !== "");
    const A = window.ZONES_DATA;
    return `<div class="zp-card"><dl>${kv.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>` +
      (z.approx ? `<div class="zp-foot">위치는 동 단위 대표점입니다</div>` : "") +
      `<div class="zp-foot">${z.demo ? "예시 값입니다." : "자료 기준일 " + esc((A && A.asof) || "–") + " · " + esc((A && A.source) || "").replace(/OA-\d+·?/g, "") + " · 계획값 · 법적 효력 없음"} 토지등소유자 수와 조합원 수는 서로 다른 값이라 합치지 않습니다. <a href="출처.html">자료 출처 보기 →</a></div>`;
  }
  function docsHtml(z) {
    const docs = (Array.isArray(z.docs) ? z.docs : []).concat([
      { label: "서울시 정비사업 정보몽땅", url: "https://cleanup.seoul.go.kr/" },
      { label: "도시 및 주거환경정비법(국가법령정보센터)", url: "https://www.law.go.kr/" + encodeURI("법령/도시및주거환경정비법") },
      { label: "국토교통부 공고(조정대상지역·투기과열지구 지정)", url: "https://www.molit.go.kr/USR/BORD0201/m_69/LST.jsp" },
    ]);
    return `<div class="zp-card" style="padding-top:2px;padding-bottom:2px">` + docs.filter((d) => d != null && /^https?:\/\//i.test(d.url)).map((d) => `<a class="zp-doc" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">${esc(d.label)} ↗</a>`).join("") + `</div>`;
  }


function regHtml(z) { return window.JJ.regHtml(z, flag, REG); }
window.ZoneCore = { STAGES, REGIONS, REG, flag, regionOf, stageState, moveSummary, moveEstimate, transferStatus, progressHtml, infoHtml, lifeHtml, supplyHtml, docsHtml, regHtml, num, nz };
function havDistM(lat1, lng1, lat2, lng2){     // haversine 표준 공식 R=6371000m (스펙 §6.1)
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
  const normName = (s) => String(s || "").replace(/\([^)]*\)/g,"").replace(/(?:잔여세대|추가입주자|추가모집|무순위|입주자모집).*$/g,"").replace(/재개발|재건축|구역|\s+/g,"");
  function district(s) {
    const parts = String(s || "").trim().replace(/^서울(?:특별시|시)?(?=\s)/,"서울").split(/\s+/);
    const province = {경기도:"경기",부산광역시:"부산",대구광역시:"대구",인천광역시:"인천",광주광역시:"광주",대전광역시:"대전",울산광역시:"울산",세종특별자치시:"세종",강원특별자치도:"강원",강원도:"강원",충청북도:"충북",충청남도:"충남",전북특별자치도:"전북",전라북도:"전북",전라남도:"전남",경상북도:"경북",경상남도:"경남",제주특별자치도:"제주"}[parts[0]] || parts[0];
    const local = parts.slice(1,3).filter((p,i) => /^[가-힣]+[시군구]$/.test(p) && (i===0 || parts[1].endsWith("시")));
    return province === "세종" ? province : local.length ? province+" "+local.join(" ") : "";
  }
  function nameMatches(a,b) {
    const clean = (s) => normName(String(s || "").replace(/\(재촉\)/g,""));
    return !!clean(a) && clean(a)===clean(b);
  }
  function linkedZones(a) {
    if (!a.flags || a.flags.renewal !== true || !district(a.addr)) return [];
    const hints = (String(a.addr || "")+" "+(String(a.name || "").match(/\([^)]*\)/g)||[]).join(" "))
      .match(/[가-힣]+(?:\s*\d+(?:-\d+)*)?\s*구역/g) || [];
    const candidates = ((window.ZONES_DATA && window.ZONES_DATA.zones) || []).filter((z) => !z.demo && district(z.sgg || z.addr)===district(a.addr))
      .map((z) => ({ z, distance: Number.isFinite(a.lat) && Number.isFinite(a.lng) && Number.isFinite(z.lat) && Number.isFinite(z.lng) ? havDistM(a.lat,a.lng,z.lat,z.lng) : Infinity }));
    const named = candidates.filter(({z}) => hints.some((hint) => nameMatches(hint,z.name)));
    return (named.length ? named : candidates.filter(({z,distance}) => !a.approx && !z.approx && distance<=30))
      .sort((x,y) => x.distance-y.distance || x.z.id.localeCompare(y.z.id));
  }

const api=window.ZoneCore, announcements=window.APPLYHOME_DATA?.items||[];
const districtOf=(z)=>Object.values(REGIONS).flatMap(s=>s.split(' ')).find(d=>String(z.sgg||'').endsWith(' '+d))||'';
  function panelValues(z) {
    // 패널 생산 함수의 출력에서 표시값을 읽는다. 속도·규제·역 정제/산식을 복제하지 않는다.
    const node = document.createElement("div");
    node.innerHTML = api.progressHtml(z) + api.infoHtml(z) + api.lifeHtml(z) + api.regHtml(z);
    const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim()).filter(Boolean).join(" ");
    const metric = (name) => [...node.querySelectorAll(`[data-metric="${name}"] > b, [data-metric="${name}"] > p`)]
      .map((el) => el.textContent.trim()).filter(Boolean).join(" · ") || "자료 없음";
    const info = (label) => [...node.querySelectorAll("dt")].find((el) => el.textContent === label)?.nextElementSibling.textContent || "자료 없음";
    const step = node.querySelector(".zp-steps .cur") || [...node.querySelectorAll(".zp-steps .done")].at(-1);
    const lastDate = [...node.querySelectorAll(".zp-steps .done small")].at(-1)?.textContent;
    const stageLabel = node.querySelector(".zp-pre")?.textContent ||
      (step ? [...step.childNodes].map((el) => el.textContent.trim()).filter(Boolean).join(" · ") : "자료 없음");
    const stage = stageLabel + (lastDate && !step?.querySelector("small") ? " · 직전 완료일 " + lastDate : "");
    const p = z.plan || {}, supply = document.createElement("div");
    supply.innerHTML = api.supplyHtml(z);
    const units = (value) => value == null ? "자료 없음" : api.num(value) + "세대";
    const linked = announcements.filter((a) => linkedZones(a).some(({ z: zone }) => zone.id === z.id));
    const station = node.querySelector(".zp-stations li");
    const lines = station ? [...station.querySelectorAll(".zp-line")].map((el) => el.textContent.trim()) : [];
    return { kind: info("구분"), district: districtOf(z) || "자료 없음", region: api.regionOf(z) || "자료 없음",
      stage, speed: metric("speed"), move: metric("move"), transfer: metric("transfer"),
      regulations: [...node.querySelectorAll(".zp-reg > div")].map((el) => ownText(el) + " " + el.querySelector("span").textContent.trim()).join(" · "),
      area: info("사업면적"), existing: info("현존 세대수"),
      supply: `총 ${supply.querySelector(".zp-tot b")?.textContent || units(api.nz(p.total))} · 분양 ${units(api.nz(p.sale))} · 임대 ${units(api.nz(p.rent))} · 계획값`,
      station: station ? ownText(station) + (lines.length ? "(" + lines.join("·") + ")" : "") + " " + station.querySelector(".zp-distance").textContent.trim() : "자료 없음", linked };
  }

Object.assign(window.ZoneCore,{linkedZones,panelValues});
})();
