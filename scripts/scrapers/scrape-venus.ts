import axios from "axios";
import * as cheerio from "cheerio";
import { absolutize, cleanText, dedupeProducts, lowCostOnly, parsePrice } from "./helpers";
import type { ScrapedProduct } from "./types";

const BASE_URL = "https://www.venusbeauty.com.sg/";

const TARGETS = [
  {
    url: "https://www.venusbeauty.com.sg/e-shop/oralcare/accessories.html",
    category: "Oral Care"
  },
  {
    url: "https://www.venusbeauty.com.sg/e-shop/body-care/wipes-accessories.html",
    category: "Wipes & Accessories"
  },
  {
    url: "https://www.venusbeauty.com.sg/e-shop/skincare/wipes-blotters.html",
    category: "Skin Care Wipes"
  },
  {
    url: "https://www.venusbeauty.com.sg/e-shop/lifestyle/travel-easy.html",
    category: "Travel"
  },
  {
    url: "https://www.venusbeauty.com.sg/e-shop.html/onedollar.html",
    category: "One Dollar"
  }
];

export async function scrapeVenus() {
  const products: ScrapedProduct[] = [];

  for (const target of TARGETS) {
    const response = await axios
      .get(target.url, {
        headers: {
          "User-Agent": "CDCMaximizerBot/0.1 (+local price filler scraper)"
        },
        timeout: 30000
      })
      .catch((error) => {
        console.warn(`Skipping ${target.url}: ${error.response?.status ?? error.message}`);
        return null;
      });
    if (!response) {
      continue;
    }

    const $ = cheerio.load(response.data);

    $(".product-item-info, li.product-item, .item.product").each((_, element) => {
      const card = $(element);
      const name = cleanText(
        card.find(".product-item-link").first().text() ||
          card.find(".product-name a").first().text() ||
          card.find("a[title]").first().attr("title")
      );
      const price = parsePrice(card.find(".price").first().text());
      const productUrl = absolutize(
        card.find(".product-item-link").first().attr("href") || card.find("a").first().attr("href"),
        BASE_URL
      );
      const imageUrl = absolutize(
        card.find("img.product-image-photo").first().attr("src") ||
          card.find("img").first().attr("data-src") ||
          card.find("img").first().attr("src"),
        BASE_URL
      );

      if (price !== null) {
        products.push({
          storeId: "venus",
          name,
          price,
          category: target.category,
          imageUrl,
          productUrl
        });
      }
    });
  }

  return dedupeProducts(products).filter(lowCostOnly);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeVenus()
    .then((products) => {
      console.log(JSON.stringify(products, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
