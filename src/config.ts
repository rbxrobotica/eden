import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { homedir } from "os";
import { join } from "path";

export interface EdenConfig {
  infra_path: string;
  github_org: string;
  default_registry: string;
  kubeconfig: string;
}

const CONFIG_PATH = join(homedir(), ".eden.yml");

const DEFAULTS: EdenConfig = {
  infra_path: join(homedir(), "apps/rbx-infra"),
  github_org: "ldamasio",
  default_registry: "ghcr.io/ldamasio",
  kubeconfig: join(homedir(), ".kube/config-rbx"),
};

export function loadConfig(): EdenConfig {
  if (existsSync(CONFIG_PATH)) {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...parse(raw) };
  }
  return DEFAULTS;
}
