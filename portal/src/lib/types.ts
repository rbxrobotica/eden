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

// ── Agent Loop Mission types (Phase 4) ────────────────────────────────────

export type MissionStatus =
  | "admitted" | "running" | "paused" | "stopped"
  | "delivered" | "approved" | "rejected" | "completed";

export type LeaseState = "running" | "paused" | "stopped" | "delivered";

export interface MissionSummary {
  mission_code: string;
  status: MissionStatus;
  stop_reason?: string;
  lease_state?: LeaseState;
  type: string;
  repo: string;
  risk_level: string;
  objective: string;
  runner_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export type BoundaryReviewOutcome = "CLEAR" | "PROPOSE" | "ESCALATE" | "REFUSE";

export interface BoundaryReviewArtifact {
  id: string;
  kind: "boundary-review";
  summary: string;
  outcome: BoundaryReviewOutcome;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface MissionDetail extends MissionSummary {
  contract: Record<string, unknown>;
  gates_state: "open" | "approved" | "rejected";
  executor?: string;
  input_tokens?: number;
  output_tokens?: number;
  verify_status?: string; // ADR-0019: passed | failed | not_run
  verify_exit_code?: number; // ADR-0019: verify_command exit code
  boundary_review?: BoundaryReviewArtifact;
}

export interface MissionListResponse {
  missions: MissionSummary[];
  next_cursor?: string;
}
