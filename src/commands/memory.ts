import * as p from "@clack/prompts";
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  type MemoryDomain,
  type MemoryEntityType,
  type MemoryFrontmatter,
  type MemoryStatus,
  type RetentionClass,
  type MemoryEntry,
  DOMAINS,
  ENTITY_TYPES,
  STATUSES,
  RETENTION_CLASSES,
  getS3Client,
  nextMemoryId as s3NextMemoryId,
  writeMemory as s3WriteMemory,
  readMemory as s3ReadMemory,
  listMemories as s3ListMemories,
  findMemoryById as s3FindMemoryById,
  seedProductMemory as s3SeedProductMemory,
} from "../memory.ts";
import {
  createMemory,
  readMemory,
  listMemoryEntries,
  findMemoryById,
  seedProductMemory,
} from "../memory-client.ts";
import { loadConfig } from "../config.ts";

interface MemoryArgs {
  subCommand?: string;
  domain?: string;
  "entity-type"?: string;
  product?: string;
  author?: string;
  owner?: string;
  status?: string;
  "retention-class"?: string;
  tags?: string;
  body?: string;
  editor?: boolean;
  prefix?: string;
  id?: string;
  "dry-run"?: boolean;
}

function useDelegation(): boolean {
  return !!process.env.RBX_MEMORY_URL;
}

async function delegatedNextMemoryId(bucket: string, domain: MemoryDomain): Promise<string> {
  if (useDelegation()) {
    throw new Error("rbx-memory allocates memory ids during POST /v1/memory");
  }
  return s3NextMemoryId(bucket, domain);
}

async function delegatedWriteMemory(
  bucket: string,
  fm: MemoryFrontmatter,
  body: string,
  product?: string,
): Promise<{ key: string; id: string }> {
  if (useDelegation()) {
    return createMemory(fm, body, product);
  }
  const key = await s3WriteMemory(bucket, fm, body, product);
  return { key, id: fm.id };
}

async function delegatedReadMemory(
  bucket: string,
  key: string,
): Promise<{ frontmatter: MemoryFrontmatter; body: string } | null> {
  return useDelegation() ? readMemory(key) : s3ReadMemory(bucket, key);
}

async function delegatedListMemories(
  bucket: string,
  prefix: string,
  filters?: {
    domain?: MemoryDomain;
    entity_type?: MemoryEntityType;
    status?: MemoryStatus;
  },
): Promise<MemoryEntry[]> {
  return useDelegation()
    ? listMemoryEntries(prefix, filters)
    : s3ListMemories(bucket, prefix);
}

async function delegatedFindMemoryById(bucket: string, id: string): Promise<string | null> {
  return useDelegation() ? findMemoryById(id) : s3FindMemoryById(bucket, id);
}

async function delegatedSeedProductMemory(
  bucket: string,
  productName: string,
  author: string,
  owner: string,
): Promise<string> {
  return useDelegation()
    ? seedProductMemory(productName, author, owner)
    : s3SeedProductMemory(bucket, productName, author, owner);
}

export async function commandMemory(args: MemoryArgs): Promise<void> {
  const sub = args.subCommand;
  if (!sub || sub.startsWith("--")) {
    console.log(`
Eden Memory — Product lifecycle memory management

Usage:
  eden memory write [--domain=<d>] [--entity-type=<t>] [--product=<name>] [--editor]
  eden memory read <id-or-key>
  eden memory list [--domain=<d>] [--product=<name>] [--prefix=<path>]
  eden memory seed --product=<name>

Domains:       ${DOMAINS.join(", ")}
Entity types:  ${ENTITY_TYPES.join(", ")}
Statuses:      ${STATUSES.join(", ")}
Retention:     ${RETENTION_CLASSES.join(", ")}
`);
    return;
  }

  switch (sub) {
    case "write":
      await commandWrite(args);
      break;
    case "read":
      await commandRead(args);
      break;
    case "list":
      await commandList(args);
      break;
    case "seed":
      await commandSeed(args);
      break;
    default:
      p.cancel(`Unknown memory subcommand: ${sub}`);
  }
}

async function commandWrite(args: MemoryArgs): Promise<void> {
  const config = loadConfig();
  const bucket = config.s3_memory_bucket;

  p.intro("Eden Memory — Write");

  const domain = (args.domain ??
    (await p.select({
      message: "Domain",
      options: DOMAINS.map((d) => ({ value: d, label: d })),
    }))) as MemoryDomain;

  if (p.isCancel(domain)) return p.cancel("Aborted");

  const entityType = (args["entity-type"] ??
    (await p.select({
      message: "Entity type",
      options: ENTITY_TYPES.map((t) => ({ value: t, label: t })),
    }))) as MemoryEntityType;

  if (p.isCancel(entityType)) return p.cancel("Aborted");

  let product: string | undefined;
  if (domain === "product") {
    const productInput =
      args.product ??
      (await p.text({ message: "Product name", placeholder: "e.g. robson" }));
    if (p.isCancel(productInput)) return p.cancel("Aborted");
    product = productInput;
  }

  const author =
    args.author ??
    (await p.text({
      message: "Author",
      placeholder: "@handle or agent:name",
    }));
  if (p.isCancel(author)) return p.cancel("Aborted");

  const owner =
    args.owner ??
    (await p.text({
      message: "Owner",
      placeholder: "e.g. eden, robson",
      initialValue: "eden",
    }));
  if (p.isCancel(owner)) return p.cancel("Aborted");

  const status = (args.status ??
    (await p.select({
      message: "Status",
      options: STATUSES.map((s) => ({ value: s, label: s })),
      initialValue: "draft",
    }))) as MemoryStatus;

  if (p.isCancel(status)) return p.cancel("Aborted");

  const retentionClass = (args["retention-class"] ??
    (await p.select({
      message: "Retention class",
      options: RETENTION_CLASSES.map((r) => ({ value: r, label: r })),
      initialValue: "2years",
    }))) as RetentionClass;

  if (p.isCancel(retentionClass)) return p.cancel("Aborted");

  const tagsStr =
    args.tags ??
    (await p.text({
      message: "Tags (comma-separated)",
      placeholder: "e.g. product,lifecycle",
    }));
  if (p.isCancel(tagsStr)) return p.cancel("Aborted");
  const tags = tagsStr
    ? tagsStr
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  let body: string;
  if (args.body) {
    body = args.body;
  } else if (args.editor) {
    body = openEditor();
  } else {
    const inline = await p.text({
      message: "Body (markdown)",
      placeholder: "Write the memory content...",
      multiline: true,
    } as Parameters<typeof p.text>[0] & { multiline: true });
    if (p.isCancel(inline)) return p.cancel("Aborted");
    body = inline;
  }

  const s = p.spinner();
  let id: string;
  if (useDelegation()) {
    id = "mem-0000-00000";
  } else {
    s.start("Generating memory ID...");
    id = await delegatedNextMemoryId(bucket, domain);
    s.stop(`ID: ${id}`);
  }

  const now = new Date().toISOString();
  const fm: MemoryFrontmatter = {
    id,
    domain,
    entity_type: entityType,
    created_at: now,
    updated_at: now,
    author,
    owner,
    status,
    source_system: "eden",
    retention_class: retentionClass,
    tags,
  };

  if (args["dry-run"]) {
    const { serializeMemory } = await import("../memory.ts");
    console.log(serializeMemory(fm, body));
    p.outro("Dry run — nothing written.");
    return;
  }

  s.start(useDelegation() ? "Writing to rbx-memory..." : "Writing to S3...");
  try {
    const created = await delegatedWriteMemory(bucket, fm, body, product);
    s.stop(
      useDelegation()
        ? `Written to rbx-memory: ${created.key}`
        : `Written to s3://${bucket}/${created.key}`,
    );
    p.outro(`Memory ${created.id} created.`);
  } catch (err) {
    s.stop("Write failed.");
    p.cancel(String(err));
  }
}

async function commandRead(args: MemoryArgs): Promise<void> {
  const config = loadConfig();
  const bucket = config.s3_memory_bucket;
  const input = args.subCommand === "read" ? args.id : undefined;

  if (!input) {
    p.cancel("Usage: eden memory read <id-or-key>");
    return;
  }

  const s = p.spinner();
  s.start("Reading from S3...");

  try {
    let key = input;
    if (!input.includes("/")) {
      const found = await delegatedFindMemoryById(bucket, input);
      if (!found) {
        s.stop("Not found.");
        p.cancel(`Memory ${input} not found in bucket ${bucket}.`);
        return;
      }
      key = found;
    }

    const result = await delegatedReadMemory(bucket, key);
    s.stop("Done.");

    if (!result) {
      p.cancel("Could not parse memory content.");
      return;
    }

    console.log(`\n--- ${key} ---\n`);
    console.log("Frontmatter:");
    console.log(JSON.stringify(result.frontmatter, null, 2));
    console.log(`\nBody:\n${result.body}\n`);
  } catch (err) {
    s.stop("Read failed.");
    p.cancel(String(err));
  }
}

async function commandList(args: MemoryArgs): Promise<void> {
  const config = loadConfig();
  const bucket = config.s3_memory_bucket;

  let prefix = args.prefix;
  if (!prefix) {
    const domain = (args.domain ?? "product") as MemoryDomain;
    if (domain === "product" && args.product) {
      prefix = `product/${args.product}/`;
    } else {
      prefix = `${domain}/`;
    }
  }
  const domain = (args.domain ?? domainFromPrefix(prefix) ?? "product") as MemoryDomain;

  const s = p.spinner();
  s.start(`Listing s3://${bucket}/${prefix}...`);

  try {
    const entries = await delegatedListMemories(bucket, prefix, {
      domain,
      entity_type: args["entity-type"] as MemoryEntityType | undefined,
      status: args.status as MemoryStatus | undefined,
    });
    s.stop(`Found ${entries.length} memories.`);

    if (entries.length === 0) {
      console.log("No memories found.");
      return;
    }

    console.log(
      entries
        .map((e) => {
          const date = e.lastModified
            ? e.lastModified.toISOString().slice(0, 10)
            : "unknown";
          const size = e.size ? `${(e.size / 1024).toFixed(1)}KB` : "";
          const id = e.key.split("/").pop()?.replace(".md", "") ?? "";
          return `  ${id}  ${date}  ${size}  ${e.key}`;
        })
        .join("\n"),
    );
  } catch (err) {
    s.stop("List failed.");
    p.cancel(String(err));
  }
}

async function commandSeed(args: MemoryArgs): Promise<void> {
  const config = loadConfig();
  const bucket = config.s3_memory_bucket;

  const productName = args.product;
  if (!productName) {
    p.cancel("Usage: eden memory seed --product=<name>");
    return;
  }

  const s = p.spinner();
  s.start(`Seeding memory for ${productName}...`);

  try {
    const key = await delegatedSeedProductMemory(
      bucket,
      productName,
      "@operator",
      "eden",
    );
    s.stop(
      useDelegation()
        ? `Written to rbx-memory: ${key}`
        : `Written to s3://${bucket}/${key}`,
    );
    p.outro(`Memory seeded for ${productName}.`);
  } catch (err) {
    s.stop("Seed failed.");
    p.cancel(String(err));
  }
}

function domainFromPrefix(prefix: string): MemoryDomain | undefined {
  const first = prefix.split("/")[0] as MemoryDomain | undefined;
  return first && DOMAINS.includes(first) ? first : undefined;
}

function openEditor(): string {
  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
  const tmpFile = join(
    tmpdir(),
    `eden-memory-${Date.now()}.md`,
  );
  writeFileSync(
    tmpFile,
    "# Title\n\nWrite your memory content here.\n",
  );
  try {
    execSync(`${editor} "${tmpFile}"`, { stdio: "inherit" });
    return readFileSync(tmpFile, "utf-8");
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  }
}
