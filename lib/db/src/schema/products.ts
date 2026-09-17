import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const productsTable = pgTable("pharmacy_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  generic: text("generic").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").notNull().default(0),
  reorder: integer("reorder").notNull().default(0),
  accent: text("accent").notNull().default("teal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;