import { Router, Request, Response } from "express";
import { db, recordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SyncRecordsBody } from "@workspace/api-zod";

const router = Router();

function requireAuth(req: Request, res: Response): number | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId;
}

router.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = SyncRecordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { records } = parsed.data;
  const inserted: (typeof recordsTable.$inferSelect)[] = [];

  for (const record of records) {
    const { type, personName, date, amountLitres, pricePerLitre, localId } =
      record;
    const totalPrice = Number(amountLitres) * Number(pricePerLitre);

    const [r] = await db
      .insert(recordsTable)
      .values({
        userId,
        type: type as "farmer" | "customer",
        personName,
        date,
        amountLitres: String(amountLitres),
        pricePerLitre: String(pricePerLitre),
        totalPrice: String(totalPrice),
        localId: localId ?? null,
        synced: true,
      })
      .returning();
    inserted.push(r);
  }

  res.json({
    synced: inserted.length,
    records: inserted.map((r) => ({
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
    })),
  });
});

export default router;
