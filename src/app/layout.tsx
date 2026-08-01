import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "mergeable",
  description: "수강생 전용 · 지금 바로 손댈 수 있는 것만.",
  robots: { index: false, follow: false },
  // 링크 클릭 시 목적지(채용 플랫폼 등) 유입분석에 mergeable URL이 남지 않도록.
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gray-50 text-gray-900">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
