"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { JobsData, Job } from "@/lib/types";

const SRC: Record<string, string> = {
  wanted: "원티드",
  jumpit: "점핏",
  linkareer: "링커리어",
};

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
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/jobs.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() =>
        setData({ generatedAt: "", sourceCounts: {}, companyCount: 0, jobCount: 0, jobs: [] }),
      );
  }, []);

  const tags = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.jobs.flatMap((j) => j.tags))].sort();
  }, [data]);

  const groups = useMemo(() => {
    if (!data) return [];
    let list = data.jobs;
    if (source) list = list.filter((j) => j.source === source);
    if (tag) list = list.filter((j) => j.tags.includes(tag));
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
  }, [data, source, tag, q]);

  const shownJobs = groups.reduce((n, [, js]) => n + js.length, 0);

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
          ← 홈
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">백엔드 신입 공고</h1>
        <p className="mt-1 text-sm text-gray-500">
          원티드·점핏·링커리어의 신입·주니어·인턴 백엔드 공고를 회사별로 모았습니다.
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
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 focus:border-indigo-600 focus:outline-none"
          >
            <option value="">모든 구분</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
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
