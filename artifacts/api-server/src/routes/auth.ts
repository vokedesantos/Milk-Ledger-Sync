import { Router, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";

const router = Router();

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash })
    .returning();

  req.session.userId = user.id;
  res.status(201).json({
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    },
    message: "Account created successfully",
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  req.session.userId = user.id;
  res.json({
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    },
    message: "Logged in successfully",
  });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

router.get("/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
