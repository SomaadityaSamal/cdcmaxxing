import { NextResponse } from "next/server";
import { getLocalProducts } from "@/lib/local-catalog-db";
import { prisma } from "@/lib/prisma";
import { optimizeCart } from "@/lib/optimizer";
import { sampleProducts } from "@/lib/sample-data";
import type { ProductDto } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const cartSubtotal = Number(body?.cartSubtotal);
  const selectedStoreId = String(body?.selectedStoreId ?? "");
  const includeCombos = Boolean(body?.includeCombos);

  if (!Number.isFinite(cartSubtotal) || cartSubtotal < 0) {
    return NextResponse.json({ error: "cartSubtotal must be a positive number." }, { status: 400 });
  }

  if (!selectedStoreId) {
    return NextResponse.json({ error: "selectedStoreId is required." }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    const products = getLocalProducts(selectedStoreId);
    const catalog = products.length ? products : sampleProducts;
    const categories = Array.from(new Set(catalog.filter((product) => product.storeId === selectedStoreId).map((product) => product.category))).sort();
    return NextResponse.json({
      ...optimizeCart(cartSubtotal, selectedStoreId, catalog, { includeCombos }),
      categories,
      source: products.length ? "database" : "demo"
    });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        storeId: selectedStoreId,
        price: {
          gte: 0.3,
          lt: 10
        }
      },
      orderBy: { price: "asc" },
      take: 300
    });

    const productDtos: ProductDto[] = products.map((product) => ({
      id: product.id,
      storeId: product.storeId,
      name: product.name,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
      lastUpdated: product.lastUpdated.toISOString()
    }));

    const catalog = productDtos.length ? productDtos : sampleProducts;
    const categories = Array.from(new Set(catalog.filter((product) => product.storeId === selectedStoreId).map((product) => product.category))).sort();
    return NextResponse.json({
      ...optimizeCart(cartSubtotal, selectedStoreId, catalog, { includeCombos }),
      categories,
      source: productDtos.length ? "database" : "demo"
    });
  } catch {
    const categories = Array.from(new Set(sampleProducts.filter((product) => product.storeId === selectedStoreId).map((product) => product.category))).sort();
    return NextResponse.json({
      ...optimizeCart(cartSubtotal, selectedStoreId, sampleProducts, { includeCombos }),
      categories,
      source: "demo"
    });
  }
}
