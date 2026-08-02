// 채용 공고 크롤러 — 원티드·점핏·링커리어에서 "백엔드" 공고를 전부 모아 레벨 태그를 붙여 public/jobs.json 생성.
// 신입 여부는 주로 공고 본문에 있어 목록 API로 정밀 필터가 어렵다 → 전부 수집하고 제목/구조화 필드로 레벨을
// 추정 태깅(신입/주니어/인턴/경력), UI에서 드릴다운. 회사명·공고명·링크만 취합(링크아웃, 본문 미저장).
// 실행: npm run crawl:jobs   ⚠️ Actions 데이터센터 IP는 일부 소스에서 차단될 수 있음 → 로컬/주거 IP 크론 권장.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Job, JobsData } from "../src/lib/types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const Q = "백엔드";
const H = { "User-Agent": UA };
const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();

// 날짜 정규화. "2026-08-07 23:59:59"·"2026.08.07" → "2026-08-07". epoch(ms) → ISO date.
const isoDate = (s: unknown): string => {
  const m = String(s ?? "").match(/(\d{4})[-.](\d{2})[-.](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};
const epochDate = (ms: unknown): string => {
  const n = Number(ms);
  if (!n || Number.isNaN(n)) return "";
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
// 본문 텍스트에서 기술 스택 추출(파생 사실 — 본문은 저장 안 함).
const STACK_DICT = [
  "Java", "Kotlin", "Spring Boot", "Spring", "JPA", "Querydsl", "Hibernate", "MySQL", "PostgreSQL",
  "MariaDB", "MongoDB", "Redis", "Elasticsearch", "Kafka", "RabbitMQ", "AWS", "GCP", "Azure",
  "Docker", "Kubernetes", "Terraform", "Python", "Django", "FastAPI", "Node.js", "NestJS", "Express",
  "TypeScript", "Go", "Golang", "Rust", "gRPC", "GraphQL", "Nginx", "Linux", "Jenkins", "MSA",
];
function extractStacks(text: string): string[] {
  const found: string[] = [];
  for (const s of STACK_DICT) {
    const esc = s.replace(/[.+]/g, "\\$&");
    if (new RegExp(`(?<![A-Za-z])${esc}(?![A-Za-z])`, "i").test(text)) found.push(s === "Golang" ? "Go" : s);
  }
  return [...new Set(found)].slice(0, 8);
}
function employmentOf(text: string): string {
  if (/인턴|intern/i.test(text)) return "인턴";
  if (/계약직|contract/i.test(text)) return "계약직";
  if (/파견/.test(text)) return "파견";
  if (/프리랜서|freelance/i.test(text)) return "프리랜서";
  if (/정규직/.test(text)) return "정규직";
  return "";
}
// 연봉 추출(노출하는 소스만 — 잡코리아 카드 "연봉 5,000~6,000만원"). 숫자 없으면 "".
function salaryOf(text: string): string {
  const m = text.match(/연봉\s*([\d,]+\s*[~∼]\s*[\d,]+\s*만원|[\d,]+\s*만원\s*이상|[\d,]+\s*만원)/);
  return m ? m[1].replace(/\s+/g, "") : "";
}

// 대기업 큐레이션 사전(공백·괄호·㈜ 제거 후 부분일치). 규모(중소/중견)는 JD로 판별 불가라 미표기.
const BIG_COMPANIES = [
  "네이버", "카카오", "쿠팡", "토스", "비바리퍼블리카", "우아한형제들", "배달의민족", "당근마켓", "당근",
  "라인", "넥슨", "엔씨소프트", "크래프톤", "삼성전자", "삼성", "LG전자", "LG유플러스", "LG", "SK텔레콤",
  "SK하이닉스", "SK", "KT", "현대자동차", "현대", "롯데", "신한", "KB국민", "하나은행", "우리은행", "NHN",
  "야놀자", "무신사", "컬리", "마켓컬리", "직방", "리디", "하이퍼커넥트", "센드버드", "몰로코", "안랩",
  "11번가", "지마켓", "여기어때", "오늘의집", "버킷플레이스", "두나무", "업비트", "빗썸", "쏘카", "티맵",
  "카카오뱅크", "카카오페이", "네이버파이낸셜", "라인플러스", "한글과컴퓨터", "넷마블", "스마일게이트",
  "배민", "지그재그", "카카오모빌리티", "카카오엔터프라이즈", "네이버클라우드",
];
// 회사 유형(성격) 태그. 제목+회사명+(가능하면)JD 텍스트로 추정. 정밀도 우선(느슨하게 붙이지 않음).
function companyTags(title: string, company: string, text = ""): string[] {
  const c: string[] = [];
  const t = `${title} ${text}`;
  const nameOnly = company.replace(/[()（）㈜주식회사\s]/g, "");
  if (BIG_COMPANIES.some((b) => nameOnly.includes(b))) c.push("대기업");
  if (/스타트업|startup|시리즈\s*[A-Da-dＡ-Ｄ]|시드\s*투자|유니콘|초기\s*멤버|얼리\s*스테이지|투자\s*유치/i.test(t))
    c.push("스타트업");
  // SI/SM: 파견·상주·고객사·시스템 통합·구축 프로젝트 등 강한 신호만(맨몸 SI/SM은 한글 경계 오매칭이라 제외)
  if (/SI\s*(?:\/\s*SM)?\s*(?:프로젝트|개발|업체|기업|구축|사업)|system\s*integration|시스템\s*통합|고객사\s*(?:상주|파견)|상주\s*근무|파견\s*근무|구축\s*프로젝트|프로젝트\s*투입|SM\s*운영/i.test(t))
    c.push("SI");
  // 솔루션: 맨몸 '솔루션'은 흔해서 제외, 자사솔루션·패키지SW·그룹웨어·ERP 등 강신호만
  if (/자사\s*솔루션|솔루션\s*(?:기업|회사|전문|개발\s*전문)|패키지\s*(?:소프트웨어|솔루션)|그룹웨어|\bERP\b/i.test(t))
    c.push("솔루션");
  // 플랫폼: 회사명/제목의 '플랫폼' 또는 JD의 '플랫폼 운영/기업/서비스'(맨몸 '플랫폼 개발'만으론 안 붙임)
  if (/플랫폼/.test(`${title} ${company}`) || /플랫폼\s*(?:을\s*)?(?:운영|기업|서비스|비즈니스)/.test(text))
    c.push("플랫폼");
  return [...new Set(c)];
}

// 동시성 제한 map (상세 fetch용).
async function mapLimit<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

// 구조화 경력(from~to년 범위)이 어떤 레벨 버킷과 겹치는지로 태깅. from만 있으면 to=from.
// 예: 0~0=신입 / 0~10=신입·주니어·경력(무관) / 3~7=주니어·경력 / 5~=경력.
function structLevels(from?: number | null, to?: number | null): string[] {
  if (typeof from !== "number") return [];
  const T = typeof to === "number" ? to : from;
  const t: string[] = [];
  if (from <= 0) t.push("신입");
  if (from <= 3 && T >= 1) t.push("주니어");
  if (T >= 4) t.push("경력");
  return t;
}

// 레벨 태깅. ⚠️ 구조화 경력 필드(annual/minCareer)는 회사가 부정확 입력하는 경우가 많다
// (테크리드인데 minCareer=1, 5~10년인데 annual_from=0) → 제목의 강한 신호를 우선한다.
// 우선순위: 경력무관 > 제목 명시연차 > 제목 시니어키워드 > 제목 신입키워드 > 구조화필드.
function levelTags(title: string, from?: number | null, to?: number | null): string[] {
  const tags = new Set<string>();
  if (/인턴|intern/i.test(title)) tags.add("인턴"); // 인턴은 독립적으로 병기

  const anyLevel = /경력\s*무관|경력무관|신입\s*[·\/]\s*경력|경력\s*[·\/]\s*신입/i.test(title);
  const senior =
    /시니어|senior|staff|principal|테크\s*리드|tech\s*lead|\blead\b|리드|수석|책임|팀장|team\s*lead|매니저|manager|\bhead\b/i.test(
      title,
    );
  let yF: number | null = null,
    yT: number | null = null;
  let m = title.match(/(\d{1,2})\s*년?\s*[~∼\-–]\s*(\d{1,2})\s*년/); // 3년~10년 / 5~10년
  if (m) {
    yF = +m[1];
    yT = +m[2];
  } else if (
    (m = title.match(/경력\s*(\d{1,2})\s*년?\s*(?:이상|↑|\+)/)) ||
    (m = title.match(/(\d{1,2})\s*년\s*(?:이상|↑|\+)/))
  ) {
    yF = +m[1];
    yT = 99;
  } else if ((m = title.match(/경력\s*(\d{1,2})/))) {
    yF = +m[1];
    yT = +m[1];
  }
  const entry = /신입|엔트리|entry|졸업|0\s*년|초급/i.test(title);

  if (anyLevel) ["신입", "주니어", "경력"].forEach((x) => tags.add(x));
  else if (yF !== null) structLevels(yF, yT).forEach((x) => tags.add(x));
  else if (senior || /경력/.test(title)) tags.add("경력"); // 단독 "경력 채용"도 경력으로
  else if (entry) tags.add("신입");
  else structLevels(from ?? null, to ?? null).forEach((x) => tags.add(x));

  return [...tags];
}

// --- 원티드: years 필터 없이 전체 페이지네이션 ---
async function wanted(): Promise<Job[]> {
  const out: Job[] = [];
  // 키워드 검색은 영문 제목("Backend 개발자")을 놓침(250건). 직군 태그 872=백엔드 개발자로 전량 수집(606+건).
  for (let offset = 0; offset < 800; offset += 100) {
    const url = `https://www.wanted.co.kr/api/v4/jobs?country=kr&tag_type_ids=872&years=-1&job_sort=job.latest_order&locations=all&limit=100&offset=${offset}`;
    let j: any;
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) break;
      j = await r.json();
    } catch {
      break;
    }
    const data: any[] = j.data ?? [];
    if (!data.length) break;
    for (const d of data) {
      out.push({
        source: "wanted",
        company: d.company?.name ?? "?",
        title: strip(d.position ?? "?"),
        url: `https://www.wanted.co.kr/wd/${d.id}`,
        tags: levelTags(d.position ?? "", d.annual_from, d.annual_to),
        categories: companyTags(strip(d.position ?? ""), d.company?.name ?? ""),
        stacks: [],
        location: d.address?.location ?? "",
        closeAt: isoDate(d.due_time),
        postedAt: "",
        employment: "",
        salary: "",
      });
    }
  }
  // 원티드 상세: 본문(requirements/main_tasks 등)에서 스택·고용형태·회사유형 파생(본문 미저장).
  await mapLimit(out, 8, async (j) => {
    const id = j.url.match(/wd\/(\d+)/)?.[1];
    if (!id) return;
    try {
      const r = await fetch(`https://www.wanted.co.kr/api/v4/jobs/${id}`, { headers: H });
      if (!r.ok) return;
      const dj: any = await r.json();
      const dt = dj.job?.detail ?? {};
      const body = [dt.main_tasks, dt.requirements, dt.preferred_points, dt.intro, dt.benefits]
        .filter(Boolean)
        .join("\n");
      j.stacks = extractStacks(body);
      j.employment = employmentOf(`${j.title}\n${body}`);
      j.categories = companyTags(j.title, j.company, body);
    } catch {}
  });
  return out;
}

// --- 점핏: 전체 페이지, 구조화 경력(minCareer/newcomer)으로 정밀 태깅 ---
async function jumpit(): Promise<Job[]> {
  const out: Job[] = [];
  for (let page = 1; page <= 25; page++) {
    const url = `https://jumpit-api.saramin.co.kr/api/positions?sort=relation&highlight=false&page=${page}&keyword=${encodeURIComponent(Q)}`;
    let j: any;
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) break;
      j = await r.json();
    } catch {
      break;
    }
    const positions: any[] = j.result?.positions ?? [];
    if (!positions.length) break;
    for (const p of positions) {
      const tags = levelTags(p.title ?? "", p.minCareer, p.maxCareer);
      // 점핏 newcomer 플래그는 명시적 신입 토글이라 신뢰(제목이 시니어 강신호가 아닐 때).
      if (p.newcomer && !/시니어|senior|리드|lead/i.test(p.title ?? "") && !tags.includes("신입"))
        tags.push("신입");
      out.push({
        source: "jumpit",
        company: p.companyName ?? "?",
        title: strip(p.title ?? "?"),
        url: `https://www.jumpit.co.kr/position/${p.id}`,
        tags,
        categories: companyTags(strip(p.title ?? ""), p.companyName ?? ""),
        stacks: Array.isArray(p.techStacks) ? p.techStacks.slice(0, 6) : [],
        location: Array.isArray(p.locations) ? p.locations[0] ?? "" : "",
        closeAt: isoDate(p.closedAt),
        postedAt: "",
        employment: employmentOf(p.title ?? ""),
        salary: "",
      });
    }
  }
  // 점핏 게시일: 공고당 상세(publishedAt). 동시성 8로 제한.
  await mapLimit(out, 8, async (j) => {
    const id = j.url.match(/position\/(\d+)/)?.[1];
    if (!id) return;
    try {
      const r = await fetch(`https://jumpit-api.saramin.co.kr/api/position/${id}`, { headers: H });
      if (!r.ok) return;
      const dj: any = await r.json();
      j.postedAt = isoDate(dj.result?.publishedAt);
      if (!j.closeAt) j.closeAt = isoDate(dj.result?.closedAt);
    } catch {}
  });
  return out;
}

// --- 링커리어: 검색 페이지 __NEXT_DATA__ Apollo 캐시의 Activity ---
async function linkareer(): Promise<Job[]> {
  const out: Job[] = [];
  const seen = new Set<string>();
  // recruit는 활동 단위라 백엔드 밀도가 낮음 → 키워드 여러 개로 긁어 합침.
  for (const kw of ["백엔드", "서버 개발자", "서버개발", "백엔드 개발자"]) {
    let html: string;
    try {
      const r = await fetch(`https://linkareer.com/list/recruit?q=${encodeURIComponent(kw)}`, {
        headers: H,
      });
      if (!r.ok) continue;
      html = await r.text();
    } catch {
      continue;
    }
    const m = html.match(/id="__NEXT_DATA__"[^>]*>(\{.*?\})<\/script>/s);
    if (!m) continue;
    let apollo: Record<string, any>;
    try {
      apollo = JSON.parse(m[1]).props?.pageProps?.__APOLLO_STATE__ ?? {};
    } catch {
      continue;
    }
    for (const [key, v] of Object.entries(apollo)) {
      if (!key.startsWith("Activity:") || !v || typeof v !== "object") continue;
      const a = v as any;
      if (!a.title || !a.organizationName) continue;
      const title = strip(String(a.title));
      if (!/백엔드|back.?end|서버|server/i.test(title)) continue; // 백엔드/서버 계열만
      const id = String(a.id ?? key.split(":")[1]);
      const url = `https://linkareer.com/activity/${id}`;
      if (seen.has(url)) continue;
      seen.add(url);
      const jt = (a.jobTypes ?? []).join(" ");
      const tags = levelTags(`${title} ${jt}`);
      if (/INTERN/i.test(jt) && !tags.includes("인턴")) tags.push("인턴");
      const employment = /CONTRACT/i.test(jt)
        ? "계약직"
        : /INTERN/i.test(jt)
          ? "인턴"
          : /NEW|EXPERIENCED/i.test(jt)
            ? "정규직"
            : "";
      out.push({
        source: "linkareer",
        company: String(a.organizationName),
        title,
        url,
        tags,
        categories: companyTags(title, String(a.organizationName), jt),
        stacks: [],
        location: "",
        closeAt: epochDate(a.recruitCloseAt),
        postedAt: "",
        employment,
        salary: "",
      });
    }
  }
  return out;
}

// --- 사람인: 검색 HTML (job_tit 앵커 + corp_name). ⚠️ 판례 소스 — 회사명·링크만, 로컬 크론 전용 ---
async function saramin(): Promise<Job[]> {
  const out: Job[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(Q)}&recruitSort=relation&recruitPage=${page}`;
    let html: string;
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) break;
      html = await r.text();
    } catch {
      break;
    }
    const items = [
      ...html.matchAll(/<h2 class="job_tit">[\s\S]*?<a[^>]*title="([^"]+)"[^>]*href="([^"]*rec_idx=(\d+)[^"]*)"/g),
    ];
    const corps = [...html.matchAll(/<strong class="corp_name">[\s\S]*?<a[^>]*>\s*([^<]+?)\s*<\/a>/g)].map(
      (m) => m[1].replace(/\s+/g, " ").trim(),
    );
    // 각 공고의 조건 영역: "지역 · 신입·경력 · 학력 · 근무형태"
    const conds = [...html.matchAll(/<div class="job_condition">([\s\S]*?)<\/div>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    );
    const region =
      /(서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)\s?\S{0,4}/;
    if (!items.length) break;
    items.forEach((m, i) => {
      const raw = m[1].replace(/\s+/g, " ").trim();
      const company = corps[i] || "?";
      const cond = conds[i] || "";
      let title = raw;
      if (company !== "?" && title.startsWith(company)) title = title.slice(company.length).trim();
      out.push({
        source: "saramin",
        company,
        title: title || raw,
        url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${m[3]}`,
        tags: levelTags(`${raw} ${cond}`), // 조건의 '신입·경력' 등 반영 → 미표기 감소
        categories: companyTags(title || raw, company, cond),
        stacks: [],
        location: cond.match(region)?.[0]?.trim() ?? "",
        closeAt: "",
        postedAt: "",
        employment: employmentOf(cond) || employmentOf(raw),
        salary: "",
      });
    });
  }
  return out;
}

// --- 잡코리아: 검색 HTML의 CardJob(회사 로고 alt + 제목 앵커). ⚠️ 판례 소스 — 회사명·링크만, 로컬 전용 ---
async function jobkorea(): Promise<Job[]> {
  const out: Job[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 3; page++) {
    const url = `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(Q)}&tabType=recruit&Page_No=${page}`;
    let html: string;
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) break;
      html = await r.text();
    } catch {
      break;
    }
    const cards = html.split('data-sentry-component="CardJob"').slice(1);
    if (!cards.length) break;
    for (const card of cards) {
      let id = "",
        title = "";
      for (const a of card.matchAll(/href="[^"]*GI_Read\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
        const txt = a[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (txt.length >= 4 && !/로고/.test(txt)) {
          id = a[1];
          title = txt;
          break;
        }
      }
      if (!id || !title || seen.has(id)) continue;
      seen.add(id);
      const cm = card.match(/alt="([^"]+?)\s*로고"/);
      const company = cm ? cm[1].trim() : "?";
      // 카드 텍스트(회사·지역·직종·연봉·"경력5년↑"·정규직 등) → 레벨·고용형태·지역 파생.
      // 조건이 카드 하단(~4KB)에 있어 카드 전체를 본다. split이 카드 경계로 잘라 다음 카드는 안 섞임.
      const cardText = strip(card.slice(0, 9000)).replace(/\s+/g, " ");
      const region =
        /(서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)\s?\S{0,4}/;
      out.push({
        source: "jobkorea",
        company,
        title,
        url: `https://www.jobkorea.co.kr/Recruit/GI_Read/${id}`,
        tags: levelTags(`${title} ${cardText}`), // 카드의 '경력5년↑'·신입 등 반영
        categories: companyTags(title, company), // 성격은 제목·회사명만(카드 본문 노이즈 차단)
        stacks: [],
        location: cardText.match(region)?.[0]?.trim() ?? "",
        closeAt: "",
        postedAt: "",
        employment: employmentOf(cardText),
        salary: salaryOf(cardText),
      });
    }
  }
  return out;
}

async function main() {
  const results = await Promise.allSettled([wanted(), jumpit(), linkareer(), saramin(), jobkorea()]);
  const names = ["wanted", "jumpit", "linkareer", "saramin", "jobkorea"];
  const all: Job[] = [];
  const sourceCounts: Record<string, number> = {};
  results.forEach((r, i) => {
    const jobs = r.status === "fulfilled" ? r.value : [];
    sourceCounts[names[i]] = jobs.length;
    all.push(...jobs);
    console.log(`${names[i]}: +${jobs.length}${r.status === "rejected" ? " (실패)" : ""}`);
  });

  // 관련성 필터: 제목에 백엔드/서버 신호가 없는 공고 제외 — **사람인/잡코리아에만** 적용.
  // (그들의 HTML 검색은 본문·키워드로도 매칭돼 "경기청년 매치업" 같은 비백엔드가 섞임.)
  // 원티드(직군 872 카테고리)·점핏(백엔드 키워드 API)·링커리어(함수 내 필터)는 이미 백엔드로 확정 →
  // 제목 신호가 없어도(예: "로보어드바이저 IRP 시스템 개발") 정당한 백엔드라 필터 제외.
  const BACKEND_RE = /백[\s]?엔[\s]?드|back[\s.-]?end|서버|server/i;
  const NOISY = new Set(["saramin", "jobkorea"]);
  const seen = new Set<string>();
  const jobs = all.filter((j) => {
    if (NOISY.has(j.source) && !BACKEND_RE.test(j.title)) return false;
    if (!j.company || j.company === "?") return false;
    if (seen.has(j.url)) return false;
    seen.add(j.url);
    return true;
  });
  jobs.sort((a, b) => a.company.localeCompare(b.company, "ko"));

  const data: JobsData = {
    generatedAt: new Date().toISOString(),
    sourceCounts,
    companyCount: new Set(jobs.map((j) => j.company)).size,
    jobCount: jobs.length,
    jobs,
  };
  writeFileSync(join(process.cwd(), "public", "jobs.json"), JSON.stringify(data, null, 2) + "\n");

  const lv: Record<string, number> = {};
  jobs.forEach((j) => (j.tags.length ? j.tags : ["미표기"]).forEach((t) => (lv[t] = (lv[t] ?? 0) + 1)));
  const cat: Record<string, number> = {};
  jobs.forEach((j) => j.categories.forEach((t) => (cat[t] = (cat[t] ?? 0) + 1)));
  console.log(`\n공고 ${jobs.length}건 / 회사 ${data.companyCount}곳 · 레벨분포`, lv, "· 유형분포", cat);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
