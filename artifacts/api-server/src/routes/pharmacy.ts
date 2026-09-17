import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db, productsTable, salesTable, type StoredSaleLine } from "@workspace/db";
import {
  CreateSaleBody,
  CreateSaleResponse,
  GetSaleParams,
  GetSaleResponse,
  ListProductsResponse,
  ListSalesResponse,
  UpdateProductBody,
  UpdateProductParams,
  UpdateProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const seedProducts = [
  { name: "Dolo 650", generic: "Paracetamol 650mg", category: "Pain relief", unit: "15 tablets", price: 32, stock: 12, reorder: 20, accent: "coral" },
  { name: "Azithral 500", generic: "Azithromycin 500mg", category: "Antibiotic", unit: "5 tablets", price: 118, stock: 42, reorder: 15, accent: "teal" },
  { name: "Cetirizine 10mg", generic: "Cetirizine Hydrochloride", category: "Allergy", unit: "10 tablets", price: 24, stock: 8, reorder: 18, accent: "gold" },
  { name: "Shelcal 500", generic: "Calcium + Vitamin D3", category: "Vitamins", unit: "15 tablets", price: 105, stock: 67, reorder: 20, accent: "lilac" },
  { name: "ORS Apple", generic: "Oral Rehydration Salts", category: "Wellness", unit: "200ml sachet", price: 22, stock: 31, reorder: 15, accent: "sky" },
  { name: "Volini Gel", generic: "Diclofenac Pain Relief", category: "Pain relief", unit: "30g tube", price: 92, stock: 6, reorder: 12, accent: "coral" },
  { name: "Pantocid 40", generic: "Pantoprazole 40mg", category: "Digestive", unit: "15 tablets", price: 146, stock: 26, reorder: 12, accent: "teal" },
  { name: "Becosules", generic: "B-Complex Vitamins", category: "Vitamins", unit: "20 capsules", price: 48, stock: 4, reorder: 15, accent: "gold" },
  { name: "Moov Spray", generic: "Topical Analgesic", category: "Pain relief", unit: "80g can", price: 165, stock: 19, reorder: 10, accent: "lilac" },
];

const seedSales = [
  { billNumber: "PF-240621-018", customer: "Anita Sharma", lines: [{ productId: 1, name: "Dolo 650", quantity: 2, unitPrice: 32, lineTotal: 64 }, { productId: 5, name: "ORS Apple", quantity: 1, unitPrice: 22, lineTotal: 22 }, { productId: 7, name: "Pantocid 40", quantity: 1, unitPrice: 146, lineTotal: 146 }], amount: 242, method: "UPI", status: "Paid" },
  { billNumber: "PF-240621-017", customer: "Walk-in customer", lines: [{ productId: 4, name: "Shelcal 500", quantity: 1, unitPrice: 105, lineTotal: 105 }], amount: 105, method: "Cash", status: "Paid" },
  { billNumber: "PF-240621-016", customer: "Rajesh Kumar", lines: [{ productId: 2, name: "Azithral 500", quantity: 1, unitPrice: 118, lineTotal: 118 }, { productId: 7, name: "Pantocid 40", quantity: 1, unitPrice: 146, lineTotal: 146 }], amount: 264, method: "Card", status: "Paid" },
  { billNumber: "PF-240621-015", customer: "Meera Joshi", lines: [{ productId: 8, name: "Becosules", quantity: 2, unitPrice: 48, lineTotal: 96 }, { productId: 3, name: "Cetirizine 10mg", quantity: 1, unitPrice: 24, lineTotal: 24 }], amount: 120, method: "UPI", status: "Paid" },
  { billNumber: "PF-240621-014", customer: "Walk-in customer", lines: [{ productId: 6, name: "Volini Gel", quantity: 1, unitPrice: 92, lineTotal: 92 }], amount: 92, method: "Cash", status: "Paid" },
];

let seedPromise: Promise<void> | null = null;

async function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existingProducts = await db.select({ id: productsTable.id }).from(productsTable).limit(1);
      if (existingProducts.length === 0) {
        await db.insert(productsTable).values(seedProducts);
      }
      const existingSales = await db.select({ id: salesTable.id }).from(salesTable).limit(1);
      if (existingSales.length === 0) {
        await db.insert(salesTable).values(seedSales);
      }
      const currentProducts = await db.select().from(productsTable);
      const seedKeys = new Set(seedProducts.map((product) => [product.name, product.generic, product.category, product.unit, product.price, product.reorder, product.accent].join("|")));
      const duplicateGroups = new Map<string, typeof currentProducts>();
      for (const product of currentProducts) {
        const key = [product.name, product.generic, product.category, product.unit, Number(product.price), product.reorder, product.accent].join("|");
        if (!seedKeys.has(key)) continue;
        const group = duplicateGroups.get(key) ?? [];
        group.push(product);
        duplicateGroups.set(key, group);
      }
      for (const group of duplicateGroups.values()) {
        if (group.length < 2) continue;
        for (const product of group.slice(1)) {
          await db.delete(productsTable).where(eq(productsTable.id, product.id));
        }
      }
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}

function toApiSale(sale: typeof salesTable.$inferSelect) {
  return {
    ...sale,
    amount: Number(sale.amount),
    lines: sale.lines,
    createdAt: sale.createdAt.toISOString(),
  };
}

router.get("/products", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  res.json(ListProductsResponse.parse(products));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid product update" });
    return;
  }
  const [product] = await db.update(productsTable).set(body.data).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateProductResponse.parse(product));
});

router.get("/sales", async (_req, res): Promise<void> => {
  await ensureSeedData();
  const sales = await db.select().from(salesTable).orderBy(desc(salesTable.createdAt));
  res.json(ListSalesResponse.parse(sales.map(toApiSale)));
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid sale id" });
    return;
  }
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, params.data.id));
  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }
  res.json(GetSaleResponse.parse(toApiSale(sale)));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const sale = await db.transaction(async (tx) => {
      const lines: StoredSaleLine[] = [];
      for (const requestedLine of parsed.data.lines) {
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, requestedLine.productId));
        if (!product) {
          throw new Error("One of the selected products no longer exists.");
        }
        if (product.stock < requestedLine.quantity) {
          throw new Error(`${product.name} does not have enough stock.`);
        }
        lines.push({
          productId: product.id,
          name: product.name,
          quantity: requestedLine.quantity,
          unitPrice: Number(product.price),
          lineTotal: Number(product.price) * requestedLine.quantity,
        });
        await tx.update(productsTable).set({ stock: product.stock - requestedLine.quantity }).where(eq(productsTable.id, product.id));
      }
      const amount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const [created] = await tx.insert(salesTable).values({
        billNumber: `VP-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`,
        customer: parsed.data.customer,
        lines,
        amount,
        method: parsed.data.method,
        status: "Paid",
      }).returning();
      return created;
    });
    res.status(201).json(CreateSaleResponse.parse(toApiSale(sale)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create sale";
    res.status(400).json({ error: message });
  }
});

export default router;