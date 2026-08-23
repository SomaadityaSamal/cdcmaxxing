import { chromium } from "playwright";
import { cleanText, dedupeProducts, parseCatalogPrice, supermarketCategoryFor, supermarketFillerOnly } from "./helpers";
import type { ScrapedProduct } from "./types";

const BASE_URL = "https://www.fairprice.com.sg/";

const TARGETS = [
  { url: "https://www.fairprice.com.sg/search?query=fairprice%20brand", category: "Housebrand" },
  { url: "https://www.fairprice.com.sg/search?query=snacks", category: "Snacks" },
  { url: "https://www.fairprice.com.sg/search?query=drinks", category: "Beverages" },
  { url: "https://www.fairprice.com.sg/search?query=canned%20food", category: "Canned Food" }
];

export async function scrapeFairPrice() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "CDCMaximizerBot/0.1 (+local price filler scraper)"
  });
  const domProducts: ScrapedProduct[] = [];

  try {
    for (const target of TARGETS) {
      const navigation = await page
        .goto(target.url, { waitUntil: "domcontentloaded", timeout: 60000 })
        .catch((error) => {
          console.warn(`Skipping ${target.url}: ${error.message}`);
          return null;
        });
      if (!navigation) {
        continue;
      }
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(1500);

      const pageProducts = await page.evaluate(
        (args) => {
          const { baseUrl, category } = args as { baseUrl: string; category: string };
          const elements = Array.from(document.querySelectorAll("[data-testid*='product'], article, [class*='product']"));
          return elements
            .map((element) => {
              const text = element.textContent || "";
              const anchor = element.querySelector("a") as HTMLAnchorElement | null;
              const img = element.querySelector("img") as HTMLImageElement | null;
              const name =
                anchor?.getAttribute("aria-label") ||
                anchor?.getAttribute("title") ||
                (text.split("$")[0] || "").trim();
              return {
                storeId: "fairprice",
                name,
                priceText: text,
                category,
                productUrl: anchor?.href || baseUrl,
                imageUrl: img?.getAttribute("src") || img?.currentSrc || img?.src || ""
              };
            })
            .filter((item) => item.name && item.priceText.includes("$"));
        },
        { baseUrl: BASE_URL, category: target.category }
      );

      for (const product of pageProducts) {
        const price = parseCatalogPrice(product.priceText);
        if (price !== null) {
          domProducts.push({
            storeId: "fairprice",
            name: cleanText(product.name),
            price,
            category: supermarketCategoryFor(product),
            imageUrl: product.imageUrl,
            productUrl: product.productUrl
          });
        }
      }
    }
  } finally {
    await browser.close();
  }

  return dedupeProducts(domProducts).filter(supermarketFillerOnly);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeFairPrice()
    .then((products) => {
      console.log(JSON.stringify(products, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
