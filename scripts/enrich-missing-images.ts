import { PrismaClient } from "@prisma/client";
import {
  getLocalProductsMissingImages,
  getLocalStores,
  updateLocalProductImage
} from "../lib/local-catalog-db";
import type { ProductDto, StoreDto } from "../lib/types";

const GOOGLE_API_URL = "https://www.googleapis.com/customsearch/v1";
const USER_AGENT = "Mozilla/5.0 (compatible; CDCMaximizerBot/0.1; +local image fallback)";

function cleanImageUrl(value: string | undefined | null) {
  if (!value) {
    return "";
  }

  const decoded = value
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();

  if (!/^https?:\/\//i.test(decoded) || decoded.startsWith("data:")) {
    return "";
  }

  return decoded;
}

function firstImageFromJson(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return cleanImageUrl(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = firstImageFromJson(item);
      if (image) {
        return image;
      }
    }
    return "";
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return firstImageFromJson(record.url) || firstImageFromJson(record.contentUrl);
  }

  return "";
}

function extractProductPageImage(html: string) {
  const metaPatterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /"image"\s*:\s*"([^"]+)"/i
  ];

  for (const pattern of metaPatterns) {
    const image = cleanImageUrl(html.match(pattern)?.[1]);
    if (image) {
      return image;
    }
  }

  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const image = firstImageFromJson(parsed?.image);
      if (image) {
        return image;
      }
    } catch {
      // Ignore malformed page-embedded JSON and continue to other fallbacks.
    }
  }

  return cleanImageUrl(html.match(/https:\/\/[^"'<> ]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'<> ]*)?/i)?.[0]);
}

async function imageFromProductPage(productUrl: string) {
  if (!productUrl || !/^https?:\/\//i.test(productUrl)) {
    return "";
  }

  const response = await fetch(productUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml"
    }
  }).catch(() => null);

  if (!response?.ok) {
    return "";
  }

  return extractProductPageImage(await response.text());
}

function googleSearchEnabled() {
  return Boolean(process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_CX);
}

async function imageFromGoogle(product: ProductDto, store?: StoreDto) {
  const key = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (!key || !cx) {
    return "";
  }

  const query = `${store?.name ?? product.storeId} ${product.name} product image`;
  const url = new URL(GOOGLE_API_URL);
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("safe", "active");
  url.searchParams.set("num", "5");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/json"
    }
  }).catch(() => null);

  if (!response?.ok) {
    console.warn(`Google image search failed for ${product.name}: ${response?.status ?? "network error"}`);
    return "";
  }

  const data = (await response.json()) as { items?: Array<{ link?: string; image?: { thumbnailLink?: string } }> };
  for (const item of data.items ?? []) {
    const image = cleanImageUrl(item.link) || cleanImageUrl(item.image?.thumbnailLink);
    if (image) {
      return image;
    }
  }

  return "";
}

async function enrichProduct(product: ProductDto, store?: StoreDto) {
  const pageImage = await imageFromProductPage(product.productUrl);
  if (pageImage) {
    return { imageUrl: pageImage, source: "product-page" };
  }

  const googleImage = await imageFromGoogle(product, store);
  if (googleImage) {
    return { imageUrl: googleImage, source: "google-image-search" };
  }

  return { imageUrl: "", source: "none" };
}

async function enrichLocalProducts(storeId?: string) {
  const stores = getLocalStores();
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const products = getLocalProductsMissingImages(storeId, Number(process.env.IMAGE_ENRICH_LIMIT ?? 100));

  console.log(`Found ${products.length} local products missing images`);
  if (!googleSearchEnabled()) {
    console.log("Google image fallback is available when GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX are set.");
  }

  let updated = 0;
  for (const product of products) {
    const result = await enrichProduct(product, storesById.get(product.storeId));
    if (!result.imageUrl) {
      console.log(`No image found: ${product.name}`);
      continue;
    }

    updateLocalProductImage(product.id, result.imageUrl);
    updated += 1;
    console.log(`Updated ${product.name} from ${result.source}`);
  }

  return updated;
}

async function enrichPrismaProducts(storeId?: string) {
  const prisma = new PrismaClient();
  try {
    const [stores, products] = await Promise.all([
      prisma.store.findMany(),
      prisma.product.findMany({
        where: {
          imageUrl: "",
          ...(storeId ? { storeId } : {})
        },
        orderBy: [{ storeId: "asc" }, { price: "asc" }],
        take: Number(process.env.IMAGE_ENRICH_LIMIT ?? 100)
      })
    ]);
    const storesById = new Map(stores.map((store) => [store.id, store]));

    console.log(`Found ${products.length} Prisma products missing images`);
    if (!googleSearchEnabled()) {
      console.log("Google image fallback is available when GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_CX are set.");
    }

    let updated = 0;
    for (const product of products) {
      const productDto: ProductDto = {
        id: product.id,
        storeId: product.storeId,
        name: product.name,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
        lastUpdated: product.lastUpdated.toISOString()
      };
      const result = await enrichProduct(productDto, storesById.get(product.storeId));
      if (!result.imageUrl) {
        console.log(`No image found: ${product.name}`);
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: result.imageUrl }
      });
      updated += 1;
      console.log(`Updated ${product.name} from ${result.source}`);
    }

    return updated;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const storeId = process.argv.find((arg) => arg.startsWith("--store="))?.split("=")[1];
  const updated = process.env.DATABASE_URL ? await enrichPrismaProducts(storeId) : await enrichLocalProducts(storeId);
  console.log(`Updated ${updated} product images`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
