import AddToCartButton from "./AddToCartButton";
import { formatCurrency } from "../lib/format";
import type { MenuItemCardData } from "../lib/types";

type MenuItemCardProps = {
  item: MenuItemCardData;
};

export default function MenuItemCard({ item }: MenuItemCardProps) {
  return (
    <div className="card p-6 flex flex-col">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-44 object-cover rounded-lg mb-4 border border-[#E4D5C8]"
        />
      ) : null}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold" style={{ color: "#3D2B1F" }}>{item.name}</h3>
        <span className="font-bold text-sm px-3 py-1 rounded-full" style={{ color: "#8B5E3C", backgroundColor: "rgba(196, 146, 108, 0.1)" }}>{formatCurrency(item.price)}</span>
      </div>
      <p className="text-sm leading-relaxed flex-1" style={{ color: "#6B5740" }}>{item.description}</p>
      <AddToCartButton id={item.id} name={item.name} price={item.price} />
    </div>
  );
}
