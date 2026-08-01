#!/bin/bash
# 로컬(주거 IP) 크론용: 채용 공고 크롤 → 변경 시 public/jobs.json 커밋·푸시.
# Actions는 데이터센터 IP에서 채용 소스에 스로틀당하므로 jobs 갱신은 여기서만 한다.
# 푸시하면 Actions가 다음 스케줄(≤10분)에 커밋본을 빌드·배포한다.
# launchd에서 실행되므로 PATH를 명시한다.
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$(dirname "$0")/.." || exit 1

echo "==== $(date) crawl:jobs ===="
npm run crawl:jobs || { echo "crawl 실패"; exit 1; }

if git diff --quiet -- public/jobs.json; then
  echo "변경 없음 — 커밋 생략"
  exit 0
fi
git add public/jobs.json
git commit -m "채용 공고 데이터를 갱신한다 (로컬 크론)" || exit 0
git push && echo "푸시 완료"
