#!/usr/bin/env bun
import { commandNew } from "./commands/new.ts";
import { commandList } from "./commands/list.ts";

const args = process.argv.slice(2);
const cmd = args[0];

function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, val] = arg.slice(2).split("=");
      flags[key] = val ?? true;
    }
  }
  return flags;
}

switch (cmd) {
  case "new": {
    const name = args[1]?.startsWith("--") ? undefined : args[1];
    const flags = parseFlags(args.slice(name ? 2 : 1));
    await commandNew({
      name,
      type: flags["type"] as string,
      domain: flags["domain"] as string,
      backendDomain: flags["backend-domain"] as string,
      image: flags["image"] as string,
      product: flags["product"] as string,
      role: flags["role"] as string,
      dryRun: flags["dry-run"] === true,
    });
    break;
  }

  case "list":
    commandList();
    break;

  default:
    console.log(`
Eden — RBX Internal Developer Platform

Usage:
  eden new [name] [--type=<type>] [--domain=<domain>] [--image=<image>] [--dry-run]
  eden new [name] --type=agent [--product=<product>] [--role=<role>] [--domain=<domain>]
  eden list

Types:    api | web-static | fullstack | agent | cli
Products: robson | strategos | thalamus | truthmetal | eden | platform
Roles:    executor | advisor | analyst | signal-generator | router | orchestrator
`);
}
