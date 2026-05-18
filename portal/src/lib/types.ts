export type ProductPhase = "seed" | "structuring" | "expansion" | "institutionalized";
export type ProductType = "web-static" | "api" | "fullstack" | "agent" | "cli";

export interface Product {
  name: string;
  type: ProductType;
  phase: ProductPhase;
  namespace: string | null;
  domains: string[];
  repo: string;
  owner: string;
  created: string;
  description: string;
}

export interface MemoryEntry {
  key: string;
  lastModified?: string;
  size?: number;
}

export interface MemoryDetail {
  frontmatter: Record<string, unknown>;
  body: string;
  key: string;
}

export type MemoryDomain =
  | "strategos"
  | "governance"
  | "ops"
  | "product"
  | "external"
  | "agents";

export type MemoryEntityType =
  | "decision"
  | "assumption"
  | "session"
  | "reflection"
  | "snapshot"
  | "adr"
  | "standard"
  | "runbook"
  | "roadmap"
  | "incident"
  | "postmortem"
  | "playbook"
  | "customer"
  | "deal"
  | "template"
  | "agent_reasoning";

export const DOMAINS: MemoryDomain[] = [
  "strategos", "governance", "ops", "product", "external", "agents",
];

export const ENTITY_TYPES: MemoryEntityType[] = [
  "decision", "assumption", "session", "reflection", "snapshot",
  "adr", "standard", "runbook", "roadmap", "incident",
  "postmortem", "playbook", "customer", "deal", "template",
  "agent_reasoning",
];
