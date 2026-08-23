import { NextResponse } from "next/server";
import { getLocalStores } from "@/lib/local-catalog-db";
import { prisma } from "@/lib/prisma";
import { sampleStores } from "@/lib/sample-data";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    const stores = getLocalStores();
    return NextResponse.json({ stores: stores.length ? stores : sampleStores, source: stores.length ? "database" : "demo" });
  }

  try {
    const stores = await prisma.store.findMany({
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ stores: stores.length ? stores : sampleStores, source: stores.length ? "database" : "demo" });
  } catch {
    return NextResponse.json({ stores: sampleStores, source: "demo" });
  }
}
