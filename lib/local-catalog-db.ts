import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ProductDto, StoreDto } from "@/lib/types";

type ProductInput = Omit<ProductDto, "id" | "lastUpdated">;

const DEFAULT_DB_PATH = join(process.cwd(), "data", "catalog.sqlite");

export const catalogDbPath = process.env.CATALOG_DB_PATH ?? DEFAULT_DB_PATH;

export const initialStores: StoreDto[] = [
  {
    id: "fairprice",
    name: "NTUC FairPrice",
    cdcType: "Supermarket",
    baseUrl: "https://www.fairprice.com.sg/"
  },
  {
    id: "shengsiong",
    name: "Sheng Siong",
    cdcType: "Supermarket",
    baseUrl: "https://shengsiong.com.sg/"
  },
  {
    id: "venus",
    name: "Venus Beauty",
    cdcType: "Merchant",
    baseUrl: "https://www.venusbeauty.com.sg/"
  }
];

function openCatalogDb() {
  mkdirSync(dirname(catalogDbPath), { recursive: true });
  const db = new DatabaseSync(catalogDbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

function productId(storeId: string, productUrl: string) {
  return createHash("sha1").update(`${storeId}:${productUrl}`).digest("hex");
}

export function initLocalCatalogDb() {
  const db = openCatalogDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cdcType TEXT NOT NULL CHECK (cdcType IN ('Supermarket', 'Merchant')),
      baseUrl TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      storeId TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      productUrl TEXT NOT NULL,
      lastUpdated TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (storeId, productUrl)
    );

    CREATE INDEX IF NOT EXISTS products_store_price_idx ON products(storeId, price);
    CREATE INDEX IF NOT EXISTS products_last_updated_idx ON products(lastUpdated);
  `);
  return db;
}

export function seedLocalStores(stores = initialStores) {
  const db = initLocalCatalogDb();
  const statement = db.prepare(`
    INSERT INTO stores (id, name, cdcType, baseUrl, updatedAt)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      cdcType = excluded.cdcType,
      baseUrl = excluded.baseUrl,
      updatedAt = CURRENT_TIMESTAMP
  `);

  for (const store of stores) {
    statement.run(store.id, store.name, store.cdcType, store.baseUrl);
  }

  db.close();
}

export function upsertLocalProducts(products: ProductInput[]) {
  const db = initLocalCatalogDb();
  const now = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO products (id, storeId, name, price, category, imageUrl, productUrl, lastUpdated, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(storeId, productUrl) DO UPDATE SET
      name = excluded.name,
      price = excluded.price,
      category = excluded.category,
      imageUrl = excluded.imageUrl,
      lastUpdated = excluded.lastUpdated,
      updatedAt = CURRENT_TIMESTAMP
  `);

  db.exec("BEGIN");
  try {
    for (const product of products) {
      statement.run(
        productId(product.storeId, product.productUrl),
        product.storeId,
        product.name,
        product.price,
        product.category,
        product.imageUrl,
        product.productUrl,
        now
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export function deleteLocalProductsForStore(storeId: string) {
  const db = initLocalCatalogDb();
  const result = db.prepare("DELETE FROM products WHERE storeId = ?").run(storeId);
  db.close();
  return Number(result.changes ?? 0);
}

export function deleteLocalStaleProducts(days = 7) {
  const db = initLocalCatalogDb();
  const staleBefore = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare("DELETE FROM products WHERE lastUpdated < ?").run(staleBefore);
  db.close();
  return Number(result.changes ?? 0);
}

export function getLocalStores() {
  const db = initLocalCatalogDb();
  const stores = db
    .prepare("SELECT id, name, cdcType, baseUrl FROM stores ORDER BY name ASC")
    .all() as StoreDto[];
  db.close();
  return stores;
}

export function getLocalProducts(storeId: string, limit = 150) {
  const db = initLocalCatalogDb();
  const products = db
    .prepare(
      `SELECT id, storeId, name, price, category, imageUrl, productUrl, lastUpdated
       FROM products
       WHERE storeId = ? AND price >= 0.3 AND price < 10
       ORDER BY price ASC
       LIMIT ?`
    )
    .all(storeId, limit) as ProductDto[];
  db.close();
  return products;
}

export function getLocalProductsMissingImages(storeId?: string, limit = 100) {
  const db = initLocalCatalogDb();
  const products = db
    .prepare(
      `SELECT id, storeId, name, price, category, imageUrl, productUrl, lastUpdated
       FROM products
       WHERE imageUrl = '' AND (? IS NULL OR storeId = ?)
       ORDER BY storeId ASC, price ASC
       LIMIT ?`
    )
    .all(storeId ?? null, storeId ?? null, limit) as ProductDto[];
  db.close();
  return products;
}

export function updateLocalProductImage(productId: string, imageUrl: string) {
  const db = initLocalCatalogDb();
  const result = db
    .prepare("UPDATE products SET imageUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?")
    .run(imageUrl, productId);
  db.close();
  return Number(result.changes ?? 0);
}
