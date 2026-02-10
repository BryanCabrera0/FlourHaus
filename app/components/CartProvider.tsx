"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { CartItem, CartItemInput } from "@/lib/types";

type CartState = {
  items: CartItem[];
  total: number;
};

type CartActions = {
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (lineId: string) => void;
  clearCart: () => void;
};

type CartAction =
  | { type: "add"; item: CartItemInput }
  | { type: "remove"; lineId: string }
  | { type: "clear" };

const CartStateContext = createContext<CartState | null>(null);
const CartActionsContext = createContext<CartActions | null>(null);

function toLineId(item: CartItemInput): string {
  return `${item.menuItemId}:${item.variantId ?? "base"}`;
}

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const lineId = toLineId(action.item);
      const existing = items.find((item) => item.lineId === lineId);
      if (existing) {
        return items.map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...items,
        {
          lineId,
          ...action.item,
          quantity: 1,
        },
      ];
    }
    case "remove":
      return items.filter((item) => item.lineId !== action.lineId);
    case "clear":
      return [];
    default:
      return items;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );

  const addToCart = useCallback((item: CartItemInput) => {
    dispatch({ type: "add", item });
  }, []);

  const removeFromCart = useCallback((lineId: string) => {
    dispatch({ type: "remove", lineId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "clear" });
  }, []);

  const stateValue = useMemo(() => ({ items, total }), [items, total]);
  const actionsValue = useMemo(
    () => ({ addToCart, removeFromCart, clearCart }),
    [addToCart, removeFromCart, clearCart]
  );

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartActionsContext.Provider value={actionsValue}>
        {children}
      </CartActionsContext.Provider>
    </CartStateContext.Provider>
  );
}

export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) {
    throw new Error("useCartState must be used within CartProvider");
  }
  return context;
}

export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (!context) {
    throw new Error("useCartActions must be used within CartProvider");
  }
  return context;
}

export function useCart() {
  const { items, total } = useCartState();
  const { addToCart, removeFromCart, clearCart } = useCartActions();

  return {
    items,
    total,
    addToCart,
    removeFromCart,
    clearCart,
    getTotal: () => total,
  };
}
