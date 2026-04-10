import { spawnSync } from "child_process";
import { join } from "path";

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
