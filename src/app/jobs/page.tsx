"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { JobsData, Job } from "@/lib/types";
import { Wordmark } from "../brand";

const SRC: Record<string, string> = {
  wanted: "원티드",
  jumpit: "점핏",
  linkareer: "링커리어",
  saramin: "사람인",
  jobkorea: "잡코리아",
};

const LEVELS = ["신입", "주니어", "인턴", "경력", "미표기"];
const CATS = ["스타트업", "대기업", "플랫폼", "솔루션", "SI"];
const BM_KEY = "mergeable:jobs:bookmarks";

function dday(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; // 라벨(상시 등)
  const days = Math.ceil((new Date(iso + "T23:59:59").getTime() - Date.now()) / 86400000);
  if (days < 0) return "마감";
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000);
  if (h < 1) return "방금";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function Jobs() {
  const [data, setData] = useState<JobsData | null>(null);
  const [sources, setSources] = useState<string[]>(Object.keys(SRC)); // 기본 전체 선택
  const [levels, setLevels] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"jobs" | "companies">("jobs");
  const [companySort, setCompanySort] = useState<"name" | "count">("name");
  const [companyGroup, setCompanyGroup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [onlyBm, setOnlyBm] = useState(false);

  useEffect(() => {
    try {
      setBookmarks(JSON.parse(localStorage.getItem(BM_KEY) ?? "[]"));
    } catch {}
  }, []);
  const toggleBm = (url: string) =>
    setBookmarks((p) => {
      const next = p.includes(url) ? p.filter((u) => u !== url) : [...p, url];
      try {
        localStorage.setItem(BM_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const toggle = (setter: (fn: (p: string[]) => string[]) => void, v: string) =>
    setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const chip = (on: boolean) =>
    `text-sm px-2.5 py-1 rounded-full border transition-colors ${
      on
        ? "border-indigo-400/60 text-indigo-300 bg-indigo-500/10"
        : "border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
    }`;

  useEffect(() => {
    fetch("/jobs.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setData({ generatedAt: "", sourceCounts: {}, companyCount: 0, jobCount: 0, jobs: [] }),
      );
  }, []);

  // 선택된 출처(+검색+즐겨찾기)로 좁힌 집합 — 레벨·유형 카운트·목록의 공통 베이스
  const base = useMemo(() => {
    if (!data) return [];
    let list = data.jobs.filter((j) => sources.includes(j.source));
    if (onlyBm) list = list.filter((j) => bookmarks.includes(j.url));
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (j) => j.company.toLowerCase().includes(t) || j.title.toLowerCase().includes(t),
      );
    }
    return list;
  }, [data, sources, q, onlyBm, bookmarks]);

  const levelCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const j of base)
      (j.tags.length ? j.tags : ["미표기"]).forEach((t) => (c[t] = (c[t] ?? 0) + 1));
    return c;
  }, [base]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const j of base) (j.categories ?? []).forEach((t) => (c[t] = (c[t] ?? 0) + 1));
    return c;
  }, [base]);

  const groups = useMemo(() => {
    let list = base;
    if (levels.length)
      list = list.filter((j) =>
        levels.some((lv) => (lv === "미표기" ? j.tags.length === 0 : j.tags.includes(lv))),
      );
    if (cats.length) list = list.filter((j) => cats.some((c) => (j.categories ?? []).includes(c)));
    const map = new Map<string, Job[]>();
    for (const j of list) {
      const arr = map.get(j.company) ?? [];
      arr.push(j);
      map.set(j.company, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko"));
  }, [base, levels, cats]);

  const shownJobs = groups.reduce((n, [, js]) => n + js.length, 0);

  // 회사 단위 집계 — 소속 공고들의 유형·레벨·연봉을 합쳐 회사 카드에 노출(링크드인 타깃 분석용).
  type Co = { company: string; jobs: Job[]; cats: string[]; levels: string[]; salary: string };
  const companies = useMemo<Co[]>(() => {
    const arr: Co[] = groups.map(([company, jobs]) => ({
      company,
      jobs,
      cats: CATS.filter((c) => jobs.some((j) => (j.categories ?? []).includes(c))),
      levels: LEVELS.filter((lv) =>
        lv === "미표기"
          ? jobs.some((j) => j.tags.length === 0)
          : jobs.some((j) => j.tags.includes(lv)),
      ),
      salary: jobs.map((j) => j.salary).find(Boolean) ?? "",
    }));
    arr.sort((a, b) =>
      companySort === "count"
        ? b.jobs.length - a.jobs.length || a.company.localeCompare(b.company, "ko")
        : a.company.localeCompare(b.company, "ko"),
    );
    return arr;
  }, [groups, companySort]);

  // 유형별 그룹핑(대시보드): 각 유형 아래 해당 유형 공고가 있는 회사들. 미분류 별도.
  const companySections = useMemo<[string, Co[]][]>(() => {
    const secs: [string, Co[]][] = CATS.map((c) => [c, companies.filter((co) => co.cats.includes(c))]);
    const none = companies.filter((co) => co.cats.length === 0);
    if (none.length) secs.push(["유형 미분류", none]);
    return secs.filter(([, list]) => list.length);
  }, [companies]);

  const coCard = (co: Co) => (
    <li key={co.company}>
      <button
        onClick={() => {
          setQ(co.company);
          setView("jobs");
        }}
        className="w-full text-left bg-zinc-900/40 border border-zinc-800 rounded-lg px-3 py-2.5 hover:border-indigo-500/50 hover:bg-zinc-900/70 transition"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-zinc-200 truncate">{co.company}</span>
          <span className="text-xs text-zinc-500 shrink-0">{co.jobs.length}건</span>
        </div>
        {(co.cats.length > 0 || co.levels.some((l) => l !== "미표기") || co.salary) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {co.cats.map((c) => (
              <span key={c} className="text-[11px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">
                {c}
              </span>
            ))}
            {co.levels
              .filter((l) => l !== "미표기")
              .map((l) => (
                <span key={l} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                  {l}
                </span>
              ))}
            {co.salary && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                {co.salary}
              </span>
            )}
          </div>
        )}
      </button>
    </li>
  );

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          ← <Wordmark size="text-xs" />
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">백엔드 채용 공고</h1>
        <p className="mt-1 text-sm text-zinc-400">
          원티드·점핏·링커리어·사람인·잡코리아의 백엔드 공고를 모아, 레벨·유형 태그로 골라 봅니다.
          레벨·유형은 제목·공고 정보로 추정한 값이라 정확하지 않을 수 있어요.
        </p>
        {data && data.generatedAt && (
          <p className="mt-3 text-xs text-zinc-500">
            {data.companyCount}개 회사 · 공고 {data.jobCount}건 · {timeAgo(data.generatedAt)} 갱신
          </p>
        )}
      </header>

      <div className="sticky top-0 z-20 bg-[#0a0b0f] border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-zinc-500 mr-0.5">출처</span>
            {Object.entries(SRC).map(([k, v]) => (
              <button key={k} onClick={() => toggle(setSources, k)} className={chip(sources.includes(k))}>
                {v}
              </button>
            ))}
            <span className="text-xs text-zinc-500 mx-1">레벨</span>
            {LEVELS.map((lv) => (
              <button key={lv} onClick={() => toggle(setLevels, lv)} className={chip(levels.includes(lv))}>
                {lv}
                {levelCounts[lv] ? ` ${levelCounts[lv]}` : ""}
              </button>
            ))}
            <span className="text-xs text-zinc-500 mx-1">유형</span>
            {CATS.map((c) => (
              <button key={c} onClick={() => toggle(setCats, c)} className={chip(cats.includes(c))}>
                {c}
                {catCounts[c] ? ` ${catCounts[c]}` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="회사·공고 검색"
              className="text-sm px-3 py-1.5 rounded-md bg-zinc-950/70 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400 focus:outline-none w-44"
            />
            <button onClick={() => setOnlyBm((v) => !v)} className={chip(onlyBm)} title="북마크한 공고만 보기">
              ★ 즐겨찾기{bookmarks.length ? ` ${bookmarks.length}` : ""}
            </button>
            <div className="grow" />
            <div className="flex rounded-md border border-zinc-800 overflow-hidden text-sm">
              <button
                onClick={() => setView("jobs")}
                className={`px-3 py-1.5 transition-colors ${view === "jobs" ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-100"}`}
              >
                공고
              </button>
              <button
                onClick={() => setView("companies")}
                className={`px-3 py-1.5 transition-colors ${view === "companies" ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-100"}`}
              >
                회사
              </button>
            </div>
            <span className="text-xs text-zinc-500">
              {groups.length}개 회사 · {shownJobs}건
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!data ? (
          <p className="text-sm text-zinc-500 py-16 text-center">불러오는 중…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-zinc-500 py-16 text-center">조건에 맞는 공고가 없습니다.</p>
        ) : view === "companies" ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(companies.map((c) => c.company).join("\n"))
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    })
                    .catch(() => {});
                }}
                className="text-sm px-3 py-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                {copied ? "복사됨" : "회사명 전체 복사"}
              </button>
              <button onClick={() => setCompanyGroup((v) => !v)} className={chip(companyGroup)}>
                유형별 그룹핑
              </button>
              <div className="grow" />
              <span className="text-xs text-zinc-500">정렬</span>
              <button onClick={() => setCompanySort("name")} className={chip(companySort === "name")}>
                가나다
              </button>
              <button onClick={() => setCompanySort("count")} className={chip(companySort === "count")}>
                공고 많은 순
              </button>
            </div>
            <p className="mb-3 text-xs text-zinc-500">
              중복 제거 {companies.length}개 회사 · 카드에 유형·경력·연봉 · 클릭하면 해당 회사 공고
            </p>
            {companyGroup ? (
              <div className="space-y-7">
                {companySections.map(([cat, list]) => (
                  <section key={cat}>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400" />
                      {cat}
                      <span className="text-xs font-normal text-zinc-500">{list.length}곳</span>
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{list.map(coCard)}</ul>
                  </section>
                ))}
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{companies.map(coCard)}</ul>
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {groups.map(([company, jobs]) => (
              <li key={company} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[15px] font-semibold text-zinc-100">{company}</h2>
                  <span className="text-xs text-zinc-500">{jobs.length}건</span>
                </div>
                <ul className="mt-2 divide-y divide-zinc-800/70">
                  {jobs.map((j) => (
                    <li
                      key={j.url}
                      className="group/row relative flex items-start gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* 행 전체를 덮는 링크(제목뿐 아니라 컴포넌트 어디든 클릭 → 공고 열림) */}
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`${j.company} ${j.title} 공고 열기`}
                        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
                      />
                      <button
                        onClick={() => toggleBm(j.url)}
                        title="즐겨찾기"
                        className={`relative z-10 shrink-0 mt-0.5 text-base leading-none transition-colors ${
                          bookmarks.includes(j.url)
                            ? "text-amber-400"
                            : "text-zinc-600 hover:text-amber-300"
                        }`}
                      >
                        {bookmarks.includes(j.url) ? "★" : "☆"}
                      </button>
                      <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
                        <span className="text-sm text-zinc-200 group-hover/row:text-indigo-300 transition-colors">
                          {j.title}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {j.tags.length === 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                              미표기
                            </span>
                          )}
                          {j.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300"
                            >
                              {t}
                            </span>
                          ))}
                          {(j.categories ?? []).map((c) => (
                            <span
                              key={c}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300"
                            >
                              {c}
                            </span>
                          ))}
                          {j.employment && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300">
                              {j.employment}
                            </span>
                          )}
                          {j.salary && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                              {j.salary}
                            </span>
                          )}
                          {j.stacks.slice(0, 4).map((s) => (
                            <span
                              key={s}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                            >
                              {s}
                            </span>
                          ))}
                          {j.location && <span className="text-[11px] text-zinc-500">{j.location}</span>}
                        </div>
                        {(j.postedAt || j.closeAt) && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                            {j.postedAt && <span>게시 {j.postedAt}</span>}
                            {j.closeAt && <span className="text-zinc-400">마감 {dday(j.closeAt)}</span>}
                          </div>
                        )}
                      </div>
                      <div className="relative z-10 flex items-center gap-1 shrink-0 pointer-events-none">
                        <span className="text-[11px] text-zinc-500">{SRC[j.source]}</span>
                        <span className="text-indigo-400 text-xs opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-200">
                          ↗
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-zinc-600">
        출처 링크로 이동해 공고 원문·마감일을 확인하세요. 회사명·링크만 취합하며 공고 본문은 저장하지 않습니다.
      </footer>
    </div>
  );
}
