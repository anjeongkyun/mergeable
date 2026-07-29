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

const LABEL_RE = /good.?first.?issue|ideal.for.contribution|help.?wanted|first.?timers|contribution.?welcome/i;

const ISSUES_QUERY = `
query($owner:String!, $name:String!, $label:String!) {
  repository(owner:$owner, name:$name) {
    issues(states:OPEN, labels:[$label], first:40, orderBy:{field:UPDATED_AT, direction:DESC}) {
      nodes {
        number title url createdAt updatedAt
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
      const key = `${cfg.repo}#${n.number}`;
      if (into.has(key)) continue;
      into.set(key, {
        repo: cfg.repo,
        number: n.number,
        title: n.title,
        url: n.url,
        labels: n.labels.nodes.map((l: any) => l.name),
        stacks: cfg.stacks,
        comments: n.comments.totalCount,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        assignee: n.assignees.nodes[0]?.login ?? null,
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
