"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Calculator,
  CircleDollarSign,
  Combine,
  GripVertical,
  ImageIcon,
  Loader2,
  PackagePlus,
  RefreshCcw,
  ShoppingBasket,
  Store,
  Tags,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn, money } from "@/lib/utils";
import type { OptimizationResult, Recommendation } from "@/lib/optimizer";
import type { ProductDto, StoreDto } from "@/lib/types";

type ApiResult = OptimizationResult & {
  categories: string[];
  source: "database" | "demo";
};

function storeAccent(storeId: string) {
  if (storeId === "fairprice") {
    return "border-l-primary";
  }
  if (storeId === "shengsiong") {
    return "border-l-accent";
  }
  return "border-l-secondary";
}

function recommendationStatus(recommendation: Recommendation) {
  if (recommendation.exact) {
    return "Exact";
  }
  if (recommendation.reachesTarget) {
    return `${money(recommendation.overshoot)} overflow`;
  }
  return `${money(recommendation.remainingGap)} left`;
}

function recommendationSummary(recommendation: Recommendation) {
  if (recommendation.exact) {
    return `${money(recommendation.finalTotal)} total, exact for ${money(recommendation.target.amount)} in CDC vouchers.`;
  }
  if (recommendation.reachesTarget) {
    return `${money(recommendation.finalTotal)} total, ${money(recommendation.overshoot)} above ${money(recommendation.target.amount)}.`;
  }
  return `${money(recommendation.finalTotal)} total, ${money(recommendation.remainingGap)} left to ${money(recommendation.target.amount)}.`;
}

function ProductImage({ product, size = "108px" }: { product: ProductDto; size?: string }) {
  const [failed, setFailed] = useState(false);

  if (product.imageUrl && !failed) {
    return (
      <img
        src={product.imageUrl}
        alt=""
        className="h-full w-full object-cover"
        style={{ minWidth: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <ImageIcon size={26} aria-hidden="true" />
    </div>
  );
}

function SingleItemCard({
  recommendation,
  store,
  onAdd
}: {
  recommendation: Recommendation;
  store?: StoreDto;
  onAdd: (product: ProductDto) => void;
}) {
  const product = recommendation.products[0];

  if (!product) {
    return null;
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-cdc-product", product.id);
  }

  return (
    <Card
      draggable
      data-testid={`product-card-${product.id}`}
      onDragStart={handleDragStart}
      className={cn("overflow-hidden border-l-4 transition hover:-translate-y-0.5 hover:shadow-lg", storeAccent(product.storeId))}
    >
      <div className="grid grid-cols-[92px_1fr] gap-4 p-4 sm:grid-cols-[108px_1fr]">
        <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
          <ProductImage product={product} />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{store?.name ?? product.storeId}</Badge>
            <Badge>{product.category}</Badge>
            <Badge className={recommendation.exact ? "border-primary/30 bg-primary/10 text-primary" : ""}>
              {recommendationStatus(recommendation)}
            </Badge>
          </div>

          <div>
            <h3 className="line-clamp-2 text-base font-bold">{product.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{money(product.price)}</span>
              <span>{recommendationSummary(recommendation)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => onAdd(product)} title="Add to cart">
              <PackagePlus size={16} aria-hidden="true" />
              Add
            </Button>
            <a
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Store
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <span className="ml-auto hidden items-center gap-1 text-xs font-semibold text-muted-foreground sm:inline-flex">
              <GripVertical size={16} aria-hidden="true" />
              Drag
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ComboCard({ recommendation, store }: { recommendation: Recommendation; store?: StoreDto }) {
  const firstProduct = recommendation.products[0];

  if (!firstProduct) {
    return null;
  }

  return (
    <Card className={cn("overflow-hidden border-l-4", storeAccent(firstProduct.storeId))}>
      <div className="grid gap-4 p-4 sm:grid-cols-[92px_1fr]">
        <div className="relative hidden aspect-square overflow-hidden rounded-md bg-muted sm:block">
          <ProductImage product={firstProduct} size="92px" />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{store?.name ?? firstProduct.storeId}</Badge>
            <Badge>{recommendation.products.length} items</Badge>
            <Badge>{recommendationStatus(recommendation)}</Badge>
          </div>
          <div>
            <h3 className="line-clamp-2 text-base font-bold">
              {recommendation.products.map((product) => product.name).join(" + ")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {recommendation.products.map((product) => `${product.category} ${money(product.price)}`).join(" / ")}
            </p>
          </div>
          <div className="text-sm font-semibold">{recommendationSummary(recommendation)}</div>
        </div>
      </div>
    </Card>
  );
}

export function CdcMaximizer() {
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("fairprice");
  const [cartSubtotal, setCartSubtotal] = useState("16.50");
  const [cartItems, setCartItems] = useState<ProductDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [includeCombos, setIncludeCombos] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  const baseSubtotal = Number(cartSubtotal);
  const validBaseSubtotal = Number.isFinite(baseSubtotal) && baseSubtotal >= 0 ? baseSubtotal : 0;
  const cartItemsTotal = useMemo(() => cartItems.reduce((sum, product) => sum + product.price, 0), [cartItems]);
  const workingSubtotal = Number((validBaseSubtotal + cartItemsTotal).toFixed(2));

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  const cartProductIds = useMemo(() => new Set(cartItems.map((product) => product.id)), [cartItems]);

  const singleRecommendations = useMemo(() => {
    const recommendations = result?.singleRecommendations ?? [];
    return recommendations
      .filter((recommendation) => {
        const product = recommendation.products[0];
        return product && !cartProductIds.has(product.id);
      })
      .filter((recommendation) => {
        const product = recommendation.products[0];
        return selectedCategory === "All" || product?.category === selectedCategory;
      })
      .slice(0, 18);
  }, [cartProductIds, result?.singleRecommendations, selectedCategory]);

  const comboRecommendations = useMemo(() => {
    const recommendations = result?.comboRecommendations ?? [];
    return recommendations
      .filter((recommendation) => recommendation.products.every((product) => !cartProductIds.has(product.id)))
      .filter((recommendation) => {
        return selectedCategory === "All" || recommendation.products.some((product) => product.category === selectedCategory);
      })
      .slice(0, 6);
  }, [cartProductIds, result?.comboRecommendations, selectedCategory]);

  const draggableProducts = useMemo(() => {
    const map = new Map<string, ProductDto>();
    for (const recommendation of result?.singleRecommendations ?? []) {
      const product = recommendation.products[0];
      if (product) {
        map.set(product.id, product);
      }
    }
    return map;
  }, [result?.singleRecommendations]);

  useEffect(() => {
    fetch("/api/stores")
      .then((response) => response.json())
      .then((data) => {
        const nextStores = data.stores ?? [];
        setStores(nextStores);
        if (nextStores[0]?.id && !nextStores.some((store: StoreDto) => store.id === selectedStoreId)) {
          setSelectedStoreId(nextStores[0].id);
        }
      });
  }, [selectedStoreId]);

  useEffect(() => {
    setCartItems([]);
    setSelectedCategory("All");
  }, [selectedStoreId]);

  useEffect(() => {
    if (!Number.isFinite(workingSubtotal) || workingSubtotal < 0 || !selectedStoreId) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartSubtotal: workingSubtotal, selectedStoreId, includeCombos }),
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((data) => setResult(data))
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [includeCombos, selectedStoreId, workingSubtotal]);

  function addCartItem(product: ProductDto) {
    setCartItems((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current;
      }
      return [...current, product];
    });
  }

  function removeCartItem(productId: string) {
    setCartItems((current) => current.filter((product) => product.id !== productId));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const productId = event.dataTransfer.getData("application/x-cdc-product");
    const product = draggableProducts.get(productId);
    if (product) {
      addCartItem(product);
    }
  }

  const categories = ["All", ...(result?.categories ?? [])];
  const activeTarget = result?.targets[0];

  return (
    <main className="min-h-screen">
      <section className="border-b border-border/80 bg-background/92 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[1fr_380px] xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CircleDollarSign size={18} aria-hidden="true" />
              CDC Maximizer
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">Build a cart that lands cleanly on CDC vouchers.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Pick a store, browse single filler items, and use the cart builder to update recommendations after each add.
            </p>
          </div>
          <Card className="p-4">
            <label className="text-sm font-semibold" htmlFor="subtotal">
              Current Cart Subtotal
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-md border border-border bg-muted px-3 py-3 font-bold">S$</span>
              <Input
                id="subtotal"
                inputMode="decimal"
                min="0"
                step="0.01"
                type="number"
                value={cartSubtotal}
                onChange={(event) => setCartSubtotal(event.target.value)}
              />
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="space-y-4">
          <Card className="p-3">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-bold">
              <Store size={16} aria-hidden="true" />
              Store
            </div>
            <div className="grid gap-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  className={cn(
                    "rounded-md border px-3 py-3 text-left transition",
                    selectedStoreId === store.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white hover:bg-muted"
                  )}
                  onClick={() => setSelectedStoreId(store.id)}
                  type="button"
                >
                  <div className="font-bold">{store.name}</div>
                  <div className={cn("text-sm", selectedStoreId === store.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {store.cdcType} CDC vouchers
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Calculator size={16} aria-hidden="true" />
              Target Tiers
            </div>
            <div className="grid gap-2">
              {result?.targets.map((target) => (
                <button
                  key={target.amount}
                  type="button"
                  className="rounded-md border border-border bg-white p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{money(target.amount)}</span>
                    <span className="text-sm text-muted-foreground">Gap {money(target.gap)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {target.voucherMix.map((voucher) => `$${voucher}`).join(" + ")}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Tags size={16} aria-hidden="true" />
              Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-semibold transition",
                    selectedCategory === category
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-white text-foreground hover:bg-muted"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Single items for</div>
              <div className="text-xl font-black">{selectedStore?.name ?? "Selected Store"}</div>
              {activeTarget && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Working subtotal {money(workingSubtotal)}. Next target {money(activeTarget.amount)}, gap {money(activeTarget.gap)}.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={includeCombos}
                  onChange={(event) => setIncludeCombos(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <Combine size={16} aria-hidden="true" />
                Combo suggestions
              </label>
              {result?.source === "demo" && <Badge className="border-accent/30 bg-accent/10 text-accent">Demo catalog</Badge>}
              {loading && <Loader2 className="animate-spin text-muted-foreground" size={20} aria-hidden="true" />}
            </div>
          </Card>

          {selectedStore?.id === "venus" && (
            <Card className="border-l-4 border-l-secondary p-4">
              <p className="text-sm text-muted-foreground">
                Venus Beauty is flagged as Merchant CDC. Confirm the selected outlet accepts CDC vouchers before checkout.
              </p>
            </Card>
          )}

          <div className="grid gap-4">
            {singleRecommendations.length ? (
              singleRecommendations.map((recommendation) => (
                <SingleItemCard
                  key={`${recommendation.target.amount}-${recommendation.products[0]?.id}`}
                  recommendation={recommendation}
                  store={selectedStore}
                  onAdd={addCartItem}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <RefreshCcw className="mx-auto mb-3 text-muted-foreground" size={28} aria-hidden="true" />
                <h2 className="text-lg font-bold">No single item matches this filter</h2>
                <p className="mt-2 text-sm text-muted-foreground">Try another category or refresh the catalog after scraping.</p>
              </Card>
            )}
          </div>

          {includeCombos && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Combine size={16} aria-hidden="true" />
                Combo suggestions
              </div>
              <div className="grid gap-4">
                {comboRecommendations.length ? (
                  comboRecommendations.map((recommendation, index) => (
                    <ComboCard
                      key={`${recommendation.target.amount}-${recommendation.itemsTotal}-${index}`}
                      recommendation={recommendation}
                      store={selectedStore}
                    />
                  ))
                ) : (
                  <div className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">
                    No combo suggestion for the current filter.
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-2 xl:col-span-1">
          <Card className="sticky top-4 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShoppingBasket size={16} aria-hidden="true" />
                Cart Builder
              </div>
              {cartItems.length > 0 && (
                <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setCartItems([])} title="Clear cart">
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              )}
            </div>

            <div
              data-testid="cart-drop-zone"
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              aria-label="Cart item drop area"
              className={cn(
                "min-h-[260px] rounded-md border-2 border-dashed bg-white transition",
                dragActive ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              {cartItems.length > 0 && (
                <div className="grid gap-2 p-3">
                  {cartItems.map((product) => (
                    <div key={product.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-md border border-border bg-background p-2">
                      <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
                        <ProductImage product={product} size="52px" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{money(product.price)}</div>
                      </div>
                      <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => removeCartItem(product.id)} title="Remove item">
                        <Trash2 size={15} aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base cart</span>
                <span className="font-bold">{money(validBaseSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Added items</span>
                <span className="font-bold">{money(cartItemsTotal)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                <span className="font-bold">Working total</span>
                <span className="font-black">{money(workingSubtotal)}</span>
              </div>
            </div>
          </Card>
        </aside>
      </section>
    </main>
  );
}
