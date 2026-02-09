export type MenuItemCardData = {
  id: number;
  name: string;
  description: string;
  price: number;
};

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type CartItemInput = Pick<CartItem, "id" | "name" | "price">;

export type OrderItem = CartItem;

export type FulfillmentMethod = "pickup" | "delivery";
