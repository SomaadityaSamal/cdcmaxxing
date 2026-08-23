import type { ScrapedProduct } from "./types";

export function parsePrice(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  return match ? Number(match[1]) : null;
}

export function parseCatalogPrice(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/\b(?:buy|any)\s+\d+\s+(?:for|at)\s*\$\s*[0-9]+(?:\.[0-9]{1,2})?/gi, " ")
    .replace(/\+\s*\$\s*[0-9]+(?:\.[0-9]{1,2})?\s*deposit/gi, " ")
    .replace(/\b(?:save|spend)\s*\$\s*[0-9]+(?:\.[0-9]{1,2})?/gi, " ")
    .replace(/\+\d+(?=\s*(?:\$|<|$))/g, " ")
    .replace(/-?\b\d+%\s*(?:off)?\b/gi, " ");
  const match = cleaned.replace(/,/g, "").match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  return match ? Number(match[1]) : null;
}

export function absolutize(url: string | undefined | null, baseUrl: string) {
  if (!url) {
    return "";
  }

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return "";
  }
}

export function cleanText(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function dedupeProducts(products: ScrapedProduct[]) {
  const seen = new Set<string>();
  const result: ScrapedProduct[] = [];

  for (const product of products) {
    const cleanedName = cleanProductName(product.name);
    product.name = shouldRecoverName(cleanedName)
      ? recoverNameFromProduct(product.productUrl, product.name) || cleanedName
      : cleanedName;
    if (product.imageUrl.startsWith("data:")) {
      product.imageUrl = "";
    }
    const key = `${product.storeId}:${product.productUrl || product.name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(product);
  }

  return result;
}

export function cleanProductName(value: string) {
  return cleanText(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s*-\s*\d+%\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldRecoverName(value: string) {
  return /^(save|spend|any\s+\d+\s+at|buy\s+\d+\s+(?:for|at))$/i.test(value) || value.length < 3;
}

function recoverNameFromProduct(productUrl: string, rawName: string) {
  const titleMatch = rawName.match(/\b(?:alt|title)=["']([^"']+)["']/i);
  if (titleMatch?.[1]) {
    return cleanProductName(titleMatch[1]);
  }

  try {
    const url = new URL(productUrl);
    const productIndex = url.pathname.split("/").findIndex((part) => part === "product");
    const slug = productIndex >= 0 ? url.pathname.split("/")[productIndex + 1] : "";
    if (!slug || /^\d+$/.test(slug)) {
      return "";
    }

    return slug
      .replace(/-\d{5,}$/g, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

export function lowCostOnly(product: ScrapedProduct) {
  return (
    Number.isFinite(product.price) &&
    product.price >= 0.3 &&
    product.price < 10 &&
    product.name.length > 1 &&
    !shouldRecoverName(product.name) &&
    !product.productUrl.includes("product-listing")
  );
}

export function supermarketFillerOnly(product: ScrapedProduct) {
  if (!lowCostOnly(product)) {
    return false;
  }

  const haystack = `${product.name} ${product.category} ${product.productUrl}`.toLowerCase();
  const productText = `${product.name} ${product.productUrl}`.toLowerCase();
  const excluded = [
    "apple",
    "orange",
    "mandarin",
    "lemon",
    "grapefruit",
    "pear",
    "avocado",
    "grape",
    "red globe",
    "nectarine",
    "plum",
    "carrot",
    "mushroom",
    "garlic",
    "ginger",
    "chilli",
    "pumpkin",
    "lettuce",
    "spinach",
    "qing bai",
    "cai xin",
    "sou miao",
    "xiao bai cai",
    "kai lan",
    "kailan",
    "pak choy",
    "tomato",
    "passion fruit",
    "lady finger",
    "long bean",
    "xiang mai",
    "white sweet corn",
    "diamond cut",
    "fruit",
    "organic malaysia",
    "sustenir singapore",
    "romaine",
    "coral",
    "plastic bag",
    "plastic cup",
    "plastic pail",
    "aluminum foil",
    "battery",
    "fabric softener",
    "bathroom tissue",
    "face towel",
    "compressed expandale",
    "pocket tissue",
    "facial tissue",
    "toilet tissue",
    "durian",
    "steamboat combo",
    "frozen",
    "grouper",
    "dishwashing",
    "wet wiper",
    "prayer package",
    "beer",
    "asahi",
    "bamboo leaves"
  ];
  if (excluded.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  const included = [
    /\bchips?\b/,
    /\bcrackers?\b/,
    /\bbiscuits?\b/,
    /\bwafer\b/,
    /\bcake\b/,
    /\bsnacks?\b/,
    /\bchocolate\b/,
    /\bcereal\b/,
    /\btea\b/,
    /\bcoffee\b/,
    /\bjuice\b/,
    /\bdrinks?\b/,
    /\bdrinking\b/,
    /\bwater\b/,
    /\bcoca-cola\b/,
    /\bsprite\b/,
    /\bpokka\b/,
    /\bmilo\b/,
    /\bsoya\b/,
    /\bcoconut\b/,
    /\bnoodles?\b/,
    /\bsardines?\b/,
    /\btuna\b/,
    /\bbeans?\b/,
    /\bcorn\b/,
    /\bmushrooms?\b/,
    /\bpeanuts?\b/,
    /\bcanned\b/,
    /\bpopcorn\b/
  ];

  return included.some((keyword) => keyword.test(productText));
}

export function supermarketCategoryFor(product: Pick<ScrapedProduct, "name" | "category" | "productUrl">) {
  const haystack = `${product.name} ${product.productUrl}`.toLowerCase();

  if (/\b(canned|luncheon|sardines?|tuna|beans?|longan|stewed)\b|corn box/.test(haystack)) {
    return "Canned Food";
  }

  if (/\b(noodles?|vermicelli|rice|oats|cereal)\b/.test(haystack)) {
    return "Staples";
  }

  if (/\b(chips?|crackers?|biscuits?|wafer|cake|snacks?|chocolate|codfish|chestnut|tortilla|popcorn)\b|prawn crackers/.test(haystack)) {
    return "Snacks";
  }

  if (/\b(drinks?|drinking|water|tea|coffee|juice|sprite|pokka|milo|soya|milkshake|pepsi|sarsi)\b|coca-cola|mountain dew|club soda|yogurt drink|yoghurt drink/.test(haystack)) {
    return "Beverages";
  }

  return product.category;
}
