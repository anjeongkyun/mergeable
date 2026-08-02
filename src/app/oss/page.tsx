"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Data, Issue } from "@/lib/types";
import { Wordmark } from "../brand";

type Sort = "score" | "recent" | "quiet";

const PIN_KEY = "mergeable:pinned";

const TIER: Record<Issue["tier"], { label: string; cls: string }> = {
  high: { label: "유망", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  medium: { label: "보통", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  low: { label: "낮음", cls: "bg-zinc-800 text-zinc-400 border-zinc-700" },
};

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const day = Math.floor(d / 86400000);
  if (day > 0) return `${day}일 전`;
  const hr = Math.floor(d / 3600000);
  if (hr > 0) return `${hr}시간 전`;
  const min = Math.floor(d / 60000);
  return `${Math.max(min, 1)}분 전`;
}

function keyOf(i: Issue) {
  return `${i.repo}#${i.number}`;
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [stack, setStack] = useState<string | null>(null);
  const [repo, setRepo] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("score");
  const [onlyMaintainer, setOnlyMaintainer] = useState(false);
  const [hideAssigned, setHideAssigned] = useState(true);
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    fetch("/data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ generatedAt: "", repoCount: 0, issueCount: 0, issues: [] }));
    try {
      const raw = localStorage.getItem(PIN_KEY);
      if (raw) setPinned(JSON.parse(raw));
    } catch {}
  }, []);

  function togglePin(k: string) {
    setPinned((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try {
        localStorage.setItem(PIN_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const stacks = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.issues.forEach((i) => i.stacks.forEach((s) => set.add(s)));
    return [...set].sort();
  }, [data]);

  const repos = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.issues.map((i) => i.repo))].sort();
  }, [data]);

  const issues = useMemo(() => {
    if (!data) return [];
    let list = data.issues;
    if (stack) list = list.filter((i) => i.stacks.includes(stack));
    if (repo) list = list.filter((i) => i.repo === repo);
    if (tier) list = list.filter((i) => i.tier === tier);
    if (onlyMaintainer) list = list.filter((i) => i.byMaintainer);
    if (hideAssigned) list = list.filter((i) => !i.assignee);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(t) || i.repo.toLowerCase().includes(t),
      );
    }
    const cmp = (a: Issue, b: Issue) =>
      sort === "score"
        ? b.score - a.score || +new Date(b.updatedAt) - +new Date(a.updatedAt)
        : sort === "recent"
          ? +new Date(b.updatedAt) - +new Date(a.updatedAt)
          : a.comments - b.comments;
    // 고정된 이슈를 항상 위로
    return [...list].sort((a, b) => {
      const pa = pinned.includes(keyOf(a)) ? 1 : 0;
      const pb = pinned.includes(keyOf(b)) ? 1 : 0;
      return pb - pa || cmp(a, b);
    });
  }, [data, stack, repo, tier, onlyMaintainer, hideAssigned, q, sort, pinned]);

  const pinnedCount = useMemo(
    () => issues.filter((i) => pinned.includes(keyOf(i))).length,
    [issues, pinned],
  );

  const selCls = (on: boolean) =>
    `text-sm px-3 py-1.5 rounded-md border transition-colors ${
      on
        ? "border-indigo-400/60 text-indigo-300 bg-indigo-500/10"
        : "border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700"
    }`;
  const dropdown =
    "text-sm px-2.5 py-1.5 rounded-md border border-zinc-800 text-zinc-300 bg-zinc-950/70 focus:border-indigo-400 focus:outline-none";

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 pt-8 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          ← <Wordmark size="text-xs" />
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">오픈소스 기여</h1>
        <p className="mt-1 text-sm text-zinc-400">
          연결된 열린 PR이 없는, 지금 바로 손댈 수 있는 오픈소스 이슈만 모았습니다.
        </p>
        {data?.generatedAt && data.generatedAt !== "1970-01-01T00:00:00.000Z" ? (
          <p className="mt-3 text-xs text-zinc-500">
            {data.repoCount}개 저장소 · 미점유 이슈 {data.issueCount}건 · 마지막 동기화{" "}
            {new Date(data.generatedAt).toLocaleString("ko-KR", { hour12: false })} ({timeAgo(data.generatedAt)})
          </p>
        ) : null}
      </header>

      <div className="sticky top-0 z-20 bg-[#0a0b0f] border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStack(null)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                stack === null
                  ? "border-indigo-400/60 text-indigo-300 bg-indigo-500/10"
                  : "border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              전체 스택
            </button>
            {stacks.map((s) => (
              <button
                key={s}
                onClick={() => setStack(s === stack ? null : s)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  stack === s
                    ? "border-indigo-400/60 text-indigo-300 bg-indigo-500/10"
                    : "border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={repo} onChange={(e) => setRepo(e.target.value)} className={`${dropdown} max-w-[16rem]`}>
              <option value="">모든 저장소</option>
              {repos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className={dropdown}>
              <option value="">모든 가능성</option>
              <option value="high">유망</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <button onClick={() => setHideAssigned((v) => !v)} className={selCls(hideAssigned)}>
              미배정만
            </button>
            <button onClick={() => setOnlyMaintainer((v) => !v)} className={selCls(onlyMaintainer)}>
              메인테이너 등록만
            </button>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·저장소 검색"
              className="text-sm px-3 py-1.5 rounded-md bg-zinc-950/70 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400 focus:outline-none w-44"
            />
            <div className="grow" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={dropdown}>
              <option value="score">가능성순</option>
              <option value="recent">최근 갱신순</option>
              <option value="quiet">댓글 적은순</option>
            </select>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!data ? (
          <p className="text-sm text-zinc-500 py-16 text-center">불러오는 중…</p>
        ) : issues.length === 0 ? (
          <p className="text-sm text-zinc-500 py-16 text-center">조건에 맞는 이슈가 없습니다.</p>
        ) : (
          <>
            {pinnedCount > 0 && (
              <p className="mb-3 text-xs text-zinc-500">고정 {pinnedCount}건 · 상단 유지</p>
            )}
            <ul className="space-y-3">
              {issues.map((i) => (
                <IssueCard
                  key={keyOf(i)}
                  issue={i}
                  pinned={pinned.includes(keyOf(i))}
                  onPin={() => togglePin(keyOf(i))}
                />
              ))}
            </ul>
          </>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-zinc-600">
        가능성은 라벨·신선도·댓글 수로 추정한 참고값입니다. 별표 고정은 이 브라우저에만 저장됩니다. 클릭 전 이슈의 최신 상태를 확인하세요.
      </footer>
    </div>
  );
}

function IssueCard({ issue, pinned, onPin }: { issue: Issue; pinned: boolean; onPin: () => void }) {
  const t = TIER[issue.tier];
  return (
    <li
      className={`group/row relative bg-zinc-900/40 border rounded-lg p-4 transition-colors ${
        pinned
          ? "border-indigo-500/50 ring-1 ring-indigo-500/20"
          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
      }`}
    >
      {/* 카드 전체를 덮는 링크(제목뿐 아니라 카드 어디든 클릭 → 이슈 열림). 별표만 z-10로 독립 */}
      <a
        href={issue.url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${issue.repo} #${issue.number} 이슈 열기`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
      />
      <span className="absolute top-4 right-4 z-10 text-indigo-400 text-sm opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-200 pointer-events-none">
        ↗
      </span>
      <div className="flex items-start gap-3">
        <button
          onClick={onPin}
          aria-label={pinned ? "고정 해제" : "상단 고정"}
          className={`relative z-10 mt-0.5 text-lg leading-none transition-colors ${
            pinned ? "text-indigo-400" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          {pinned ? "★" : "☆"}
        </button>
        <div className="relative z-10 min-w-0 flex-1 pointer-events-none">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-400">{issue.repo}</span>
            <span>#{issue.number}</span>
            <span className={`px-1.5 py-0.5 rounded border text-[11px] ${t.cls}`}>{t.label}</span>
            {issue.byMaintainer ? (
              <span className="px-1.5 py-0.5 rounded border text-[11px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                메인테이너
              </span>
            ) : (
              issue.author && (
                <span className="px-1.5 py-0.5 rounded border text-[11px] bg-zinc-800 text-zinc-400 border-zinc-700">
                  제보 · {issue.author}
                </span>
              )
            )}
            {issue.hasMergedLinkedPR && (
              <span className="px-1.5 py-0.5 rounded border text-[11px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                머지된 PR 있음(해결됐을 수 있음)
              </span>
            )}
            {issue.assignee && (
              <span className="px-1.5 py-0.5 rounded border text-[11px] bg-rose-500/10 text-rose-300 border-rose-500/30">
                배정됨 · {issue.assignee}
              </span>
            )}
          </div>
          <span className="mt-1 block text-[15px] font-medium text-zinc-100 group-hover/row:text-indigo-300 transition-colors">
            {issue.title}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {issue.stacks.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300">
                {s}
              </span>
            ))}
            {issue.labels.slice(0, 3).map((l) => (
              <span key={l} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {l}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
            <span>댓글 {issue.comments}</span>
            <span>{timeAgo(issue.updatedAt)} 갱신</span>
          </div>
        </div>
      </div>
    </li>
  );
}
