import { writeFileSync } from "fs";
import { join } from "path";

export function generateArgoApp(infraPath: string, name: string, namespace: string): void {
  const content = `# ArgoCD Application: ${name}
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${name}
  namespace: argocd
  labels:
    app.kubernetes.io/name: ${name}
    app.kubernetes.io/component: application
    app.kubernetes.io/part-of: ${name}
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: rbx-applications

  source:
    repoURL: https://github.com/rbxrobotica/rbx-infra
    targetRevision: main
    path: apps/prod/${name}

  destination:
    server: https://kubernetes.default.svc
    namespace: ${namespace}

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
`;
  writeFileSync(join(infraPath, `gitops/app-of-apps/${name}.yml`), content);
}
