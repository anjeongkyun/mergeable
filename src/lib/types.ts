// data.json 스키마 — 크롤러 산출물이자 사이트 입력. 사이트는 이 파일만 읽는다.

export interface Issue {
  repo: string; // "owner/name"
  number: number;
  title: string;
  url: string;
  labels: string[];
  stacks: string[]; // config에서 부여
  comments: number; // 크라우딩 힌트
  createdAt: string; // ISO
  updatedAt: string; // ISO
  assignee: string | null;
  author: string | null; // 이슈 작성자
  authorAssociation: string; // OWNER/MEMBER/COLLABORATOR/CONTRIBUTOR/NONE ...
  byMaintainer: boolean; // 작성자가 메인테이너(OWNER/MEMBER/COLLABORATOR)인가
  score: number; // 기여 가능성 점수 (크롤러 계산)
  tier: "high" | "medium" | "low"; // 점수 구간
}

export interface Data {
  generatedAt: string; // ISO
  repoCount: number;
  issueCount: number;
  issues: Issue[]; // 전부 미점유(연결된 열린 PR 없음)
}
