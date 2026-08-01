"use client";

import { useEffect, useState } from "react";
import { BRAND, Wordmark } from "./brand";

// 접근 코드의 SHA-256 해시만 보관(리터럴 코드는 소스에 없음). 정적 게이트 — 완전한 보안 아님.
const HASH = "94ee059335e587e501cc4bf90613e0814f00a7b08bc7c648fd865a2af6a22cc2";
const KEY = "mergeable:auth";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") setOk(true);
    } catch {}
    setReady(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((await sha256(pw)) === HASH) {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {}
      setOk(true);
    } else {
      setErr(true);
    }
  }

  if (!ready) return null;
  if (ok) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-rise">
        <div className="flex flex-col items-center text-center">
          <Wordmark size="text-2xl" />
          <p className="mt-3 text-[15px] text-zinc-300">{BRAND.tagline}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {BRAND.parent} · {BRAND.kind}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-5"
        >
          <label className="block text-xs text-zinc-400 mb-2">접근 코드</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr(false);
            }}
            autoFocus
            placeholder="전용 채널로 받은 코드"
            className={`w-full text-sm px-3 py-2.5 rounded-lg bg-zinc-950/70 border text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
              err ? "border-rose-500/70" : "border-zinc-700 focus:border-indigo-400"
            }`}
          />
          {err && <p className="mt-2 text-xs text-rose-400">코드가 올바르지 않습니다.</p>}
          <button className="mt-3 w-full text-sm font-medium px-3 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 active:scale-[0.99] transition">
            입장
          </button>
        </form>

        <div className="mt-5 space-y-2 text-xs leading-relaxed text-zinc-500">
          <p className="flex gap-2">
            <span className="text-indigo-400/80">●</span>
            접근 코드는 보안을 위해 <span className="text-zinc-300">일·주 단위로 수시 변경</span>될 수
            있어요.
          </p>
          <p className="flex gap-2">
            <span className="text-indigo-400/80">●</span>
            멘티라면 새 코드는 <span className="text-zinc-300">전용 채널로 즉시 전달</span>됩니다.
          </p>
          <p className="flex gap-2">
            <span className="text-indigo-400/80">●</span>
            최신 코드가 필요하면{" "}
            <a href={`mailto:${BRAND.contact}`} className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2">
              {BRAND.contact}
            </a>{" "}
            로 연락 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
