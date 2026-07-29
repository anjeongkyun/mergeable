"use client";

import { useEffect, useMemo, useState } from "react";
import type { Data, Issue } from "@/lib/types";

type Sort = "recent" | "quiet";

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const day = Math.floor(d / 86400000);
  if (day > 0) return `${day}일 전`;
  const hr = Math.floor(d / 3600000);
  if (hr > 0) return `${hr}시간 전`;
  const min = Math.floor(d / 60000);
  return `${Math.max(min, 1)}분 전`;
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [stack, setStack] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  useEffect(() => {
    fetch("data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ generatedAt: "", repoCount: 0, issueCount: 0, issues: [] }));
  }, []);

  const stacks = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.issues.forEach((i) => i.stacks.forEach((s) => set.add(s)));
    return [...set].sort();
  }, [data]);

  const issues = useMemo(() => {
    if (!data) return [];
    let list = data.issues;
    if (stack) list = list.filter((i) => i.stacks.includes(stack));
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(t) || i.repo.toLowerCase().includes(t),
      );
    }
    return [...list].sort((a, b) =>
      sort === "recent"
        ? +new Date(b.updatedAt) - +new Date(a.updatedAt)
        : a.comments - b.comments,
    );
  }, [data, stack, q, sort]);

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">mergeable</h1>
        <p className="mt-1 text-sm text-gray-500">
          연결된 열린 PR이 없는, 지금 바로 손댈 수 있는 오픈소스 이슈만 모았습니다.
        </p>
        {data?.generatedAt && data.generatedAt !== "1970-01-01T00:00:00.000Z" && (
          <p className="mt-3 text-xs text-gray-400">
            {data.repoCount}개 저장소 · 미점유 이슈 {data.issueCount}건 · {timeAgo(data.generatedAt)} 갱신
          </p>
        )}
      </header>

      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStack(null)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              stack === null
                ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                : "border-gray-200 text-gray-500 hover:text-gray-900"
            }`}
          >
            전체
          </button>
          {stacks.map((s) => (
            <button
              key={s}
              onClick={() => setStack(s === stack ? null : s)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                stack === s
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                  : "border-gray-200 text-gray-500 hover:text-gray-900"
              }`}
            >
              {s}
            </button>
          ))}
          <div className="grow" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·저장소 검색"
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-indigo-600 focus:outline-none w-44"
          />
          <button
            onClick={() => setSort(sort === "recent" ? "quiet" : "recent")}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {sort === "recent" ? "최근 갱신순" : "댓글 적은순"}
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!data ? (
          <p className="text-sm text-gray-400 py-16 text-center">불러오는 중…</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-gray-400 py-16 text-center">
            조건에 맞는 이슈가 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {issues.map((i) => (
              <IssueCard key={`${i.repo}#${i.number}`} issue={i} />
            ))}
          </ul>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-gray-400">
        데이터는 GitHub Actions가 주기적으로 갱신합니다. 클릭 전 이슈의 최신 상태를 확인하세요.
      </footer>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <li className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="font-medium text-gray-500">{issue.repo}</span>
        <span>#{issue.number}</span>
      </div>
      <a
        href={issue.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-1 block text-[15px] font-medium text-gray-900 hover:text-indigo-600 transition-colors"
      >
        {issue.title}
      </a>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {issue.stacks.map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">
            {s}
          </span>
        ))}
        {issue.labels.slice(0, 3).map((l) => (
          <span key={l} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
            {l}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        <span>댓글 {issue.comments}</span>
        <span>{timeAgo(issue.updatedAt)} 갱신</span>
        {issue.assignee && <span>담당 {issue.assignee}</span>}
      </div>
    </li>
  );
}
