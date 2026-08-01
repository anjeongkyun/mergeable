"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { JobsData, Job } from "@/lib/types";

const SRC: Record<string, string> = {
  wanted: "원티드",
  jumpit: "점핏",
  linkareer: "링커리어",
  saramin: "사람인",
  jobkorea: "잡코리아",
};

const LEVELS = ["신입", "주니어", "인턴", "경력", "미표기"];

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
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"jobs" | "companies">("jobs");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/jobs.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setData({ generatedAt: "", sourceCounts: {}, companyCount: 0, jobCount: 0, jobs: [] }),
      );
  }, []);

  const levelCounts = useMemo(() => {
    const c: Record<string, number> = {};
    if (data)
      for (const j of data.jobs)
        (j.tags.length ? j.tags : ["미표기"]).forEach((t) => (c[t] = (c[t] ?? 0) + 1));
    return c;
  }, [data]);

  const groups = useMemo(() => {
    if (!data) return [];
    let list = data.jobs;
    if (source) list = list.filter((j) => j.source === source);
    if (level)
      list = list.filter((j) => (level === "미표기" ? j.tags.length === 0 : j.tags.includes(level)));
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (j) => j.company.toLowerCase().includes(t) || j.title.toLowerCase().includes(t),
      );
    }
    const map = new Map<string, Job[]>();
    for (const j of list) {
      const arr = map.get(j.company) ?? [];
      arr.push(j);
      map.set(j.company, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ko"));
  }, [data, source, level, q]);

  const shownJobs = groups.reduce((n, [, js]) => n + js.length, 0);

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
          ← 홈
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">백엔드 채용 공고</h1>
        <p className="mt-1 text-sm text-gray-500">
          원티드·점핏·링커리어의 백엔드 공고를 전부 모아, 레벨(신입·주니어·인턴·경력) 태그로 골라 봅니다.
          레벨은 제목·경력 정보로 추정한 값이라 정확하지 않을 수 있어요.
        </p>
        {data && data.generatedAt && (
          <p className="mt-3 text-xs text-gray-400">
            {data.companyCount}개 회사 · 공고 {data.jobCount}건 · {timeAgo(data.generatedAt)} 갱신
          </p>
        )}
      </header>

      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 focus:border-indigo-600 focus:outline-none"
          >
            <option value="">모든 출처</option>
            {Object.entries(SRC).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 focus:border-indigo-600 focus:outline-none"
          >
            <option value="">모든 레벨</option>
            {LEVELS.map((t) => (
              <option key={t} value={t}>
                {t}
                {levelCounts[t] ? ` (${levelCounts[t]})` : ""}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="회사·공고 검색"
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-indigo-600 focus:outline-none w-44"
          />
          <div className="grow" />
          <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setView("jobs")}
              className={`px-3 py-1.5 transition-colors ${view === "jobs" ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              공고
            </button>
            <button
              onClick={() => setView("companies")}
              className={`px-3 py-1.5 transition-colors ${view === "companies" ? "bg-indigo-600 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              회사
            </button>
          </div>
          <span className="text-xs text-gray-400">
            {groups.length}개 회사 · {shownJobs}건
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!data ? (
          <p className="text-sm text-gray-400 py-16 text-center">불러오는 중…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-400 py-16 text-center">조건에 맞는 공고가 없습니다.</p>
        ) : view === "companies" ? (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(groups.map(([c]) => c).join("\n"))
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    })
                    .catch(() => {});
                }}
                className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {copied ? "복사됨" : "회사명 전체 복사"}
              </button>
              <span className="text-xs text-gray-400">
                중복 제거 {groups.length}개 회사 · 클릭하면 해당 회사 공고
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(([company, jobs]) => (
                <li key={company}>
                  <button
                    onClick={() => {
                      setQ(company);
                      setView("jobs");
                    }}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-indigo-300 transition flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-gray-800 truncate">{company}</span>
                    <span className="text-xs text-gray-400 shrink-0">{jobs.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-4">
            {groups.map(([company, jobs]) => (
              <li key={company} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[15px] font-semibold text-gray-900">{company}</h2>
                  <span className="text-xs text-gray-400">{jobs.length}건</span>
                </div>
                <ul className="mt-2 divide-y divide-gray-100">
                  {jobs.map((j) => (
                    <li key={j.url} className="py-2 flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <a
                          href={j.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-sm text-gray-800 hover:text-indigo-600 transition-colors"
                        >
                          {j.title}
                        </a>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {j.tags.length === 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                              미표기
                            </span>
                          )}
                          {j.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700"
                            >
                              {t}
                            </span>
                          ))}
                          {j.stacks.slice(0, 4).map((s) => (
                            <span
                              key={s}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                            >
                              {s}
                            </span>
                          ))}
                          {j.location && (
                            <span className="text-[11px] text-gray-400">{j.location}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 shrink-0">{SRC[j.source]}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-gray-400">
        출처 링크로 이동해 공고 원문·마감일을 확인하세요. 회사명·링크만 취합하며 공고 본문은 저장하지 않습니다.
      </footer>
    </div>
  );
}
