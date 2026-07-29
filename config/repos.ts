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

  // --- Spring 생태계 (라벨 자동탐지) ---
  { repo: "spring-projects/spring-data-jpa", stacks: ["Java", "Spring", "JPA", "MySQL", "PostgreSQL"] },
  { repo: "spring-projects/spring-data-r2dbc", stacks: ["Java", "Spring", "R2DBC", "PostgreSQL"] },
  { repo: "spring-projects/spring-data-redis", stacks: ["Java", "Spring", "Redis"] },
  { repo: "spring-projects/spring-data-commons", stacks: ["Java", "Spring"] },
  { repo: "spring-projects/spring-data-elasticsearch", stacks: ["Java", "Spring", "Search"] },
  { repo: "spring-projects/spring-data-rest", stacks: ["Java", "Spring"] },
  { repo: "spring-projects/spring-security", stacks: ["Java", "Spring", "Security"] },
  { repo: "spring-projects/spring-batch", stacks: ["Java", "Spring", "Batch"] },
  { repo: "spring-projects/spring-integration", stacks: ["Java", "Spring"] },
  { repo: "spring-projects/spring-graphql", stacks: ["Java", "Spring", "GraphQL"] },
  { repo: "spring-projects/spring-amqp", stacks: ["Java", "Spring", "RabbitMQ"] },
  { repo: "spring-projects/spring-session", stacks: ["Java", "Spring"] },
  { repo: "spring-projects/spring-authorization-server", stacks: ["Java", "Spring", "Security"] },
  { repo: "spring-cloud/spring-cloud-gateway", stacks: ["Java", "Spring", "Gateway"] },
  { repo: "spring-cloud/spring-cloud-stream", stacks: ["Java", "Spring", "Kafka"] },

  // --- MongoDB ---
  { repo: "mongodb/mongo-java-driver", stacks: ["Java", "MongoDB"] },
  { repo: "mongodb/mongo-kafka", stacks: ["Java", "MongoDB", "Kafka"] },
  { repo: "MorphiaOrg/morphia", stacks: ["Java", "MongoDB"] },

  // --- MySQL / SQL / 마이그레이션 ---
  { repo: "mybatis/mybatis-3", stacks: ["Java", "MySQL"] },
  { repo: "brettwooldridge/HikariCP", stacks: ["Java", "JDBC"] },
  { repo: "jOOQ/jOOQ", stacks: ["Java", "SQL"] },
  { repo: "flyway/flyway", stacks: ["Java", "SQL", "Migration"] },
  { repo: "liquibase/liquibase", stacks: ["Java", "SQL", "Migration"] },
  { repo: "pgjdbc/pgjdbc", stacks: ["Java", "PostgreSQL"] },

  // --- R2DBC (리액티브) ---
  { repo: "pgjdbc/r2dbc-postgresql", stacks: ["Java", "R2DBC", "PostgreSQL"] },
  { repo: "asyncer-io/r2dbc-mysql", stacks: ["Java", "R2DBC", "MySQL"] },
  { repo: "r2dbc/r2dbc-h2", stacks: ["Java", "R2DBC"] },
  { repo: "r2dbc/r2dbc-spi", stacks: ["Java", "R2DBC"] },

  // --- gRPC ---
  { repo: "grpc/grpc-java", stacks: ["Java", "gRPC"] },
  { repo: "grpc-ecosystem/grpc-spring", stacks: ["Java", "Spring", "gRPC"] },
  { repo: "salesforce/reactive-grpc", stacks: ["Java", "gRPC"] },

  // --- AI / LLM (JVM) ---
  { repo: "microsoft/semantic-kernel", stacks: ["Java", "LLM"] },

  // --- 백엔드 큐레이션 아티클 발굴 (DB·분산·검색·CDC, good-first 라벨 보유) ---
  // 출처: awesome-for-beginners, surajon.dev, upgrad 등
  { repo: "debezium/debezium", stacks: ["Java", "Kafka", "CDC", "MySQL", "MongoDB", "PostgreSQL"] },
  { repo: "elastic/elasticsearch", stacks: ["Java", "Search"], labels: ["good first issue"] },
  { repo: "questdb/questdb", stacks: ["Java", "SQL", "Database"] },
  { repo: "yugabyte/yugabyte-db", stacks: ["Java", "SQL", "Database"] },
  { repo: "trinodb/trino", stacks: ["Java", "SQL", "Distributed"] },
  { repo: "open-metadata/OpenMetadata", stacks: ["Java", "Backend", "Data"] },
  { repo: "TEAMMATES/teammates", stacks: ["Java", "Backend"] },
  { repo: "sirixdb/sirix", stacks: ["Kotlin", "NoSQL", "Database"] },
  { repo: "junit-team/junit5", stacks: ["Java", "Testing"], labels: ["good first issue", "up-for-grabs"] },
  { repo: "mockito/mockito", stacks: ["Java", "Testing"] },
  { repo: "authorjapps/zerocode", stacks: ["Java", "Testing", "Kafka"] },
];
