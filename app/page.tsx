import Link from "next/link";
import prisma from "./lib/prisma";
import MenuItemCard from "./components/MenuItemCard";

export default async function HomePage() {
  const menuItems = await prisma.menuItem.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
    },
    orderBy: { id: "asc" },
  });

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-2 text-[#4A3F4B]">Christine&apos;s Bakery</h1>
        <p className="text-lg text-[#D4A0B9] italic">the sweet life.</p>
        <div className="w-24 h-1 bg-[#C8A2C8] mx-auto mt-4 rounded-full"></div>
      </header>

      <section>
        <h2 className="text-2xl font-semibold text-[#4A3F4B] mb-6">Our Menu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
      <div className="flex justify-center space-x-4 mt-6">
        <Link href="/menu" className="bg-[#C8A2C8] hover:bg-[#B8A0B8] text-white font-bold py-2 px-4 rounded-full transition-colors duration-300">
          View Full Menu
        </Link>
        <Link href="/about" className="bg-[#C8A2C8] hover:bg-[#B8A0B8] text-white font-bold py-2 px-4 rounded-full transition-colors duration-300">
          Learn About Us
        </Link>
      </div>

      <footer className="text-center mt-16 text-sm text-[#B8A0B8]">
        <p>Homemade with love in Miami</p>
        <p className="mt-1">Pickup &amp; Local Delivery Available</p>
      </footer>
    </div>
  );
}
