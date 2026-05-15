/**
 * config.ts — Configuração do Eden
 *
 * Carrega as preferências do usuário de ~/.eden.yml.
 * Se o arquivo não existir, aplica defaults que apontam para os caminhos
 * convencionais do ambiente de desenvolvimento RBX.
 *
 * Valores configuráveis:
 *   infra_path       — caminho local do repositório rbx-infra (onde os manifests são escritos)
 *   catalog_registry_path — caminho local do rbx-catalog-registry (catálogo runtime)
 *   github_org       — organização GitHub usada para montar URLs de repo
 *   default_registry — registry de imagens padrão (ex: ghcr.io/rbxrobotica)
 *   kubeconfig       — caminho do kubeconfig apontando para o cluster RBX
 *
 * Variáveis de ambiente ficam fora deste módulo — são para segredos, não para config estável.
 */

import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import { homedir } from "os";
import { join } from "path";

export interface EdenConfig {
  infra_path: string;
  catalog_registry_path: string;
  github_org: string;
  default_registry: string;
  kubeconfig: string;
}

const CONFIG_PATH = join(homedir(), ".eden.yml");

const DEFAULTS: EdenConfig = {
  infra_path: join(homedir(), "apps/rbx-infra"),
  catalog_registry_path: join(homedir(), "apps/rbx-catalog-registry"),
  github_org: "rbxrobotica",
  default_registry: "ghcr.io/rbxrobotica",
  kubeconfig: join(homedir(), ".kube/config-rbx"),
};

/**
 * Carrega a configuração do Eden.
 * Merge de ~/.eden.yml sobre os defaults — campos ausentes no arquivo usam o default.
 */
export function loadConfig(): EdenConfig {
  if (existsSync(CONFIG_PATH)) {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...parse(raw) };
  }
  return DEFAULTS;
}
