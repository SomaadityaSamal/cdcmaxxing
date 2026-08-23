import assert from "node:assert/strict";
import { optimizeCart, generateVoucherTargets } from "@/lib/optimizer";
import { sampleProducts } from "@/lib/sample-data";

const targets = generateVoucherTargets(16.5, "venus", 4);
assert.deepEqual(
  targets.map((target) => target.amount),
  [17, 18, 19, 20]
);
assert.deepEqual(
  targets.map((target) => target.gap),
  [0.5, 1.5, 2.5, 3.5]
);

const supermarketTargets = generateVoucherTargets(16.5, "fairprice", 4);
assert.deepEqual(
  supermarketTargets.map((target) => target.amount),
  [20, 30, 40, 50]
);
assert.deepEqual(
  supermarketTargets[0].voucherMix,
  [10, 10]
);

const result = optimizeCart(16.5, "fairprice", sampleProducts);
assert.equal(result.targets[0].amount, 20);
assert.equal(result.targets[0].gap, 3.5);

const exact = optimizeCart(16.2, "venus", sampleProducts);
assert.equal(exact.recommendations.some((recommendation) => recommendation.exact), true);

const biggerItem = optimizeCart(
  52.5,
  "venus",
  [
    ...sampleProducts,
    {
      id: "demo-vb-5",
      storeId: "venus",
      name: "Family Shampoo",
      price: 7.5,
      category: "Hair Care",
      imageUrl: "",
      productUrl: "https://www.venusbeauty.com.sg/",
      lastUpdated: new Date().toISOString()
    }
  ],
  { targetLimit: 10 }
);
assert.equal(biggerItem.singleRecommendations.some((recommendation) => recommendation.itemsTotal === 7.5), true);

const singleItemProgress = optimizeCart(16.5, "fairprice", sampleProducts);
assert.equal(singleItemProgress.singleRecommendations.every((recommendation) => recommendation.kind === "single"), true);

console.log("optimizer tests passed");
