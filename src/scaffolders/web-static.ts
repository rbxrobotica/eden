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
