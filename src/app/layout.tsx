import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "mergeable",
  description: "레버리지연구소 멘티 전용 취업 종합 서비스.",
  robots: { index: false, follow: false },
  // 링크 클릭 시 목적지(채용 플랫폼 등) 유입분석에 mergeable URL이 남지 않도록.
  referrer: "no-referrer",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-[#0a0b0f] text-zinc-200 bg-ambient min-h-screen">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
