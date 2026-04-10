import { loadConfig } from "../config.ts";
import { readCatalog } from "../catalog.ts";

const PHASE_EMOJI: Record<string, string> = {
  seed: "🌱",
  structuring: "🔧",
  expansion: "🚀",
  institutionalized: "🏛️",
};

export function commandList(): void {
  const config = loadConfig();
  const products = readCatalog(config.infra_path);

  console.log("\nRBX Product Catalog\n");
  console.log(
    "NAME".padEnd(20) +
    "TYPE".padEnd(14) +
    "PHASE".padEnd(20) +
    "NAMESPACE".padEnd(18) +
    "DOMAINS"
  );
  console.log("─".repeat(90));

  for (const p of products) {
    const phase = `${PHASE_EMOJI[p.phase] ?? ""} ${p.phase}`;
    console.log(
      p.name.padEnd(20) +
      p.type.padEnd(14) +
      phase.padEnd(20) +
      (p.namespace ?? "—").padEnd(18) +
      p.domains.join(", ")
    );
  }
  console.log();
}
