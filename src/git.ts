/**
 * git.ts — Wrapper de operações Git no rbx-infra
 *
 * Executa git add/commit/push de forma síncrona no diretório do rbx-infra.
 * Síncrono por design: o fluxo do comando `new` precisa garantir que o push
 * foi concluído antes de aplicar o ArgoApp via kubectl — se o push não ocorreu,
 * o ArgoCD sync falharia por não encontrar o path ainda.
 *
 * Lança Error se qualquer operação git retornar status != 0, interrompendo o fluxo.
 */

import { spawnSync } from "child_process";

export function gitAdd(infraPath: string): void {
  run(infraPath, ["add", "-A"]);
}

export function gitCommit(infraPath: string, message: string): void {
  run(infraPath, ["commit", "-m", message]);
}

export function gitPush(infraPath: string): void {
  run(infraPath, ["push", "origin", "main"]);
}

function run(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, stdio: "inherit", encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed with status ${result.status}`);
  }
}
