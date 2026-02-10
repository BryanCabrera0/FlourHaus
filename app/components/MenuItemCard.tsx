"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import AddToCartButton from "./AddToCartButton";
import { formatCurrency } from "@/lib/format";
import type { MenuItemCardData } from "@/lib/types";

type MenuItemCardProps = {
  item: MenuItemCardData;
};

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const variants = useMemo(() => item.variants ?? [], [item.variants]);
  const hasVariants = variants.length > 0;

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    hasVariants ? variants[0].id : null
  );

  const selectedVariant = hasVariants
    ? variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
    : null;

  const displayPrice = selectedVariant?.price ?? item.price;
  const variantLabel = selectedVariant?.label ?? null;
  const variantId = selectedVariant?.id ?? null;

  return (
    <div className="card p-6 flex flex-col">
      {item.imageUrl ? (
        <div className="relative w-full h-44 mb-4 overflow-hidden rounded-lg border surface-divider bg-white/60">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-fh-heading">{item.name}</h3>
        <span className="price-pill font-bold text-sm px-3 py-1 rounded-full">
          {formatCurrency(displayPrice)}
        </span>
      </div>
      <p className="text-sm leading-relaxed flex-1 text-fh-muted">{item.description}</p>

      {hasVariants ? (
        <div className="mt-4">
          <p className="text-xs font-semibold text-fh-muted mb-2">Select Quantity</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                className={
                  variant.id === selectedVariant?.id
                    ? "variant-chip-active"
                    : "variant-chip"
                }
              >
                {variant.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AddToCartButton
        menuItemId={item.id}
        variantId={variantId}
        name={item.name}
        variantLabel={variantLabel}
        unitPrice={displayPrice}
      />
    </div>
  );
}
