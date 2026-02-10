export type MenuItemCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  variants?: MenuItemVariantData[];
};

export type MenuItemVariantData = {
  id: number;
  label: string;
  unitCount: number;
  price: number;
};

export type AdminMenuItemVariant = MenuItemVariantData & {
  menuItemId: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CartItem = {
  lineId: string;
  menuItemId: number;
  variantId: number | null;
  name: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
};

export type CartItemInput = Pick<
  CartItem,
  "menuItemId" | "variantId" | "name" | "variantLabel" | "unitPrice"
>;

export type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export const FULFILLMENT_METHODS = ["pickup", "delivery"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHODS)[number];

export const ORDER_STATUSES = [
  "new",
  "paid",
  "baking",
  "ready",
  "completed",
  "canceled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CUSTOM_ORDER_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "denied",
] as const;
export type CustomOrderRequestStatus =
  (typeof CUSTOM_ORDER_REQUEST_STATUSES)[number];
