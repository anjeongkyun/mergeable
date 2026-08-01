"use client";

import { useEffect, useState } from "react";

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
      <form onSubmit={submit} className="w-full max-w-xs text-center">
        <h1 className="text-xl font-semibold tracking-tight">mergeable</h1>
        <p className="mt-1 text-sm text-gray-500">수강생 전용 · 접근 코드를 입력하세요</p>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setErr(false);
          }}
          autoFocus
          placeholder="접근 코드"
          className="mt-4 w-full text-sm px-3 py-2 rounded-md border border-gray-200 focus:border-indigo-600 focus:outline-none text-center"
        />
        {err && <p className="mt-2 text-xs text-rose-500">코드가 올바르지 않습니다.</p>}
        <button className="mt-3 w-full text-sm px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          입장
        </button>
      </form>
    </div>
  );
}
