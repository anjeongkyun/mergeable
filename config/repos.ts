// 크롤 대상 설정. labels 생략 시 크롤러가 repo 라벨을 정규식으로 자동탐지한다.
// stacks는 UI 필터/뱃지용 태그(자유 문자열). 새 스택/레포는 여기만 추가하면 된다.

export interface RepoConfig {
  repo: string; // "owner/name"
  stacks: string[];
  labels?: string[]; // 명시하면 자동탐지 대신 이 라벨만 사용
}

export const REPOS: RepoConfig[] = [
  // --- 백엔드 (Java / Kotlin / Spring) : 멘토링 기본 스택 ---
  { repo: "langchain4j/langchain4j", stacks: ["Java", "LLM"] },
  { repo: "spring-projects/spring-ai", stacks: ["Java", "Spring", "LLM"], labels: ["status: ideal-for-contribution", "status: first-timers-only"] },
  { repo: "spring-projects/spring-boot", stacks: ["Java", "Spring"], labels: ["status: ideal-for-contribution"] },
  { repo: "spring-projects/spring-framework", stacks: ["Java", "Spring"], labels: ["status: ideal-for-contribution"] },
  { repo: "spring-projects/spring-kafka", stacks: ["Java", "Spring", "Kafka"], labels: ["status: ideal-for-contribution", "help wanted"] },
  { repo: "spring-projects/spring-data-mongodb", stacks: ["Java", "Spring", "MongoDB"], labels: ["status: ideal-for-contribution", "help wanted"] },
  { repo: "testcontainers/testcontainers-java", stacks: ["Java", "Testing"] },
  { repo: "naver/fixture-monkey", stacks: ["Kotlin", "Java", "Testing"] },
  { repo: "line/armeria", stacks: ["Java", "RPC"] },
  { repo: "resilience4j/resilience4j", stacks: ["Java"] },
  { repo: "micrometer-metrics/micrometer", stacks: ["Java", "Observability"] },
  { repo: "FasterXML/jackson-databind", stacks: ["Java"] },
  { repo: "netty/netty", stacks: ["Java", "Networking"] },
  { repo: "ollama4j/ollama4j", stacks: ["Java", "LLM"] },
];
