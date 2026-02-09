import prisma from "../lib/prisma";
import MenuItemCard from "../components/MenuItemCard";

export default async function MenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      category: true,
    },
    orderBy: [{ category: "asc" }, { id: "asc" }],
  });

  const categories = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-[#4A3F4B]">Full Menu</h1>
      <p className="text-[#6B5B6E] mt-2 mb-8">Browse all of our baked goods.</p>
      {Object.entries(categories).map(([category, items]) => (
        <section key={category} className="mb-10">
          <h2 className="text-2xl font-semibold text-[#4A3F4B] mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
