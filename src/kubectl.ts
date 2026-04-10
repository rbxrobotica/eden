/**
 * kubectl.ts — Aplicação imediata do ArgoCD Application
 *
 * Após o git push no rbx-infra, o ArgoCD detecta a mudança por polling (a cada ~3 min
 * por padrão). Para não esperar esse ciclo, Eden aplica o manifesto Application
 * diretamente via kubectl, iniciando o sync imediatamente.
 *
 * O KUBECONFIG é injetado via variável de ambiente a partir da config do Eden,
 * permitindo apontar para clusters diferentes sem alterar o kubeconfig do sistema.
 */

import { spawnSync } from "child_process";
import { join } from "path";

/**
 * Aplica o ArgoCD Application do produto no cluster via `kubectl apply -f`.
 *
 * @param infraPath   Caminho local do rbx-infra (onde o arquivo .yml foi gerado)
 * @param appName     Nome do produto (usado para localizar o arquivo em gitops/app-of-apps/)
 * @param kubeconfig  Caminho do kubeconfig do cluster RBX
 */
export function applyArgoApp(infraPath: string, appName: string, kubeconfig: string): void {
  const manifest = join(infraPath, `gitops/app-of-apps/${appName}.yml`);
  const result = spawnSync(
    "kubectl",
    ["apply", "-f", manifest],
    {
      stdio: "inherit",
      encoding: "utf-8",
      env: { ...process.env, KUBECONFIG: kubeconfig },
    }
  );
  if (result.status !== 0) {
    throw new Error(`kubectl apply failed for ${appName}`);
  }
}
