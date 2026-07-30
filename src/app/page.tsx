"use client";

import { useEffect, useMemo, useState } from "react";
import type { Data, Issue } from "@/lib/types";

type Sort = "score" | "recent" | "quiet";

const PIN_KEY = "mergeable:pinned";

const TIER: Record<Issue["tier"], { label: string; cls: string }> = {
  high: { label: "유망", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "보통", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "낮음", cls: "bg-gray-100 text-gray-500 border-gray-200" },
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
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    fetch("data.json")
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
  }, [data, stack, repo, tier, onlyMaintainer, q, sort, pinned]);

  const pinnedCount = useMemo(
    () => issues.filter((i) => pinned.includes(keyOf(i))).length,
    [issues, pinned],
  );

  return (
    <div className="min-h-screen">
      <header className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">mergeable</h1>
        <p className="mt-1 text-sm text-gray-500">
          연결된 열린 PR이 없는, 지금 바로 손댈 수 있는 오픈소스 이슈만 모았습니다.
        </p>
        {data?.generatedAt && data.generatedAt !== "1970-01-01T00:00:00.000Z" ? (
          <p className="mt-3 text-xs text-gray-400">
            {data.repoCount}개 저장소 · 미점유 이슈 {data.issueCount}건 · 마지막 동기화{" "}
            {new Date(data.generatedAt).toLocaleString("ko-KR", { hour12: false })} ({timeAgo(data.generatedAt)})
          </p>
        ) : null}
      </header>

      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStack(null)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                stack === null
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                  : "border-gray-200 text-gray-500 hover:text-gray-900"
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
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                    : "border-gray-200 text-gray-500 hover:text-gray-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 bg-white focus:border-indigo-600 focus:outline-none max-w-[16rem]"
            >
              <option value="">모든 저장소</option>
              {repos.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 bg-white focus:border-indigo-600 focus:outline-none"
            >
              <option value="">모든 가능성</option>
              <option value="high">유망</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <button
              onClick={() => setOnlyMaintainer((v) => !v)}
              className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                onlyMaintainer
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                  : "border-gray-200 text-gray-600 hover:text-gray-900"
              }`}
            >
              메인테이너 등록만
            </button>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목·저장소 검색"
              className="text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-indigo-600 focus:outline-none w-44"
            />
            <div className="grow" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="text-sm px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 bg-white focus:border-indigo-600 focus:outline-none"
            >
              <option value="score">가능성순</option>
              <option value="recent">최근 갱신순</option>
              <option value="quiet">댓글 적은순</option>
            </select>
          </div>
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
          <>
            {pinnedCount > 0 && (
              <p className="mb-3 text-xs text-gray-400">고정 {pinnedCount}건 · 상단 유지</p>
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

      <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-gray-400">
        가능성은 라벨·신선도·댓글 수로 추정한 참고값입니다. 별표 고정은 이 브라우저에만 저장됩니다. 클릭 전 이슈의 최신 상태를 확인하세요.
      </footer>
    </div>
  );
}

function IssueCard({
  issue,
  pinned,
  onPin,
}: {
  issue: Issue;
  pinned: boolean;
  onPin: () => void;
}) {
  const t = TIER[issue.tier];
  return (
    <li
      className={`bg-white border rounded-lg p-4 transition hover:shadow-sm ${
        pinned ? "border-indigo-300 ring-1 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onPin}
          aria-label={pinned ? "고정 해제" : "상단 고정"}
          className={`mt-0.5 text-lg leading-none transition-colors ${
            pinned ? "text-indigo-500" : "text-gray-300 hover:text-gray-500"
          }`}
        >
          {pinned ? "★" : "☆"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-500">{issue.repo}</span>
            <span>#{issue.number}</span>
            <span className={`px-1.5 py-0.5 rounded border text-[11px] ${t.cls}`}>{t.label}</span>
            {issue.byMaintainer ? (
              <span className="px-1.5 py-0.5 rounded border text-[11px] bg-indigo-50 text-indigo-600 border-indigo-200">
                메인테이너
              </span>
            ) : (
              issue.author && (
                <span className="px-1.5 py-0.5 rounded border text-[11px] bg-gray-50 text-gray-500 border-gray-200">
                  제보 · {issue.author}
                </span>
              )
            )}
            {issue.hasMergedLinkedPR && (
              <span className="px-1.5 py-0.5 rounded border text-[11px] bg-amber-50 text-amber-700 border-amber-200">
                머지된 PR 있음(해결됐을 수 있음)
              </span>
            )}
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
        </div>
      </div>
    </li>
  );
}
