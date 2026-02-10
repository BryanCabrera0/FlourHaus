import Link from "next/link";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ensureCookieVariantsForActiveMenuItems } from "@/lib/menuItemVariantRules";
import MenuItemCard from "./components/MenuItemCard";
import CustomOrderRequestForm from "./components/CustomOrderRequestForm";

export const dynamic = "force-dynamic";

const MENU_ITEM_CARD_SELECT: Prisma.MenuItemSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  variants: {
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      label: true,
      unitCount: true,
      price: true,
    },
  },
};

export default async function HomePage() {
  await ensureCookieVariantsForActiveMenuItems(prisma);

  const featuredItems = await prisma.menuItem.findMany({
    select: MENU_ITEM_CARD_SELECT,
    where: { isActive: true, isFeatured: true },
    orderBy: [
      { featuredSortOrder: "asc" },
      { sortOrder: "asc" },
      { id: "asc" },
    ],
    take: 6,
  });

  const menuItems =
    featuredItems.length > 0
      ? featuredItems
      : await prisma.menuItem.findMany({
          select: MENU_ITEM_CARD_SELECT,
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          take: 6,
        });

  return (
    <div className="bg-surface">
      <section className="hero-surface wave-divider py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-6xl md:text-8xl font-normal mb-4 text-fh-heading">
            Flour Haus
          </h1>
          <h2 className="text-2xl md:text-3xl font-normal mb-10 text-fh-muted">
            The sweet life.
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/menu" className="btn-primary py-3.5 px-9 text-sm">
              Order Now
            </Link>
            <a href="#custom-order" className="btn-pastel-primary py-3.5 px-9 text-sm">
              Custom Order
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-10 flex items-center justify-center gap-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 text-fh-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3.6l2.67 5.4 5.96.86-4.31 4.2 1.02 5.94L12 17.2 6.66 20l1.02-5.94-4.31-4.2 5.96-.86L12 3.6z" />
          </svg>
          <h2 className="text-2xl md:text-3xl font-bold text-fh-heading tracking-tight">
            Featured
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {menuItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/menu" className="btn-primary py-3.5 px-10 text-sm inline-block">
            View Full Menu
          </Link>
        </div>
      </section>

      <section className="bg-cream">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="panel p-10 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-fh-heading">
              Ready To Place An Order?
            </h2>
            <p className="max-w-2xl mx-auto mb-8 text-lg leading-relaxed text-fh-muted">
              Choose your favorites, pick pickup or delivery, and let us take care of the
              rest.
            </p>
            <Link href="/menu" className="btn-dark py-3.5 px-10 text-sm inline-block">
              Start Your Order
            </Link>
          </div>
        </div>
      </section>

      <section id="custom-order" className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="panel p-10 md:p-12">
            <div className="text-center mb-10">
              <p className="kicker kicker-success mb-3">
                Not On The Menu?
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-fh-heading">
                Request A Custom Bake
              </h2>
              <p className="max-w-2xl mx-auto mt-4 text-lg leading-relaxed text-fh-muted">
                Tell us what you have in mind and we will follow up with availability and pricing.
              </p>
            </div>
            <CustomOrderRequestForm />
          </div>
        </div>
      </section>
    </div>
  );
}
