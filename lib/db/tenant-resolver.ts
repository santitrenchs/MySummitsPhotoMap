import { PrismaClient } from "@prisma/client";
import { prisma } from "./client";

/**
 * Tenant Database Resolver
 *
 * This is the single abstraction that enables per-tenant database isolation.
 * ALL services must go through this function — never import `prisma` directly
 * in service files.
 *
 * Current behavior:  all tenants share the global DB → returns shared client.
 * Future behavior:   if a tenant has `dbUrl` set, returns a dedicated
 *                    PrismaClient scoped to that tenant's database.
 *
 * Migrating a tenant to its own DB = set Tenant.dbUrl. Zero code changes needed.
 */

// Cache dedicated connections to avoid pool exhaustion
const tenantConnections = new Map<string, PrismaClient>();

export async function getTenantConnection(
  tenantId: string
): Promise<PrismaClient> {
  // Load tenant config from control plane (always in shared DB)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { dbUrl: true },
  });

  // No dedicated DB → use the shared global connection
  if (!tenant?.dbUrl) {
    return prisma;
  }

  // Dedicated DB → cache the connection per tenantId
  if (!tenantConnections.has(tenantId)) {
    const dedicated = new PrismaClient({
      datasources: { db: { url: tenant.dbUrl } },
      log: ["error"],
    });
    tenantConnections.set(tenantId, dedicated);
  }

  return tenantConnections.get(tenantId)!;
}
