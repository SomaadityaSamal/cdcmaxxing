import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stores = [
  {
    id: "fairprice",
    name: "NTUC FairPrice",
    cdcType: "Supermarket" as const,
    baseUrl: "https://www.fairprice.com.sg/"
  },
  {
    id: "shengsiong",
    name: "Sheng Siong",
    cdcType: "Supermarket" as const,
    baseUrl: "https://shengsiong.com.sg/"
  },
  {
    id: "venus",
    name: "Venus Beauty",
    cdcType: "Merchant" as const,
    baseUrl: "https://www.venusbeauty.com.sg/"
  }
];

async function main() {
  for (const store of stores) {
    await prisma.store.upsert({
      where: { id: store.id },
      update: store,
      create: store
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
