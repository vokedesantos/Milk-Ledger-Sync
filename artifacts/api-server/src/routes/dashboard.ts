import { Router, Request, Response } from "express";
import { db, recordsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router = Router();

const DEFAULT_USER_ID = 1;

function requireAuth(_req: Request, _res: Response): number | null {
  return DEFAULT_USER_ID;
}

router.get("/stats", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const farmerStats = await db
    .select({
      totalLitres: sql<number>`COALESCE(SUM(CAST(${recordsTable.amountLitres} AS NUMERIC)), 0)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(${recordsTable.totalPrice} AS NUMERIC)), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(recordsTable)
    .where(
      and(eq(recordsTable.userId, userId), eq(recordsTable.type, "farmer"))
    );

  const customerStats = await db
    .select({
      totalLitres: sql<number>`COALESCE(SUM(CAST(${recordsTable.amountLitres} AS NUMERIC)), 0)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(${recordsTable.totalPrice} AS NUMERIC)), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(recordsTable)
    .where(
      and(eq(recordsTable.userId, userId), eq(recordsTable.type, "customer"))
    );

  const farmer = farmerStats[0];
  const customer = customerStats[0];

  const farmerTotal = parseFloat(String(farmer.totalAmount));
  const customerTotal = parseFloat(String(customer.totalAmount));

  res.json({
    farmerTotalLitres: parseFloat(String(farmer.totalLitres)),
    farmerTotalAmount: farmerTotal,
    farmerRecordCount: parseInt(String(farmer.count)),
    customerTotalLitres: parseFloat(String(customer.totalLitres)),
    customerTotalAmount: customerTotal,
    customerRecordCount: parseInt(String(customer.count)),
    totalRecords:
      parseInt(String(farmer.count)) + parseInt(String(customer.count)),
    netBalance: customerTotal - farmerTotal,
  });
});

router.get("/recent", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 10) : 10;

  const records = await db
    .select()
    .from(recordsTable)
    .where(eq(recordsTable.userId, userId))
    .orderBy(desc(recordsTable.createdAt))
    .limit(Number(limit));

  res.json(
    records.map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type,
      personName: r.personName,
      date: r.date,
      amountLitres: parseFloat(r.amountLitres),
      pricePerLitre: parseFloat(r.pricePerLitre),
      totalPrice: parseFloat(r.totalPrice),
      localId: r.localId,
      synced: r.synced,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
