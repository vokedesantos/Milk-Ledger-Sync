import { Router, Request, Response } from "express";
import { db, recordsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  CreateRecordBody,
  ListRecordsQueryParams,
  GetRecordParams,
  DeleteRecordParams,
} from "@workspace/api-zod";

const router = Router();

function requireAuth(req: Request, res: Response): number | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId;
}

function formatRecord(r: typeof recordsTable.$inferSelect) {
  return {
    id: r.id,
    userId: r.userId,
    type: r.type,
    personName: r.personName,
    phone: r.phone ?? null,
    date: r.date,
    amountLitres: parseFloat(r.amountLitres),
    pricePerLitre: parseFloat(r.pricePerLitre),
    totalPrice: parseFloat(r.totalPrice),
    localId: r.localId,
    synced: r.synced,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = ListRecordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const { type, startDate, endDate } = parsed.data;

  const conditions = [eq(recordsTable.userId, userId)];
  if (type) conditions.push(eq(recordsTable.type, type as "farmer" | "customer"));
  if (startDate) conditions.push(gte(recordsTable.date, startDate));
  if (endDate) conditions.push(lte(recordsTable.date, endDate));

  const records = await db
    .select()
    .from(recordsTable)
    .where(and(...conditions))
    .orderBy(desc(recordsTable.createdAt));

  res.json(records.map(formatRecord));
});

router.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { type, personName, phone, date, amountLitres, pricePerLitre, localId } =
    parsed.data;

  const totalPrice = Number(amountLitres) * Number(pricePerLitre);

  const [record] = await db
    .insert(recordsTable)
    .values({
      userId,
      type: type as "farmer" | "customer",
      personName,
      phone: phone ?? null,
      date,
      amountLitres: String(amountLitres),
      pricePerLitre: String(pricePerLitre),
      totalPrice: String(totalPrice),
      localId: localId ?? null,
      synced: true,
    })
    .returning();

  res.status(201).json(formatRecord(record));
});

router.get("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = GetRecordParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [record] = await db
    .select()
    .from(recordsTable)
    .where(
      and(
        eq(recordsTable.id, parsed.data.id),
        eq(recordsTable.userId, userId)
      )
    )
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  res.json(formatRecord(record));
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = DeleteRecordParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [record] = await db
    .select()
    .from(recordsTable)
    .where(
      and(
        eq(recordsTable.id, parsed.data.id),
        eq(recordsTable.userId, userId)
      )
    )
    .limit(1);

  if (!record) {
    res.status(404).json({ error: "Record not found" });
    return;
  }

  await db
    .delete(recordsTable)
    .where(eq(recordsTable.id, parsed.data.id));

  res.json({ message: "Record deleted" });
});

export default router;
