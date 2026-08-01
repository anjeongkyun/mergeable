"use client";

import dynamic from "next/dynamic";

// 히어로(로그인·홈)용 은은한 리퀴드 그라디언트 배경. WebGL은 클라이언트에서만 → dynamic ssr:false.
// prefers-reduced-motion이면 정적 앰비언트로 폴백(motion-reduce:hidden + bg-ambient).
const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.MeshGradient),
  { ssr: false, loading: () => null },
);

export default function BrandBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {/* 정적 폴백(항상) */}
      <div className="absolute inset-0 bg-ambient" />
      {/* 움직이는 셰이더(모션 허용 시에만) */}
      <div className="absolute inset-0 opacity-[0.22] motion-reduce:hidden">
        <MeshGradient
          className="w-full h-full"
          colors={["#0a0b0f", "#4f46e5", "#7c3aed", "#0a0b0f"]}
          speed={0.12}
        />
      </div>
      {/* 하단 페이드 → 콘텐츠 가독성 */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0b0f] to-transparent" />
    </div>
  );
}
