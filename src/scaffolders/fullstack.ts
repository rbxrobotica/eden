/**
 * scaffolders/fullstack.ts — Scaffolder para produtos fullstack
 *
 * Gera manifests Kubernetes inline (sem templates externos) para produtos que
 * precisam de frontend + backend + Redis em um único namespace.
 *
 * Por que inline e não templates como api.ts/web-static.ts?
 * Um fullstack tem três componentes com nomes derivados (${name}-frontend,
 * ${name}-backend, ${name}-redis) e dois domínios diferentes. Parametrizar
 * isso via templates separados adicionaria complexidade sem ganho real —
 * as strings TypeScript são mais legíveis e mais fáceis de manter.
 *
 * Arquivos gerados em rbx-infra/apps/prod/<name>/:
 *   namespace.yml           — Namespace compartilhado pelos três componentes
 *   middleware-https.yml    — Redirect HTTP→HTTPS para o namespace
 *   frontend-deploy.yml     — Deployment do frontend (porta 3000)
 *   frontend-svc.yml        — Service ClusterIP do frontend
 *   frontend-ingress.yml    — Ingress com TLS para o domínio frontend
 *   backend-deploy.yml      — Deployment do backend (porta 8000, /healthz probe)
 *   backend-svc.yml         — Service ClusterIP do backend (porta 8080)
 *   backend-ingress.yml     — Ingress com TLS para o domínio backend
 *   redis-deploy.yml        — Redis 7 Alpine (single instance, sem persistência)
 *   redis-svc.yml           — Service ClusterIP do Redis (porta 6379)
 *   kustomization.yml       — Lista todos os 10 recursos
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

function ns(name: string): string {
  return `# Namespace: ${name}
apiVersion: v1
kind: Namespace
metadata:
  name: ${name}
  labels:
    app.kubernetes.io/part-of: ${name}
    environment: production
    istio.io/dataplane-mode: ambient
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
`;
}

function middleware(name: string): string {
  return `apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-https
  namespace: ${name}
spec:
  redirectScheme:
    scheme: https
    permanent: true
`;
}

function frontendDeploy(name: string, image: string): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-frontend
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-frontend
    app.kubernetes.io/component: frontend
    app.kubernetes.io/part-of: ${name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: ${name}-frontend
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ${name}-frontend
        app.kubernetes.io/component: frontend
    spec:
      containers:
        - name: ${name}-frontend
          image: ${image}-frontend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
              name: http
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            requests:
              memory: 128Mi
              cpu: 100m
            limits:
              memory: 256Mi
              cpu: 500m
`;
}

function frontendSvc(name: string): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}-frontend
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-frontend
    app.kubernetes.io/part-of: ${name}
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: ${name}-frontend
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
`;
}

function frontendIngress(name: string, domain: string): string {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}-frontend-ingress
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-frontend-ingress
    app.kubernetes.io/part-of: ${name}
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.middlewares: ${name}-redirect-https@kubernetescrd
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - ${domain}
      secretName: ${name}-frontend-tls
  rules:
    - host: ${domain}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${name}-frontend
                port:
                  number: 80
`;
}

function backendDeploy(name: string, image: string): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-backend
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-backend
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: ${name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: ${name}-backend
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ${name}-backend
        app.kubernetes.io/component: backend
    spec:
      containers:
        - name: ${name}-backend
          image: ${image}-backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8000
              name: http
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8000
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            requests:
              memory: 512Mi
              cpu: 250m
            limits:
              memory: 1Gi
              cpu: 1000m
`;
}

function backendSvc(name: string): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}-backend
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-backend
    app.kubernetes.io/part-of: ${name}
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: ${name}-backend
  ports:
    - port: 8080
      targetPort: 8000
      protocol: TCP
`;
}

function backendIngress(name: string, domain: string): string {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}-backend-ingress
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-backend-ingress
    app.kubernetes.io/part-of: ${name}
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.middlewares: ${name}-redirect-https@kubernetescrd
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - ${domain}
      secretName: ${name}-backend-tls
  rules:
    - host: ${domain}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${name}-backend
                port:
                  number: 8080
`;
}

function redisDeploy(name: string): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}-redis
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-redis
    app.kubernetes.io/component: cache
    app.kubernetes.io/part-of: ${name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: ${name}-redis
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ${name}-redis
        app.kubernetes.io/component: cache
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 6379
              name: redis
          resources:
            requests:
              memory: 32Mi
              cpu: 25m
            limits:
              memory: 128Mi
              cpu: 100m
`;
}

function redisSvc(name: string): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${name}-redis
  namespace: ${name}
  labels:
    app.kubernetes.io/name: ${name}-redis
    app.kubernetes.io/part-of: ${name}
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: ${name}-redis
  ports:
    - port: 6379
      targetPort: 6379
      protocol: TCP
`;
}

function kustomization(name: string): string {
  return `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yml
  - middleware-https.yml
  - frontend-deploy.yml
  - frontend-svc.yml
  - frontend-ingress.yml
  - backend-deploy.yml
  - backend-svc.yml
  - backend-ingress.yml
  - redis-deploy.yml
  - redis-svc.yml

commonLabels:
  app.kubernetes.io/part-of: ${name}
  environment: production
`;
}

export function scaffoldFullstack(infraPath: string, name: string, frontendDomain: string, backendDomain: string, image: string): void {
  const outDir = join(infraPath, `apps/prod/${name}`);
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "namespace.yml"), ns(name));
  writeFileSync(join(outDir, "middleware-https.yml"), middleware(name));
  writeFileSync(join(outDir, "frontend-deploy.yml"), frontendDeploy(name, image));
  writeFileSync(join(outDir, "frontend-svc.yml"), frontendSvc(name));
  writeFileSync(join(outDir, "frontend-ingress.yml"), frontendIngress(name, frontendDomain));
  writeFileSync(join(outDir, "backend-deploy.yml"), backendDeploy(name, image));
  writeFileSync(join(outDir, "backend-svc.yml"), backendSvc(name));
  writeFileSync(join(outDir, "backend-ingress.yml"), backendIngress(name, backendDomain));
  writeFileSync(join(outDir, "redis-deploy.yml"), redisDeploy(name));
  writeFileSync(join(outDir, "redis-svc.yml"), redisSvc(name));
  writeFileSync(join(outDir, "kustomization.yml"), kustomization(name));

  writeFileSync(join(infraPath, `core/namespaces/${name}.yml`), ns(name));
}
