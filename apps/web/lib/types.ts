export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: "CUSTOMER" | "ADMIN";
};

export type Item = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  model?: string | null;
  quantity: number;
  price: number;
  imageUrl?: string | null;
};

export type CartLine = {
  itemId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  quantity: number;
  inventory: number;
  lineTotal: number;
};

export type Cart = {
  id: string;
  items: CartLine[];
  total: number;
};

export type Order = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string;
  placedAt: string;
  items: Array<{
    id: string;
    quantity: number;
    priceAtPurchase: number;
    item: Item;
  }>;
};
