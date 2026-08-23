import { PrismaClient } from "@prisma/client";
import {
  catalogDbPath,
  deleteLocalStaleProducts,
  deleteLocalProductsForStore,
  initialStores,
  seedLocalStores,
  upsertLocalProducts
} from "../lib/local-catalog-db";
import { scrapeFairPrice } from "./scrapers/scrape-fairprice";
import { scrapeShengSiong } from "./scrapers/scrape-shengsiong";
import { scrapeVenus } from "./scrapers/scrape-venus";
import type { ScrapedProduct } from "./scrapers/types";

async function ensurePrismaStores(prisma: PrismaClient) {
  for (const store of initialStores) {
    await prisma.store.upsert({
      where: { id: store.id },
      update: store,
      create: store
    });
  }
}

async function upsertPrismaProducts(prisma: PrismaClient, products: ScrapedProduct[]) {
  const now = new Date();

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        storeId_productUrl: {
          storeId: product.storeId,
          productUrl: product.productUrl
        }
      },
      update: {
        name: product.name,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        lastUpdated: now
      },
      create: {
        storeId: product.storeId,
        name: product.name,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        lastUpdated: now
      }
    });
  }
}

async function main() {
  const usePrisma = Boolean(process.env.DATABASE_URL);
  const prisma = usePrisma ? new PrismaClient() : null;

  if (prisma) {
    await ensurePrismaStores(prisma);
  } else {
    seedLocalStores();
    console.log(`Using local SQLite catalog at ${catalogDbPath}`);
  }

  const runs = [
    { name: "Venus Beauty", fn: scrapeVenus },
    { name: "Sheng Siong", fn: scrapeShengSiong },
    { name: "NTUC FairPrice", fn: scrapeFairPrice }
  ];

  for (const run of runs) {
    console.log(`Scraping ${run.name}`);
    const products = await run.fn();
    console.log(`Found ${products.length} low-cost products`);
    const storeId = products[0]?.storeId;
    if (prisma) {
      if (storeId && products.length > 0) {
        await prisma.product.deleteMany({ where: { storeId } });
      }
      await upsertPrismaProducts(prisma, products);
    } else {
      if (storeId && products.length > 0) {
        const deleted = deleteLocalProductsForStore(storeId);
        console.log(`Removed ${deleted} old ${storeId} products`);
      }
      upsertLocalProducts(products);
    }
  }

  if (prisma) {
    const staleBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await prisma.product.deleteMany({
      where: {
        lastUpdated: {
          lt: staleBefore
        }
      }
    });
    console.log(`Deleted ${deleted.count} stale products`);
    await prisma.$disconnect();
  } else {
    const deleted = deleteLocalStaleProducts();
    console.log(`Deleted ${deleted} stale products`);
  }
}

main()
  .then(() => undefined)
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
