import Link from "next/link";
import prisma from "./lib/prisma";
import MenuItemCard from "./components/MenuItemCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const menuItems = await prisma.menuItem.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
    },
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: 6,
  });

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-gradient wave-divider py-28 md:py-36">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="uppercase tracking-[0.2em] text-sm font-medium mb-5 text-glow" style={{ color: "#E0B88A" }}>Miami&apos;s Home Bakery</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-glow" style={{ color: "#FFFFFF" }}>Baked Fresh,<br />Made With Love</h1>
          <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: "#F0E0D0" }}>
            From classic cakes to seasonal treats, everything is handcrafted with the finest ingredients and delivered to your door.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/menu" className="btn-primary py-3.5 px-9 text-sm">
              Order Now
            </Link>
            <Link href="/about" className="btn-ghost py-3.5 px-9 text-sm">
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-warm-gradient">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="py-4">
            <p className="text-lg font-semibold mb-1" style={{ color: "#8B5E3C" }}>Handmade Daily</p>
            <p className="text-sm" style={{ color: "#6B5740" }}>Every item baked fresh to order</p>
          </div>
          <div className="py-4">
            <p className="text-lg font-semibold mb-1" style={{ color: "#8B5E3C" }}>Local Pickup &amp; Delivery</p>
            <p className="text-sm" style={{ color: "#6B5740" }}>Serving the Miami area</p>
          </div>
          <div className="py-4">
            <p className="text-lg font-semibold mb-1" style={{ color: "#8B5E3C" }}>Made With Love</p>
            <p className="text-sm" style={{ color: "#6B5740" }}>Quality ingredients, family recipes</p>
          </div>
        </div>
      </section>

      {/* Featured Items */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="uppercase tracking-[0.2em] text-sm font-medium mb-3" style={{ color: "#8B5E3C" }}>What We Offer</p>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: "#3D2B1F" }}>Our Favorites</h2>
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

      {/* CTA Section */}
      <section className="bg-cream">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5" style={{ color: "#3D2B1F" }}>Ready to Satisfy Your Sweet Tooth?</h2>
          <p className="max-w-lg mx-auto mb-10 text-lg leading-relaxed" style={{ color: "#6B5740" }}>
            Browse our menu, add your favorites to the cart, and choose pickup or delivery. It&apos;s that easy.
          </p>
          <Link href="/menu" className="btn-dark py-3.5 px-10 text-sm inline-block">
            Start Your Order
          </Link>
        </div>
      </section>
    </main>
  );
}
