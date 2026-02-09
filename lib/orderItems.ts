import type { OrderItem } from "@/app/lib/types";

function isOrderItem(value: unknown): value is OrderItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export function parseOrderItems(itemsJson: string): OrderItem[] {
  try {
    const parsed: unknown = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isOrderItem);
  } catch {
    return [];
  }
}
