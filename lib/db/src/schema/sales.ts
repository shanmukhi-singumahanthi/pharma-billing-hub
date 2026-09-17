import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type StoredSaleLine = {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export const salesTable = pgTable("pharmacy_sales", {
  id: serial("id").primaryKey(),
  billNumber: text("bill_number").notNull().unique(),
  customer: text("customer").notNull(),
  lines: jsonb("lines").$type<StoredSaleLine[]>().notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull().default("Paid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;