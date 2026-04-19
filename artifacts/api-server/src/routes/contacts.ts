import { Router, Request, Response } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateContactBody } from "@workspace/api-zod";

const router = Router();

const DEFAULT_USER_ID = 1;

function requireAuth(_req: Request, _res: Response): number | null {
  return DEFAULT_USER_ID;
}

function formatContact(c: typeof contactsTable.$inferSelect) {
  return {
    id: c.id,
    userId: c.userId,
    type: c.type,
    name: c.name,
    phone: c.phone ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { type } = req.query;
  const conditions = [eq(contactsTable.userId, userId)];
  if (type === "farmer" || type === "customer") {
    conditions.push(eq(contactsTable.type, type));
  }

  const contacts = await db
    .select()
    .from(contactsTable)
    .where(and(...conditions))
    .orderBy(contactsTable.name);

  res.json(contacts.map(formatContact));
});

router.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { type, name, phone } = parsed.data;

  const [contact] = await db
    .insert(contactsTable)
    .values({
      userId,
      type: type as "farmer" | "customer",
      name,
      phone: phone ?? null,
    })
    .returning();

  res.status(201).json(formatContact(contact));
});

router.put("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const existing = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, userId)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const { type, name, phone } = parsed.data;

  const [contact] = await db
    .update(contactsTable)
    .set({ type: type as "farmer" | "customer", name, phone: phone ?? null })
    .where(eq(contactsTable.id, id))
    .returning();

  res.json(formatContact(contact));
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const existing = await db
    .select()
    .from(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, userId)))
    .limit(1);

  if (!existing.length) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  await db.delete(contactsTable).where(eq(contactsTable.id, id));
  res.json({ message: "Contact deleted" });
});

export default router;
