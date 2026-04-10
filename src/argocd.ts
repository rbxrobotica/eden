/**
 * argocd.ts — Geração de ArgoCD Applications
 *
 * Gera o manifesto `Application` do ArgoCD que conecta o produto ao cluster.
 * O arquivo é gravado em rbx-infra/gitops/app-of-apps/<name>.yml.
 *
 * Quando esse manifesto é aplicado no cluster (via kubectl, feito pelo kubectl.ts),
 * o ArgoCD passa a sincronizar o diretório apps/prod/<name> automaticamente.
 *
 * Políticas configuradas em todos os apps gerados:
 *   automated.prune     — remove recursos deletados do Git
 *   automated.selfHeal  — reverte alterações manuais no cluster
 *   ServerSideApply     — usa SSA para resolver conflicts sem sobrescrever anotações gerenciadas
 *   CreateNamespace     — cria o namespace se ainda não existir
 */

import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Gera o manifesto ArgoCD Application para o produto e salva em gitops/app-of-apps/.
 *
 * @param infraPath  Caminho local do repositório rbx-infra
 * @param name       Nome do produto (usado como nome do Application e como path)
 * @param namespace  Namespace Kubernetes de destino
 */
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
