export type CdcType = "Supermarket" | "Merchant";

export type StoreDto = {
  id: string;
  name: string;
  cdcType: CdcType;
  baseUrl: string;
};

export type ProductDto = {
  id: string;
  storeId: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  productUrl: string;
  lastUpdated: string;
};
