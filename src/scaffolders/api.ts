/**
 * scaffolders/api.ts — Scaffolder para APIs REST
 *
 * Instancia manifests Kubernetes para um produto do tipo `api` (backend REST/gRPC)
 * a partir dos templates base do rbx-infra (apps/base/api/).
 *
 * Os templates base pertencem à equipe de infra — o Eden é cliente deles, não
 * proprietário. Isso garante que atualizações nos templates (ex: mudanças de recursos,
 * novos sidecars, políticas de rede) se propagam para todos os novos produtos sem
 * precisar alterar o Eden.
 *
 * Arquivos gerados em rbx-infra/apps/prod/<name>/:
 *   namespace.yml           — Namespace com labels de ambiente e Istio ambient mode
 *   middleware-https.yml    — Traefik Middleware de redirect HTTP→HTTPS
 *   deploy.yml              — Deployment com readiness/liveness probes e resource limits
 *   svc.yml                 — Service ClusterIP (exposição interna ao cluster)
 *   ingress.yml             — Ingress Traefik com TLS automático via cert-manager
 *   kustomization.yml       — Lista todos os recursos para o Kustomize
 *
 * Também gera rbx-infra/core/namespaces/<name>.yml — convenção do rbx-infra para
 * namespaces gerenciados centralmente pelo cluster operator.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Lê um template de apps/base/api/ e substitui os placeholders __NAME__, __DOMAIN__, __IMAGE__.
 */
function applyTemplate(infraPath: string, template: string, name: string, domain: string, image: string): string {
  const basePath = join(infraPath, `apps/base/api/${template}`);
  return readFileSync(basePath, "utf-8")
    .replaceAll("__NAME__", name)
    .replaceAll("__DOMAIN__", domain)
    .replaceAll("__IMAGE__", image);
}

export function scaffoldApi(infraPath: string, name: string, domain: string, image: string): void {
  const outDir = join(infraPath, `apps/prod/${name}`);
  mkdirSync(outDir, { recursive: true });

  for (const file of ["namespace.yml", "middleware-https.yml", "deploy.yml", "svc.yml", "ingress.yml", "kustomization.yml"]) {
    writeFileSync(join(outDir, file), applyTemplate(infraPath, file, name, domain, image));
  }

  // core/namespaces
  const nsContent = applyTemplate(infraPath, "namespace.yml", name, domain, image);
  writeFileSync(join(infraPath, `core/namespaces/${name}.yml`), nsContent);
}
