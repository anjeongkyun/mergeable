# mergeable

지금 바로 기여 가능한 오픈소스 이슈만 모아 보는 무인증 정적 대시보드.

설정한 저장소들의 기여-친화 라벨 이슈를 GitHub Actions가 ~10분마다 크롤링해
`public/data.json`으로 굽고, 사이트는 그 파일만 읽어 클라이언트에서 필터/정렬한다.
**핵심: 연결된 열린 PR이 있는(이미 점유된) 이슈는 제외** — GitHub 라벨 페이지를 그냥 보는 것과 다른 이유.

## 구조

- `config/repos.ts` — 크롤 대상 저장소·스택·라벨. 여기만 고치면 대상이 바뀐다.
- `scripts/crawl.ts` — Octokit GraphQL 크롤러. 라벨 이슈 수집 → 열린 연결 PR 제외 → `data.json`.
- `src/app/` — Next.js 정적 export UI (단일 페이지, 클라 필터).
- `.github/workflows/crawl.yml` — cron 크롤 → `data.json` 커밋 (Actions 내장 `GITHUB_TOKEN`).

## 로컬

```bash
npm install
GITHUB_TOKEN=$(gh auth token) npm run crawl   # data.json 생성
npm run dev                                    # http://localhost:3000
npm run build                                  # 정적 out/ 생성
```

## 배포

Cloudflare Pages에 저장소를 연결한다. build=`next build`, output=`out`.
Actions가 `data.json`을 커밋하면 CF Pages가 push를 감지해 자동 재배포한다.
개인정보/노출 최소화를 위해 `robots.txt` Disallow + 메타 `noindex` 적용.
