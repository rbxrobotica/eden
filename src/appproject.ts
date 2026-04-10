/**
 * appproject.ts — Gerenciamento do AppProject rbx-applications
 *
 * O AppProject `rbx-applications` é a política de segurança do ArgoCD que define
 * quais namespaces os Applications RBX têm permissão de usar. Se um namespace não
 * estiver declarado aqui, o ArgoCD recusa o sync do produto correspondente.
 *
 * Este módulo adiciona o namespace de cada novo produto à lista `spec.destinations`
 * do AppProject antes do git push, garantindo que o ArgoCD aceite o sync imediatamente.
 *
 * Arquivo gerenciado: rbx-infra/gitops/projects/rbx-applications.yaml
 */

import { readFileSync, writeFileSync } from "fs";
import { parse, stringify } from "yaml";
import { join } from "path";

interface Destination {
  namespace: string;
  server: string;
}

interface AppProject {
  spec: {
    destinations: Destination[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Adiciona o namespace do produto ao AppProject, se ainda não estiver presente.
 * Operação idempotente — chamar duas vezes não duplica a entrada.
 */
export function addDestination(infraPath: string, namespace: string): void {
  const path = join(infraPath, "gitops/projects/rbx-applications.yaml");
  const raw = readFileSync(path, "utf-8");
  const project = parse(raw) as AppProject;

  const already = project.spec.destinations.some((d) => d.namespace === namespace);
  if (already) return;

  project.spec.destinations.push({
    namespace,
    server: "https://kubernetes.default.svc",
  });

  writeFileSync(path, stringify(project));
}
