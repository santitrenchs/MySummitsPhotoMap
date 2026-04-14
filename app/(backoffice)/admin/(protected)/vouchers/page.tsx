import { prisma } from "@/lib/db/client";
import { VouchersClient } from "./VouchersClient";

export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uses: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { usedAt: "asc" },
      },
    },
  });

  return <VouchersClient initialVouchers={vouchers} />;
}
