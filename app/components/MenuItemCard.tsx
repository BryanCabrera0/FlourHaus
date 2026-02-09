import AddToCartButton from "./AddToCartButton";
import { formatCurrency } from "../lib/format";
import type { MenuItemCardData } from "../lib/types";

type MenuItemCardProps = {
  item: MenuItemCardData;
};

export default function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-[#F0D9E8]">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-[#4A3F4B]">{item.name}</h3>
        <span className="text-[#D4A0B9] font-bold">{formatCurrency(item.price)}</span>
      </div>
      <p className="text-sm text-[#6B5B6E]">{item.description}</p>
      <AddToCartButton id={item.id} name={item.name} price={item.price} />
    </div>
  );
}
