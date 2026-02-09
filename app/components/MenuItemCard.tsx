import AddToCartButton from "./AddToCartButton";
import { formatCurrency } from "@/lib/format";
import type { MenuItemCardData } from "@/lib/types";

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
          className="w-full h-44 object-cover rounded-lg mb-4 border surface-divider"
        />
      ) : null}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-fh-heading">{item.name}</h3>
        <span className="price-pill font-bold text-sm px-3 py-1 rounded-full">{formatCurrency(item.price)}</span>
      </div>
      <p className="text-sm leading-relaxed flex-1 text-fh-muted">{item.description}</p>
      <AddToCartButton id={item.id} name={item.name} price={item.price} />
    </div>
  );
}
