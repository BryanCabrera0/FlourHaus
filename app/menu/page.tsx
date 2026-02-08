import prisma from "../lib/prisma";
import AddToCartButton from "../components/AddToCartButton";

export default async function MenuPage() {
  const menuItems = await prisma.menuItem.findMany();

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
              <div key={item.id} className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-[#F0D9E8]">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-[#4A3F4B]">{item.name}</h3>
                  <span className="text-[#D4A0B9] font-bold">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-sm text-[#6B5B6E]">{item.description}</p>
                <AddToCartButton id={item.id} name={item.name} price={item.price} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
