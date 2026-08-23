import type { Page } from "playwright";
import { cleanText, parsePrice } from "./helpers";
import type { ScrapedProduct } from "./types";

type ProductLike = {
  name?: unknown;
  title?: unknown;
  displayName?: unknown;
  price?: unknown;
  finalPrice?: unknown;
  sellingPrice?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  slug?: unknown;
  url?: unknown;
  productUrl?: unknown;
  category?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? cleanText(value) : "";
}

function readPrice(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parsePrice(value);
  }
  return null;
}

function imageFrom(value: ProductLike) {
  if (typeof value.imageUrl === "string") {
    return value.imageUrl;
  }
  if (typeof value.image === "string") {
    return value.image;
  }
  if (Array.isArray(value.images)) {
    const first = value.images.find((item) => typeof item === "string") ?? value.images[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object" && "url" in first && typeof first.url === "string") {
      return first.url;
    }
  }
  return "";
}

function findProductObjects(value: unknown, results: ProductLike[] = []) {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findProductObjects(item, results);
    }
    return results;
  }

  const record = value as Record<string, unknown>;
  const hasName = typeof record.name === "string" || typeof record.title === "string" || typeof record.displayName === "string";
  const hasPrice =
    typeof record.price === "number" ||
    typeof record.price === "string" ||
    typeof record.finalPrice === "number" ||
    typeof record.sellingPrice === "number";

  if (hasName && hasPrice) {
    results.push(record as ProductLike);
  }

  for (const child of Object.values(record)) {
    findProductObjects(child, results);
  }

  return results;
}

export function collectJsonProducts(
  page: Page,
  storeId: ScrapedProduct["storeId"],
  baseUrl: string,
  fallbackCategory: string
) {
  const products: ScrapedProduct[] = [];

  page.on("response", async (response) => {
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json")) {
      return;
    }

    try {
      const json = await response.json();
      const objects = findProductObjects(json);

      for (const object of objects) {
        const name = readString(object.name) || readString(object.title) || readString(object.displayName);
        const price = readPrice(object.price) ?? readPrice(object.finalPrice) ?? readPrice(object.sellingPrice);
        const rawUrl = readString(object.productUrl) || readString(object.url) || readString(object.slug);
        const productUrl = rawUrl ? new URL(rawUrl, baseUrl).toString() : baseUrl;
        const imageUrl = imageFrom(object);
        const category = readString(object.category) || fallbackCategory;

        if (price !== null) {
          products.push({
            storeId,
            name,
            price,
            category,
            imageUrl: imageUrl ? new URL(imageUrl, baseUrl).toString() : "",
            productUrl
          });
        }
      }
    } catch {
      // Some JSON endpoints are not product payloads. Ignore and keep scraping.
    }
  });

  return products;
}
