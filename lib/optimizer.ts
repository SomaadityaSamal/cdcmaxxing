import type { ProductDto } from "@/lib/types";

export type TargetTier = {
  amount: number;
  amountCents: number;
  gap: number;
  gapCents: number;
  voucherMix: number[];
};

export type Recommendation = {
  target: TargetTier;
  products: ProductDto[];
  itemsTotal: number;
  overshoot: number;
  remainingGap: number;
  finalTotal: number;
  exact: boolean;
  reachesTarget: boolean;
  kind: "single" | "combo";
};

export type OptimizationResult = {
  cartSubtotal: number;
  selectedStoreId: string;
  targets: TargetTier[];
  recommendations: Recommendation[];
  singleRecommendations: Recommendation[];
  comboRecommendations: Recommendation[];
};

const DENOMINATIONS = [10, 5, 2];
const SUPERMARKET_ONLY_DENOMINATIONS = [10];
const PRODUCT_PRICE_LIMIT = 10;

function denominationsForStore(selectedStoreId: string) {
  return selectedStoreId === "venus" ? DENOMINATIONS : SUPERMARKET_ONLY_DENOMINATIONS;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(value: number) {
  return Number((value / 100).toFixed(2));
}

function voucherMixForAmount(amount: number, denominations: number[]) {
  const dp: Array<number[] | null> = Array(amount + 1).fill(null);
  dp[0] = [];

  for (let total = 1; total <= amount; total += 1) {
    for (const denomination of denominations) {
      if (total >= denomination && dp[total - denomination]) {
        const candidate = [...dp[total - denomination]!, denomination].sort((a, b) => b - a);
        if (!dp[total] || candidate.length < dp[total]!.length) {
          dp[total] = candidate;
        }
      }
    }
  }

  return dp[amount];
}

export function generateVoucherTargets(cartSubtotal: number, selectedStoreId = "venus", limit = 5): TargetTier[] {
  const subtotalCents = toCents(cartSubtotal);
  const start = Math.ceil(cartSubtotal);
  const targets: TargetTier[] = [];
  const denominations = denominationsForStore(selectedStoreId);

  for (let amount = Math.max(2, start); targets.length < limit && amount <= start + 80; amount += 1) {
    const amountCents = amount * 100;
    if (amountCents <= subtotalCents) {
      continue;
    }

    const voucherMix = voucherMixForAmount(amount, denominations);
    if (!voucherMix) {
      continue;
    }

    targets.push({
      amount,
      amountCents,
      gap: fromCents(amountCents - subtotalCents),
      gapCents: amountCents - subtotalCents,
      voucherMix
    });
  }

  return targets;
}

function combinations(products: ProductDto[], size: number) {
  const result: ProductDto[][] = [];

  function walk(start: number, combo: ProductDto[]) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }

    for (let i = start; i < products.length; i += 1) {
      combo.push(products[i]);
      walk(i + 1, combo);
      combo.pop();
    }
  }

  walk(0, []);
  return result;
}

function rankRecommendations(a: Recommendation, b: Recommendation) {
  if (a.exact !== b.exact) {
    return a.exact ? -1 : 1;
  }

  const aDistance = a.reachesTarget ? a.overshoot : a.remainingGap;
  const bDistance = b.reachesTarget ? b.overshoot : b.remainingGap;
  if (aDistance !== bDistance) {
    return aDistance - bDistance;
  }

  if (a.reachesTarget !== b.reachesTarget) {
    return a.reachesTarget ? -1 : 1;
  }

  if (a.products.length !== b.products.length) {
    return a.products.length - b.products.length;
  }

  if (a.target.gap !== b.target.gap) {
    return a.target.gap - b.target.gap;
  }

  return b.itemsTotal - a.itemsTotal;
}

function buildRecommendation(
  cartSubtotal: number,
  target: TargetTier,
  products: ProductDto[],
  kind: "single" | "combo"
): Recommendation {
  const totalCents = products.reduce((sum, product) => sum + toCents(product.price), 0);
  const finalTotalCents = toCents(cartSubtotal) + totalCents;
  const reachesTarget = finalTotalCents >= target.amountCents;

  return {
    target,
    products,
    itemsTotal: fromCents(totalCents),
    overshoot: reachesTarget ? fromCents(finalTotalCents - target.amountCents) : 0,
    remainingGap: reachesTarget ? 0 : fromCents(target.amountCents - finalTotalCents),
    finalTotal: fromCents(finalTotalCents),
    exact: finalTotalCents === target.amountCents,
    reachesTarget,
    kind
  };
}

export function optimizeCart(
  cartSubtotal: number,
  selectedStoreId: string,
  products: ProductDto[],
  options: {
    targetLimit?: number;
    recommendationsPerTarget?: number;
    comboRecommendationsPerTarget?: number;
    includeCombos?: boolean;
  } = {}
): OptimizationResult {
  const targetLimit = options.targetLimit ?? 5;
  const recommendationsPerTarget = options.recommendationsPerTarget ?? 8;
  const comboRecommendationsPerTarget = options.comboRecommendationsPerTarget ?? 3;
  const targets = generateVoucherTargets(cartSubtotal, selectedStoreId, targetLimit);
  const storeProducts = products
    .filter((product) => product.storeId === selectedStoreId && product.price >= 0.3 && product.price < PRODUCT_PRICE_LIMIT)
    .sort((a, b) => a.price - b.price);

  const singleRecommendations: Recommendation[] = [];
  const comboRecommendations: Recommendation[] = [];

  for (const target of targets) {
    const singleMaxCandidateCents = Math.min(PRODUCT_PRICE_LIMIT * 100 - 1, target.gapCents + 200);
    const singleCandidates = storeProducts.filter((product) => toCents(product.price) <= singleMaxCandidateCents);
    const targetSingleRecommendations: Recommendation[] = [];

    for (const product of singleCandidates) {
      targetSingleRecommendations.push(buildRecommendation(cartSubtotal, target, [product], "single"));
    }

    singleRecommendations.push(...targetSingleRecommendations.sort(rankRecommendations).slice(0, recommendationsPerTarget));

    const comboMaxCandidateCents = target.gapCents + 50;
    const comboCandidates = storeProducts.filter((product) => toCents(product.price) <= comboMaxCandidateCents);
    const targetComboRecommendations: Recommendation[] = [];

    for (const size of [2, 3]) {
      for (const combo of combinations(comboCandidates.slice(0, 50), size)) {
        const totalCents = combo.reduce((sum, product) => sum + toCents(product.price), 0);
        if (totalCents >= target.gapCents && totalCents <= comboMaxCandidateCents) {
          targetComboRecommendations.push(buildRecommendation(cartSubtotal, target, combo, "combo"));
        }
      }
    }

    comboRecommendations.push(...targetComboRecommendations.sort(rankRecommendations).slice(0, comboRecommendationsPerTarget));
  }

  singleRecommendations.sort(rankRecommendations);
  comboRecommendations.sort(rankRecommendations);
  const recommendations = options.includeCombos ? comboRecommendations : singleRecommendations;

  return {
    cartSubtotal,
    selectedStoreId,
    targets,
    recommendations,
    singleRecommendations,
    comboRecommendations
  };
}
