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
  hasMergedLinkedPR: boolean; // 연결된 PR이 머지됨 = 이미 해결됐을 수 있음
  score: number; // 기여 가능성 점수 (크롤러 계산)
  tier: "high" | "medium" | "low"; // 점수 구간
}

export interface Data {
  generatedAt: string; // ISO
  repoCount: number;
  issueCount: number;
  issues: Issue[]; // 전부 미점유(연결된 열린 PR 없음)
}

// --- 채용 공고 (jobs.json) ---
export interface Job {
  source: "wanted" | "jumpit" | "linkareer" | "saramin" | "jobkorea";
  company: string;
  title: string;
  url: string;
  tags: string[]; // 신입/주니어/인턴 등 (레벨)
  categories: string[]; // 회사 유형(스타트업/SI/솔루션/플랫폼/대기업) — 제목·JD 키워드 추정
  stacks: string[]; // 기술 스택(있으면)
  location: string; // 근무지(있으면)
  closeAt: string; // 마감일(YYYY-MM-DD) 또는 라벨(상시/D-7 등). 없으면 ""
  postedAt: string; // 게시일(YYYY-MM-DD). 점핏만 제공, 그 외 ""
  employment: string; // 고용형태(정규직/계약직/인턴/파견 등). 없으면 ""
  salary: string; // 연봉(예: "5,000~6,000만원"). 노출하는 소스(잡코리아 등)만. 없으면 ""
}

export interface JobsData {
  generatedAt: string; // ISO
  sourceCounts: Record<string, number>;
  companyCount: number;
  jobCount: number;
  jobs: Job[];
}
