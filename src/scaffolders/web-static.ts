/**
 * scaffolders/web-static.ts — Scaffolder para frontends estáticos
 *
 * Instancia manifests Kubernetes para um produto do tipo `web-static` (Next.js,
 * Astro, SPA, etc.) a partir dos templates base do rbx-infra (apps/base/web-static/).
 *
 * Segue o mesmo padrão de template do api.ts. Os templates base de web-static
 * diferem dos de api principalmente no containerPort (3000 vs 8000) e nos
 * resource requests (frontends tipicamente usam menos CPU/memória que APIs).
 *
 * Arquivos gerados em rbx-infra/apps/prod/<name>/:
 *   namespace.yml, middleware-https.yml, deploy.yml, svc.yml, ingress.yml, kustomization.yml
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function applyTemplate(infraPath: string, template: string, name: string, domain: string, image: string): string {
  const basePath = join(infraPath, `apps/base/web-static/${template}`);
  return readFileSync(basePath, "utf-8")
    .replaceAll("__NAME__", name)
    .replaceAll("__DOMAIN__", domain)
    .replaceAll("__IMAGE__", image);
}

export function scaffoldWebStatic(infraPath: string, name: string, domain: string, image: string): void {
  const outDir = join(infraPath, `apps/prod/${name}`);
  mkdirSync(outDir, { recursive: true });

  for (const file of ["namespace.yml", "middleware-https.yml", "deploy.yml", "svc.yml", "ingress.yml", "kustomization.yml"]) {
    writeFileSync(join(outDir, file), applyTemplate(infraPath, file, name, domain, image));
  }

  writeFileSync(join(infraPath, `core/namespaces/${name}.yml`), applyTemplate(infraPath, "namespace.yml", name, domain, image));
}
