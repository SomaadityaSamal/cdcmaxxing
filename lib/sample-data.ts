import type { ProductDto, StoreDto } from "@/lib/types";

export const sampleStores: StoreDto[] = [
  {
    id: "fairprice",
    name: "NTUC FairPrice",
    cdcType: "Supermarket",
    baseUrl: "https://www.fairprice.com.sg/"
  },
  {
    id: "shengsiong",
    name: "Sheng Siong",
    cdcType: "Supermarket",
    baseUrl: "https://shengsiong.com.sg/"
  },
  {
    id: "venus",
    name: "Venus Beauty",
    cdcType: "Merchant",
    baseUrl: "https://www.venusbeauty.com.sg/"
  }
];

const now = new Date().toISOString();

export const sampleProducts: ProductDto[] = [
  {
    id: "demo-fp-1",
    storeId: "fairprice",
    name: "FairPrice Mineral Water 600ml",
    price: 0.55,
    category: "Beverages",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.fairprice.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-fp-2",
    storeId: "fairprice",
    name: "FairPrice Potato Chips Small Pack",
    price: 1.2,
    category: "Snacks",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.fairprice.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-fp-3",
    storeId: "fairprice",
    name: "Canned Sardines 155g",
    price: 1.65,
    category: "Canned Food",
    imageUrl: "https://images.unsplash.com/photo-1584263347416-85a696b4eda7?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.fairprice.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-fp-4",
    storeId: "fairprice",
    name: "Instant Noodles Single Pack",
    price: 0.9,
    category: "Staples",
    imageUrl: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.fairprice.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-ss-1",
    storeId: "shengsiong",
    name: "Packet Soy Milk 250ml",
    price: 0.75,
    category: "Beverages",
    imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://shengsiong.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-ss-2",
    storeId: "shengsiong",
    name: "Cream Crackers Travel Pack",
    price: 1.1,
    category: "Snacks",
    imageUrl: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://shengsiong.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-ss-3",
    storeId: "shengsiong",
    name: "Canned Baked Beans",
    price: 1.35,
    category: "Canned Food",
    imageUrl: "https://images.unsplash.com/photo-1558818498-28c1e002b655?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://shengsiong.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-ss-4",
    storeId: "shengsiong",
    name: "Green Tea Bottle 500ml",
    price: 1.45,
    category: "Beverages",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://shengsiong.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-vb-1",
    storeId: "venus",
    name: "Travel Toothbrush",
    price: 0.8,
    category: "Oral Care",
    imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.venusbeauty.com.sg/e-shop/oralcare/accessories.html",
    lastUpdated: now
  },
  {
    id: "demo-vb-2",
    storeId: "venus",
    name: "Wet Wipes Pocket Pack",
    price: 1.25,
    category: "Personal Care",
    imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.venusbeauty.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-vb-3",
    storeId: "venus",
    name: "Soap Bar 80g",
    price: 1.5,
    category: "Body Care",
    imageUrl: "https://images.unsplash.com/photo-1607006483224-8f7582d6fb74?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.venusbeauty.com.sg/",
    lastUpdated: now
  },
  {
    id: "demo-vb-4",
    storeId: "venus",
    name: "Dental Floss Pick Pack",
    price: 2.2,
    category: "Oral Care",
    imageUrl: "https://images.unsplash.com/photo-1621386393673-202200e004cd?q=80&w=600&auto=format&fit=crop",
    productUrl: "https://www.venusbeauty.com.sg/",
    lastUpdated: now
  }
];
