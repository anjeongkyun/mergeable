import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="max-w-3xl mx-auto px-4 pt-16 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">mergeable</h1>
        <p className="mt-2 text-sm text-gray-500">
          지금 바로 손댈 수 있는 것만 모았습니다. 원하는 곳으로 들어가세요.
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-4 grid gap-4 sm:grid-cols-2">
        <Link
          href="/oss"
          className="group block bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-sm transition"
        >
          <h2 className="text-lg font-medium group-hover:text-indigo-600 transition-colors">
            오픈소스 기여
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            연결된 열린 PR이 없는, 지금 바로 기여할 수 있는 이슈 모음.
          </p>
          <span className="mt-4 inline-block text-sm text-indigo-600">들어가기 →</span>
        </Link>

        <Link
          href="/jobs"
          className="group block bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-sm transition"
        >
          <h2 className="text-lg font-medium group-hover:text-indigo-600 transition-colors">
            백엔드 채용 공고
          </h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            원티드·점핏·링커리어의 백엔드 공고를 회사별로. 신입·주니어·경력까지 레벨로 드릴다운.
          </p>
          <span className="mt-4 inline-block text-sm text-indigo-600">들어가기 →</span>
        </Link>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-10 text-xs text-gray-400">
        수강생 전용. 외부 공유 시 주의하세요.
      </footer>
    </div>
  );
}
