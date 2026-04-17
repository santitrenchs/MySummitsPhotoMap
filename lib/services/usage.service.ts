// ─── Types ────────────────────────────────────────────────────────────────────

export type R2UsageData = {
  storageBytes: number;
  classAOps: number;
  classBOps: number;
  storageLimitBytes: number;  // 10 GB free
  classALimit: number;        // 1,000,000 / month free
  classBLimit: number;        // 10,000,000 / month free
  fetchedAt: string;
};

export type RailwayService = {
  name: string;
  cpuPercent: number;
  memoryMb: number;
  networkTxGb: number;
};

export type RailwayUsageData = {
  estimatedCostCents: number;
  limitCents: number;
  services: RailwayService[];
  fetchedAt: string;
};

export type UsageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

// ─── Cloudflare R2 ────────────────────────────────────────────────────────────

export async function fetchR2Usage(): Promise<UsageResult<R2UsageData>> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;

  if (!token) return { ok: false, error: "CLOUDFLARE_API_TOKEN no configurado" };
  if (!accountId) return { ok: false, error: "R2_ACCOUNT_ID no configurado" };

  const { start, end } = monthRange();

  // Cloudflare Analytics GraphQL — R2 storage and operations
  const query = `{
    viewer {
      accounts(filter: { accountTag: "${accountId}" }) {
        r2StorageAdaptiveGroups(
          limit: 1
          filter: { date_geq: "${start}", date_leq: "${end}" }
          orderBy: [date_DESC]
        ) {
          max {
            payloadSize
            metadataSize
          }
        }
        r2OperationsAdaptiveGroups(
          limit: 10000
          filter: { date_geq: "${start}", date_leq: "${end}" }
        ) {
          sum { requests }
          dimensions { actionType }
        }
      }
    }
  }`;

  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 300 } as any,
    });

    const json = await res.json();

    if (!res.ok || json.errors?.length) {
      const msg = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: `Cloudflare API: ${msg}` };
    }

    const account = json.data?.viewer?.accounts?.[0];
    if (!account) return { ok: false, error: "Cuenta no encontrada en Cloudflare" };

    const storageGroup = account.r2StorageAdaptiveGroups?.[0];
    const storageBytes =
      (storageGroup?.max?.payloadSize ?? 0) +
      (storageGroup?.max?.metadataSize ?? 0);

    // Class A: write/delete/list ops — Class B: read ops
    const CLASS_A = new Set([
      "PutObject","CopyObject","CreateMultipartUpload","CompleteMultipartUpload",
      "UploadPart","UploadPartCopy","CreateBucket","DeleteBucket","DeleteObject",
      "DeleteObjects","ListBuckets","ListMultipartUploads","ListObjectsV2",
      "ListObjectVersions","ListParts",
    ]);

    let classAOps = 0;
    let classBOps = 0;
    for (const row of (account.r2OperationsAdaptiveGroups ?? [])) {
      const action: string = row.dimensions?.actionType ?? "";
      const count: number = row.sum?.requests ?? 0;
      if (CLASS_A.has(action)) classAOps += count;
      else classBOps += count;
    }

    return {
      ok: true,
      data: {
        storageBytes,
        classAOps,
        classBOps,
        storageLimitBytes: 10 * 1024 ** 3,
        classALimit: 1_000_000,
        classBLimit: 10_000_000,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, error: `Error de red: ${(e as Error).message}` };
  }
}

// ─── Railway ──────────────────────────────────────────────────────────────────

export async function fetchRailwayUsage(): Promise<UsageResult<RailwayUsageData>> {
  const token = process.env.RAILWAY_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;

  if (!token) return { ok: false, error: "RAILWAY_TOKEN no configurado" };
  if (!projectId) return { ok: false, error: "RAILWAY_PROJECT_ID no configurado" };

  const gql = (q: string, vars?: Record<string, unknown>) =>
    fetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: q, variables: vars }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 300 } as any,
    }).then((r) => r.json());

  try {
    // Step 1: Get environments
    const envRes = await gql(`
      query($id: String!) {
        project(id: $id) {
          name
          environments { edges { node { id name } } }
          services { edges { node { id name } } }
        }
      }
    `, { id: projectId });

    if (envRes.errors?.length) {
      return { ok: false, error: envRes.errors[0].message };
    }

    const project = envRes.data?.project;
    if (!project) return { ok: false, error: "Proyecto no encontrado" };

    const productionEnv = (project.environments?.edges ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => e.node)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .find((e: any) => e.name === "production") ??
      project.environments?.edges?.[0]?.node;

    if (!productionEnv) return { ok: false, error: "No se encontró entorno de producción" };

    const envId = productionEnv.id;

    // Step 2: Get metrics per service
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const endDate = now.toISOString();

    const services: RailwayService[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceNodes = (project.services?.edges ?? []).map((e: any) => e.node);

    for (const svc of serviceNodes) {
      try {
        const metricsRes = await gql(`
          query($projectId: String!, $serviceId: String!, $environmentId: String!, $startDate: DateTime!, $endDate: DateTime!) {
            project(id: $projectId) {
              service(id: $serviceId) {
                name
                metrics(
                  environmentId: $environmentId
                  startDate: $startDate
                  endDate: $endDate
                ) {
                  cpuPercentP50
                  memoryUsageGbP50
                  networkTxGbP50
                }
              }
            }
          }
        `, { projectId, serviceId: svc.id, environmentId: envId, startDate, endDate });

        const m = metricsRes.data?.project?.service?.metrics ?? {};
        services.push({
          name: svc.name,
          cpuPercent: Math.round((m.cpuPercentP50 ?? 0) * 10) / 10,
          memoryMb: Math.round((m.memoryUsageGbP50 ?? 0) * 1024),
          networkTxGb: Math.round((m.networkTxGbP50 ?? 0) * 100) / 100,
        });
      } catch {
        services.push({ name: svc.name, cpuPercent: 0, memoryMb: 0, networkTxGb: 0 });
      }
    }

    // Step 3: Estimated cost
    let estimatedCostCents = 0;
    try {
      const costRes = await gql(`
        query($id: String!) {
          project(id: $id) {
            estimatedUsage { estimatedCost }
          }
        }
      `, { id: projectId });
      const cost = costRes.data?.project?.estimatedUsage?.estimatedCost ?? 0;
      estimatedCostCents = Math.round(cost * 100);
    } catch { /* ignore */ }

    return {
      ok: true,
      data: {
        estimatedCostCents,
        limitCents: 500,
        services,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, error: `Error de red: ${(e as Error).message}` };
  }
}
