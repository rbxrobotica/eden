/**
 * git.ts — Wrapper de operações Git
 *
 * Executa git add/commit/push de forma síncrona no diretório informado.
 * Síncrono por design: o fluxo do comando `new` precisa garantir que o push
 * foi concluído antes de aplicar o ArgoApp via kubectl — se o push não ocorreu,
 * o ArgoCD sync falharia por não encontrar o path ainda.
 *
 * Lança Error se qualquer operação git retornar status != 0, interrompendo o fluxo.
 */

import { spawnSync } from "child_process";

export function gitAdd(repoPath: string): void {
  run(repoPath, ["add", "-A"]);
}

export function gitCommit(repoPath: string, message: string): void {
  run(repoPath, ["commit", "-m", message]);
}

export function gitPush(repoPath: string, branch = currentBranch(repoPath)): void {
  run(repoPath, ["push", "origin", branch]);
}

export function gitHasChanges(repoPath: string): boolean {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoPath,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`git status failed with status ${result.status}`);
  }
  return result.stdout.trim().length > 0;
}

function run(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, stdio: "inherit", encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed with status ${result.status}`);
  }
}

function currentBranch(repoPath: string): string {
  const result = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoPath,
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`git branch failed with status ${result.status}`);
  }
  return result.stdout.trim();
}
