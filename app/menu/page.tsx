import prisma from "../lib/prisma";
import MenuItemCard from "../components/MenuItemCard";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      category: true,
      imageUrl: true,
    },
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { id: "asc" }],
  });

  const categories = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-warm-gradient">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <p className="uppercase tracking-[0.2em] text-sm font-medium mb-3" style={{ color: "#8B5E3C" }}>Browse &amp; Order</p>
          <h1 className="text-4xl md:text-5xl font-bold" style={{ color: "#3D2B1F" }}>Our Menu</h1>
          <p className="mt-4 max-w-md mx-auto leading-relaxed" style={{ color: "#6B5740" }}>Everything is made fresh to order. Pick your favorites and we&apos;ll handle the rest.</p>
        </div>
        {Object.entries(categories).map(([category, items]) => (
          <section key={category} className="mb-16">
            <h2 className="text-2xl font-semibold mb-7 pb-3" style={{ color: "#3D2B1F", borderBottom: "2px solid rgba(196, 146, 108, 0.2)" }}>{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
