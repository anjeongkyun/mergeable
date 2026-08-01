// 채용 공고 크롤러 — 원티드·점핏·링커리어에서 "백엔드 신입/주니어/인턴" 공고를 모아 public/jobs.json 생성.
// 공식 API가 아닌 내부 엔드포인트를 읽으므로 스키마 변경·차단 가능(유지보수 상수). 공고 본문은 복제하지 않고
// 회사명·공고명·링크만 취합(링크아웃). 실행: npm run crawl:jobs
//
// ⚠️ GitHub Actions 데이터센터 IP는 일부 소스에서 차단될 수 있음 → 로컬/주거 IP 크론 권장.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Job, JobsData } from "../src/lib/types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const Q = "백엔드";
const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
const H = { "User-Agent": UA };

function levelTags(text: string): string[] {
  const t: string[] = [];
  if (/인턴|intern/i.test(text)) t.push("인턴");
  if (/신입|entry|junior|주니어|0년|졸업/i.test(text)) t.push("신입");
  return t.length ? [...new Set(t)] : ["신입"];
}

// --- 원티드: years=0(신입) ---
async function wanted(): Promise<Job[]> {
  const out: Job[] = [];
  for (const years of [0, 1, 2]) {
    let offset = 0;
    for (let p = 0; p < 3; p++) {
      const url = `https://www.wanted.co.kr/api/v4/jobs?country=kr&job_sort=job.latest_order&years=${years}&locations=all&query=${encodeURIComponent(Q)}&limit=20&offset=${offset}`;
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
          tags: levelTags(d.position ?? ""),
          stacks: [],
          location: d.address?.location ?? "",
        });
      }
      offset += 20;
    }
  }
  return out;
}

// --- 점핏: newcomer 또는 minCareer<=2 만 ---
async function jumpit(): Promise<Job[]> {
  const out: Job[] = [];
  for (let page = 1; page <= 5; page++) {
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
      const entry = p.newcomer === true || (typeof p.minCareer === "number" && p.minCareer <= 2);
      if (!entry) continue;
      out.push({
        source: "jumpit",
        company: p.companyName ?? "?",
        title: strip(p.title ?? "?"),
        url: `https://www.jumpit.co.kr/position/${p.id}`,
        tags: p.newcomer ? ["신입"] : ["주니어"],
        stacks: Array.isArray(p.techStacks) ? p.techStacks.slice(0, 6) : [],
        location: Array.isArray(p.locations) ? p.locations[0] ?? "" : "",
      });
    }
  }
  return out;
}

// --- 링커리어: 검색 페이지 __NEXT_DATA__의 Apollo 캐시에서 Activity 파싱 ---
async function linkareer(): Promise<Job[]> {
  const out: Job[] = [];
  let html: string;
  try {
    const r = await fetch(
      `https://linkareer.com/list/recruit?q=${encodeURIComponent(Q)}`,
      { headers: H },
    );
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
    if (!/백엔드|backend|서버|server/i.test(title)) continue; // 백엔드만
    const id = String(a.id ?? key.split(":")[1]);
    out.push({
      source: "linkareer",
      company: String(a.organizationName),
      title,
      url: `https://linkareer.com/activity/${id}`,
      tags: levelTags(`${title} ${(a.jobTypes ?? []).join(" ")}`),
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

  // dedup by url
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
  const out = join(process.cwd(), "public", "jobs.json");
  writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n공고 ${jobs.length}건 / 회사 ${data.companyCount}곳 → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
