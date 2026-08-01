import Link from "next/link";
import { BRAND, Wordmark } from "./brand";

type Card = {
  href: string;
  external?: boolean;
  title: string;
  desc: string;
  meta: string;
};

const CARDS: Card[] = [
  {
    href: "/oss",
    title: "오픈소스 기여",
    desc: "연결된 열린 PR이 없어 지금 바로 손댈 수 있는 이슈. 머지된 PR로 서류에 남길 신호를 만듭니다.",
    meta: "GitHub · 이슈 큐레이션",
  },
  {
    href: "/jobs",
    title: "백엔드 채용 공고",
    desc: "원티드·점핏·링커리어·사람인·잡코리아의 백엔드 공고를 회사·레벨·유형으로 모아 드릴다운.",
    meta: "5개 플랫폼 · 매일 갱신",
  },
  {
    href: "https://learn-foundry.vercel.app",
    external: true,
    title: "foundry · 기초 학습",
    desc: "백엔드 기초 지식을 매일 조금씩. 기초가 탄탄해야 실력이 빛납니다.",
    meta: "학습 플랫폼 ↗",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="max-w-4xl mx-auto px-5 pt-20 pb-10 animate-rise">
        <Wordmark size="text-2xl" />
        <h1 className="mt-5 text-[26px] sm:text-3xl font-semibold tracking-tight text-zinc-100">
          {BRAND.tagline}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {BRAND.parent} {BRAND.kind}. 기여·학습·지원을 한곳에서.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-5 grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-zinc-100 group-hover:text-white transition-colors">
                  {c.title}
                </h2>
                <span className="text-zinc-600 group-hover:text-indigo-400 transition-colors">→</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{c.desc}</p>
              <span className="mt-4 block text-[11px] text-zinc-500">{c.meta}</span>
            </>
          );
          const cls =
            "group block rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/70 transition-colors";
          return c.external ? (
            <a key={c.href} href={c.href} target="_blank" rel="noreferrer noopener" className={cls}>
              {inner}
            </a>
          ) : (
            <Link key={c.href} href={c.href} className={cls}>
              {inner}
            </Link>
          );
        })}
      </main>

      <footer className="max-w-4xl mx-auto px-5 py-12 text-xs text-zinc-600">
        멘티 전용 공간입니다. 접근 코드는 수시로 바뀌며, 외부 공유는 삼가 주세요.
      </footer>
    </div>
  );
}
