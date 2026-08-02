"use client";

import Link from "next/link";
import gsap from "gsap";
import { BRAND, Wordmark } from "./brand";
import BrandBackdrop from "./BrandBackdrop";

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
    desc: "여러 채용 사이트의 백엔드 공고를 한곳에 모았어요. 경력·회사 유형으로 나에게 맞는 공고를 빠르게 찾아보세요.",
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

// 등장은 CSS animate-rise(항상 opacity 1로 끝남 — 안 보이는 버그 방지). GSAP은 호버 마이크로인터랙션에만.
export default function Home() {
  const onEnter = (e: React.MouseEvent<HTMLElement>) =>
    gsap.to(e.currentTarget.querySelector(".arrow"), { x: 4, duration: 0.2, ease: "power2.out" });
  const onLeave = (e: React.MouseEvent<HTMLElement>) =>
    gsap.to(e.currentTarget.querySelector(".arrow"), { x: 0, duration: 0.2, ease: "power2.out" });

  return (
    <div className="min-h-screen">
      <BrandBackdrop />
      <header className="max-w-4xl mx-auto px-5 pt-20 pb-10">
        <div className="animate-rise">
          <Wordmark size="text-2xl" />
        </div>
        <h1
          className="animate-rise mt-5 text-[26px] sm:text-3xl font-semibold tracking-tight text-zinc-100"
          style={{ animationDelay: "0.06s" }}
        >
          {BRAND.tagline}
        </h1>
        <p className="animate-rise mt-2 text-sm text-zinc-400" style={{ animationDelay: "0.12s" }}>
          {BRAND.parent} {BRAND.kind}. 기여·학습·지원을 한곳에서.
        </p>
      </header>

      <main className="max-w-4xl mx-auto px-5 grid gap-4 sm:grid-cols-3">
        {CARDS.map((c, i) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-zinc-100 group-hover:text-white transition-colors">
                  {c.title}
                </h2>
                <span className="arrow text-zinc-600 group-hover:text-indigo-400 transition-colors">→</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{c.desc}</p>
              <span className="mt-4 block text-[11px] text-zinc-500">{c.meta}</span>
            </>
          );
          const cls =
            "animate-rise group block rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-5 hover:border-indigo-500/50 hover:bg-zinc-900/70 hover:-translate-y-0.5 transition-all duration-200";
          const style = { animationDelay: `${0.2 + i * 0.08}s` };
          return c.external ? (
            <a
              key={c.href}
              href={c.href}
              target="_blank"
              rel="noreferrer noopener"
              className={cls}
              style={style}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              {inner}
            </a>
          ) : (
            <Link
              key={c.href}
              href={c.href}
              className={cls}
              style={style}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
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
