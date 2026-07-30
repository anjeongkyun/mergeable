// mergeable 크롤러.
// GitHub GraphQL로 config repo × 기여-친화 라벨의 열린 이슈를 모아,
// "연결된 열린 PR이 있는" 이슈(=이미 점유)를 제외하고 public/data.json으로 굽는다.
// 실행: GITHUB_TOKEN=$(gh auth token) npm run crawl   (Actions에선 내장 GITHUB_TOKEN)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { graphql } from "@octokit/graphql";
import { REPOS, type RepoConfig } from "../config/repos";
import type { Data, Issue } from "../src/lib/types";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN이 없습니다. `GITHUB_TOKEN=$(gh auth token) npm run crawl`");
  process.exit(1);
}

const gql = graphql.defaults({ headers: { authorization: `token ${token}` } });

// 마지막 활동(updatedAt)이 이보다 오래된 이슈는 제외 — 방치·stale·이미 처리됐을 가능성.
// createdAt이 아니라 updatedAt 기준(오래 전 생성돼도 최근 활동하면 유효).
// 180d = 업계 스테일봇 기준(무활동 60~90d)의 2~3배 여유. updatedAt은 언급·구독·일괄재라벨에
// 오염돼 실제보다 신선하게 보일 수 있어(예: yugabyte 이슈 다수가 일괄터치로 ~189d로 튐) 여유를 둠.
const MAX_STALE_DAYS = 180;

const LABEL_RE = /good.?first.?issue|ideal.for.contribution|help.?wanted|first.?timers|contribution.?welcome/i;

const ISSUES_QUERY = `
query($owner:String!, $name:String!, $label:String!) {
  repository(owner:$owner, name:$name) {
    issues(states:OPEN, labels:[$label], first:40, orderBy:{field:UPDATED_AT, direction:DESC}) {
      nodes {
        number title url createdAt updatedAt
        author { login }
        authorAssociation
        comments { totalCount }
        assignees(first:1) { nodes { login } }
        labels(first:15) { nodes { name } }
        timelineItems(first:60, itemTypes:[CROSS_REFERENCED_EVENT]) {
          nodes { ... on CrossReferencedEvent { source { ... on PullRequest { state } } } }
        }
      }
    }
  }
}`;

const LABELS_QUERY = `
query($owner:String!, $name:String!) {
  repository(owner:$owner, name:$name) { labels(first:100) { nodes { name } } }
}`;

async function resolveLabels(cfg: RepoConfig, owner: string, name: string): Promise<string[]> {
  if (cfg.labels?.length) return cfg.labels;
  try {
    const r: any = await gql(LABELS_QUERY, { owner, name });
    const all: string[] = r.repository.labels.nodes.map((n: any) => n.name);
    return all.filter((n) => LABEL_RE.test(n));
  } catch {
    return ["good first issue", "help wanted"];
  }
}

function hasOpenLinkedPR(node: any): boolean {
  return node.timelineItems.nodes.some((t: any) => t?.source?.state === "OPEN");
}

function hasMergedLinkedPR(node: any): boolean {
  return node.timelineItems.nodes.some((t: any) => t?.source?.state === "MERGED");
}

function staleDays(updatedAt: string): number {
  return (Date.now() - new Date(updatedAt).getTime()) / 86400000;
}

// 기여 가능성 스코어링. 신호: 라벨 감성 · 신선도(메인테이너 활동) · 크라우딩(댓글).
// 연결된 열린 PR로 인한 점유는 이미 크롤 단계에서 제외했다.
const MAINTAINER = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

function scoreIssue(
  labels: string[],
  comments: number,
  updatedAt: string,
  association: string,
): { score: number; tier: "high" | "medium" | "low" } {
  const l = labels.join(" ").toLowerCase();
  let s = 0;

  // 메인테이너가 연 이슈 = triage된·in-scope 신호
  if (MAINTAINER.has(association)) s += 2;

  // 라벨 감성
  if (/good.?first.?issue|ideal.for.contribution|first.?timers/.test(l)) s += 3;
  if (/help.?wanted|contribution.?welcome/.test(l)) s += 2;
  if (/acknowledged|confirmed|approved/.test(l)) s += 2;
  if (/somedaymaybe|waiting.?for.?feedback|on.?hold|blocked|needs.?(triage|investigation|decision|feedback)|question|discussion|wontfix|declined|duplicate/.test(l)) s -= 3;

  // 신선도 (최근 갱신 = 메인테이너 살아있음)
  const days = (Date.now() - new Date(updatedAt).getTime()) / 86400000;
  if (days <= 30) s += 3;
  else if (days <= 120) s += 1;
  else if (days > 365) s -= 2;

  // 크라우딩 (댓글 적을수록 덜 경합)
  if (comments <= 1) s += 2;
  else if (comments <= 5) s += 1;
  else if (comments > 12) s -= 2;

  const tier = s >= 5 ? "high" : s >= 2 ? "medium" : "low";
  return { score: s, tier };
}

async function crawlRepo(cfg: RepoConfig, into: Map<string, Issue>) {
  const [owner, name] = cfg.repo.split("/");
  const labels = await resolveLabels(cfg, owner, name);
  if (!labels.length) {
    console.warn(`  ${cfg.repo}: 기여 라벨 없음 — 건너뜀`);
    return;
  }
  for (const label of labels) {
    let r: any;
    try {
      r = await gql(ISSUES_QUERY, { owner, name, label });
    } catch (e: any) {
      console.warn(`  ${cfg.repo} [${label}]: ${e.message?.split("\n")[0] ?? e}`);
      continue;
    }
    for (const n of r.repository?.issues?.nodes ?? []) {
      if (hasOpenLinkedPR(n)) continue; // 이미 점유
      if (staleDays(n.updatedAt) > MAX_STALE_DAYS) continue; // 방치·stale
      const key = `${cfg.repo}#${n.number}`;
      if (into.has(key)) continue;
      const labelNames = n.labels.nodes.map((l: any) => l.name);
      const association = n.authorAssociation ?? "NONE";
      const { score, tier } = scoreIssue(labelNames, n.comments.totalCount, n.updatedAt, association);
      into.set(key, {
        repo: cfg.repo,
        number: n.number,
        title: n.title,
        url: n.url,
        labels: labelNames,
        stacks: cfg.stacks,
        comments: n.comments.totalCount,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        assignee: n.assignees.nodes[0]?.login ?? null,
        author: n.author?.login ?? null,
        authorAssociation: association,
        byMaintainer: MAINTAINER.has(association),
        hasMergedLinkedPR: hasMergedLinkedPR(n),
        score,
        tier,
      });
    }
  }
}

async function main() {
  const collected = new Map<string, Issue>();
  for (const cfg of REPOS) {
    process.stdout.write(`crawl ${cfg.repo} ... `);
    const before = collected.size;
    await crawlRepo(cfg, collected);
    console.log(`+${collected.size - before}`);
  }
  const issues = [...collected.values()].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  );
  const data: Data = {
    generatedAt: new Date().toISOString(),
    repoCount: REPOS.length,
    issueCount: issues.length,
    issues,
  };
  const out = join(process.cwd(), "public", "data.json");
  writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n미점유 이슈 ${issues.length}건 → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
