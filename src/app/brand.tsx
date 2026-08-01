// mergeable 브랜드 토큰·로고. 레버리지연구소 멘티 전용 취업 종합 서비스.
// 이름은 유지하되 의미를 재정의한다: git의 "merge 가능한 상태"(충돌 없이 합쳐질 준비)를
// 커리어 은유로 — 기여·역량·공고가 하나의 오퍼로 병합되고, 멘티가 목표 회사에 합류할 준비가 되는 지점.

export const BRAND = {
  name: "mergeable",
  tagline: "당신의 성장을, 커리어로 머지합니다.",
  parent: "레버리지연구소",
  kind: "멘티 전용 취업 종합 서비스",
  contact: "leveragelabs.dev@gmail.com",
};

// git merge 글리프(두 브랜치가 하나로 합류). currentColor 상속 → 강조색에 맞춰 변함.
export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="18" cy="18" r="2.6" />
      <path d="M6 8.6V9a9 9 0 0 0 9 9h.4" />
    </svg>
  );
}

// 로고 + 워드마크. 강조색(인디고→바이올렛 그라디언트) 워드마크.
export function Wordmark({ size = "text-xl" }: { size?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-indigo-400">
        <Logo className="w-[1.15em] h-[1.15em]" />
      </span>
      <span
        className={`${size} font-semibold tracking-tight bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent`}
      >
        mergeable
      </span>
    </span>
  );
}
