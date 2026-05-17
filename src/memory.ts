import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { parse, stringify } from "yaml";

// --- Types (aligned with rbx-governance/docs/standards/memory-frontmatter-schema.yaml) ---

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

export type MemoryStatus =
  | "draft"
  | "active"
  | "superseded"
  | "archived"
  | "deprecated";

export type RetentionClass = "permanent" | "7years" | "2years" | "ephemeral";

export interface MemoryFrontmatter {
  id: string;
  domain: MemoryDomain;
  entity_type: MemoryEntityType;
  created_at: string;
  updated_at: string;
  author: string;
  owner: string;
  status: MemoryStatus;
  source_system: string;
  retention_class?: RetentionClass;
  tags?: string[];
  related?: string[];
  confidence?: number;
  source_id?: string;
  last_synced?: string;
}

export interface MemoryEntry {
  key: string;
  lastModified?: Date;
  size?: number;
}

export const DOMAINS: MemoryDomain[] = [
  "strategos",
  "governance",
  "ops",
  "product",
  "external",
  "agents",
];

export const ENTITY_TYPES: MemoryEntityType[] = [
  "decision",
  "assumption",
  "session",
  "reflection",
  "snapshot",
  "adr",
  "standard",
  "runbook",
  "roadmap",
  "incident",
  "postmortem",
  "playbook",
  "customer",
  "deal",
  "template",
  "agent_reasoning",
];

export const STATUSES: MemoryStatus[] = [
  "draft",
  "active",
  "superseded",
  "archived",
  "deprecated",
];

export const RETENTION_CLASSES: RetentionClass[] = [
  "permanent",
  "7years",
  "2years",
  "ephemeral",
];

// --- S3 Client (lazy singleton) ---

let _s3: S3Client | null = null;

export function getS3Client(): S3Client {
  if (_s3) return _s3;
  const accessKey = process.env.CONTABO_S3_ACCESS_KEY;
  const secretKey = process.env.CONTABO_S3_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error(
      "Missing S3 credentials.\nSet environment variables:\n  export CONTABO_S3_ACCESS_KEY=<key>\n  export CONTABO_S3_SECRET_KEY=<secret>"
    );
  }
  _s3 = new S3Client({
    endpoint: process.env.CONTABO_S3_ENDPOINT ?? "https://eu2.contabostorage.com",
    region: "default",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
  return _s3;
}

// --- Path construction ---

const ENTITY_TYPE_DIRS: Record<string, string> = {
  decision: "decisions",
  assumption: "assumptions",
  session: "sessions",
  reflection: "reflections",
  snapshot: "snapshots",
  adr: "adr",
  standard: "standards",
  runbook: "runbooks",
  roadmap: "roadmaps",
  incident: "incidents",
  postmortem: "postmortems",
  playbook: "playbooks",
  customer: "customers",
  deal: "deals",
  template: "templates",
  agent_reasoning: "agent-reasoning",
};

export function memoryS3Key(
  domain: MemoryDomain,
  entityType: MemoryEntityType,
  identifier: string,
  product?: string,
): string {
  const dir = ENTITY_TYPE_DIRS[entityType] ?? entityType;
  if (domain === "product" && product) {
    return `product/${product}/${dir}/${identifier}.md`;
  }
  return `${domain}/${dir}/${identifier}.md`;
}

// --- ID generation ---

export async function nextMemoryId(
  bucket: string,
  domain: MemoryDomain,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = domain === "product" ? "product/" : `${domain}/`;
  const res = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000 }),
  );
  const yearPrefix = `mem-${year}-`;
  let maxNum = 0;
  for (const obj of res.Contents ?? []) {
    const key = obj.Key ?? "";
    const filename = key.split("/").pop() ?? "";
    if (filename.startsWith(yearPrefix)) {
      const match = filename.match(/^mem-\d{4}-(\d{5})/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return `mem-${year}-${String(maxNum + 1).padStart(5, "0")}`;
}

// --- Frontmatter validation ---

export function validateFrontmatter(fm: Partial<MemoryFrontmatter>): string[] {
  const errors: string[] = [];
  const required: (keyof MemoryFrontmatter)[] = [
    "id",
    "domain",
    "entity_type",
    "created_at",
    "updated_at",
    "author",
    "owner",
    "status",
    "source_system",
  ];
  for (const field of required) {
    if (!fm[field]) errors.push(`Missing required field: ${field}`);
  }
  if (fm.id && !/^mem-\d{4}-\d{5}$/.test(fm.id)) {
    errors.push(`Invalid id format: ${fm.id} (expected mem-YYYY-NNNNN)`);
  }
  if (
    fm.author &&
    !/^@[a-zA-Z0-9_-]+$|^agent:[a-zA-Z0-9_-]+$/.test(fm.author)
  ) {
    errors.push(
      `Invalid author format: ${fm.author} (expected @handle or agent:name)`,
    );
  }
  if (fm.confidence !== undefined && (fm.confidence < 0 || fm.confidence > 1)) {
    errors.push(`confidence must be between 0.0 and 1.0, got ${fm.confidence}`);
  }
  if (fm.entity_type === "assumption" && fm.confidence === undefined) {
    errors.push("entity_type 'assumption' requires a confidence value");
  }
  return errors;
}

// --- Serialization ---

export function serializeMemory(fm: MemoryFrontmatter, body: string): string {
  const frontmatterYaml = stringify(fm as Record<string, unknown>);
  return `---\n${frontmatterYaml}---\n\n${body.trim()}\n`;
}

export function parseMemory(
  content: string,
): { frontmatter: MemoryFrontmatter; body: string } | null {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const fmRaw = content.slice(4, end);
  const body = content.slice(end + 5);
  const fm = parse(fmRaw) as MemoryFrontmatter;
  return { frontmatter: fm, body: body.trim() };
}

// --- S3 operations ---

export async function writeMemory(
  bucket: string,
  fm: MemoryFrontmatter,
  body: string,
  product?: string,
): Promise<string> {
  const errors = validateFrontmatter(fm);
  if (errors.length > 0) {
    throw new Error(`Frontmatter validation failed:\n  ${errors.join("\n  ")}`);
  }
  const key = memoryS3Key(fm.domain, fm.entity_type, fm.id, product);
  const content = serializeMemory(fm, body);
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: "text/markdown",
    }),
  );
  return key;
}

export async function readMemory(
  bucket: string,
  key: string,
): Promise<{ frontmatter: MemoryFrontmatter; body: string } | null> {
  const res = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const content = await res.Body!.transformToString();
  return parseMemory(content);
}

export async function listMemories(
  bucket: string,
  prefix: string,
): Promise<MemoryEntry[]> {
  const res = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 200 }),
  );
  return (res.Contents ?? [])
    .filter((obj) => (obj.Key ?? "").endsWith(".md"))
    .map((obj) => ({
      key: obj.Key!,
      lastModified: obj.LastModified,
      size: obj.Size,
    }));
}

export async function findMemoryById(
  bucket: string,
  id: string,
): Promise<string | null> {
  const res = await getS3Client().send(
    new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000 }),
  );
  for (const obj of res.Contents ?? []) {
    const key = obj.Key ?? "";
    if (key.includes(id) && key.endsWith(".md")) return key;
  }
  return null;
}

// --- Product seeding (called from eden new) ---

export async function seedProductMemory(
  bucket: string,
  productName: string,
  author: string,
  owner: string,
): Promise<string> {
  const id = await nextMemoryId(bucket, "product");
  const now = new Date().toISOString();
  const fm: MemoryFrontmatter = {
    id,
    domain: "product",
    entity_type: "decision",
    created_at: now,
    updated_at: now,
    author,
    owner,
    status: "active",
    source_system: "eden",
    retention_class: "permanent",
    tags: [productName, "product-creation"],
  };
  const body = [
    `# ${productName} Creation`,
    "",
    `Product "${productName}" was created via Eden CLI.`,
    "",
    "This is the initial memory entry for this product, seeded automatically at scaffold time.",
  ].join("\n");
  return writeMemory(bucket, fm, body, productName);
}
