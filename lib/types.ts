export type MenuItemCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
};

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type CartItemInput = Pick<CartItem, "id" | "name" | "price">;

export type OrderItem = CartItem;

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
