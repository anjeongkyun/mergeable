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

// 제목 등 텍스트에서 레벨 추정(복수 가능). 비면 "미표기".
function titleLevels(text: string): string[] {
  const t = new Set<string>();
  if (/인턴|intern/i.test(text)) t.add("인턴");
  if (/신입|엔트리|entry|졸업|0년|경력\s*무관|경력무관|무관/i.test(text)) t.add("신입");
  if (/주니어|junior|저연차|1년|2년|3년|1~3|1-3/i.test(text)) t.add("주니어");
  if (/시니어|senior|리드|lead|[4-9]\s*년|경력\s*[4-9]|이상/i.test(text)) t.add("경력");
  return [...t];
}

// --- 원티드: years 필터 없이 전체 페이지네이션 ---
async function wanted(): Promise<Job[]> {
  const out: Job[] = [];
  for (let offset = 0; offset < 400; offset += 20) {
    const url = `https://www.wanted.co.kr/api/v4/jobs?country=kr&job_sort=job.latest_order&locations=all&query=${encodeURIComponent(Q)}&limit=20&offset=${offset}`;
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
        tags: titleLevels(d.position ?? ""),
        stacks: [],
        location: d.address?.location ?? "",
      });
    }
  }
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
      const t = new Set<string>(titleLevels(p.title ?? ""));
      if (p.newcomer) t.add("신입");
      if (typeof p.minCareer === "number") {
        if (p.minCareer === 0) t.add("신입");
        else if (p.minCareer <= 3) t.add("주니어");
        if (p.minCareer >= 4 || (typeof p.maxCareer === "number" && p.maxCareer >= 4)) t.add("경력");
      }
      out.push({
        source: "jumpit",
        company: p.companyName ?? "?",
        title: strip(p.title ?? "?"),
        url: `https://www.jumpit.co.kr/position/${p.id}`,
        tags: [...t],
        stacks: Array.isArray(p.techStacks) ? p.techStacks.slice(0, 6) : [],
        location: Array.isArray(p.locations) ? p.locations[0] ?? "" : "",
      });
    }
  }
  return out;
}

// --- 링커리어: 검색 페이지 __NEXT_DATA__ Apollo 캐시의 Activity ---
async function linkareer(): Promise<Job[]> {
  const out: Job[] = [];
  let html: string;
  try {
    const r = await fetch(`https://linkareer.com/list/recruit?q=${encodeURIComponent(Q)}`, {
      headers: H,
    });
    if (!r.ok) return out;
    html = await r.text();
  } catch {
    return out;
  }
  const m = html.match(/id="__NEXT_DATA__"[^>]*>(\{.*?\})<\/script>/s);
  if (!m) return out;
  let apollo: Record<string, any>;
  try {
    apollo = JSON.parse(m[1]).props?.pageProps?.__APOLLO_STATE__ ?? {};
  } catch {
    return out;
  }
  for (const [key, v] of Object.entries(apollo)) {
    if (!key.startsWith("Activity:") || !v || typeof v !== "object") continue;
    const a = v as any;
    if (!a.title || !a.organizationName) continue;
    const title = strip(String(a.title));
    if (!/백엔드|backend|서버|server/i.test(title)) continue;
    const id = String(a.id ?? key.split(":")[1]);
    const jt = (a.jobTypes ?? []).join(" ");
    const tags = titleLevels(`${title} ${jt}`);
    if (/INTERN/i.test(jt) && !tags.includes("인턴")) tags.push("인턴");
    out.push({
      source: "linkareer",
      company: String(a.organizationName),
      title,
      url: `https://linkareer.com/activity/${id}`,
      tags,
      stacks: [],
      location: "",
    });
  }
  return out;
}

async function main() {
  const results = await Promise.allSettled([wanted(), jumpit(), linkareer()]);
  const names = ["wanted", "jumpit", "linkareer"];
  const all: Job[] = [];
  const sourceCounts: Record<string, number> = {};
  results.forEach((r, i) => {
    const jobs = r.status === "fulfilled" ? r.value : [];
    sourceCounts[names[i]] = jobs.length;
    all.push(...jobs);
    console.log(`${names[i]}: +${jobs.length}${r.status === "rejected" ? " (실패)" : ""}`);
  });

  const seen = new Set<string>();
  const jobs = all.filter((j) => (seen.has(j.url) ? false : seen.add(j.url)));
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
  console.log(`\n공고 ${jobs.length}건 / 회사 ${data.companyCount}곳 · 레벨분포`, lv);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
