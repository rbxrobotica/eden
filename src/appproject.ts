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
