import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const recordTypeEnum = pgEnum("record_type", ["farmer", "customer"]);

export const recordsTable = pgTable("records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: recordTypeEnum("type").notNull(),
  personName: text("person_name").notNull(),
  date: text("date").notNull(),
  amountLitres: numeric("amount_litres", { precision: 10, scale: 2 }).notNull(),
  pricePerLitre: numeric("price_per_litre", {
    precision: 10,
    scale: 2,
  }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  localId: text("local_id"),
  synced: boolean("synced").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecordSchema = createInsertSchema(recordsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type Record = typeof recordsTable.$inferSelect;
