import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./AuthGate";

export const metadata: Metadata = {
  title: "mergeable — 지금 기여 가능한 오픈소스 이슈",
  description: "연결된 열린 PR이 없는, 지금 바로 손댈 수 있는 OSS 이슈만 모았습니다.",
  robots: { index: false, follow: false },
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
