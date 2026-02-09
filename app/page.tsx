import Link from "next/link";
import prisma from "./lib/prisma";
import MenuItemCard from "./components/MenuItemCard";

export const dynamic = "force-dynamic";

const HIGHLIGHTS = [
  {
    title: "Baked In Small Batches",
    detail: "Fresh pastries and cakes prepared daily with a handmade touch.",
  },
  {
    title: "Warm Pastel Presentation",
    detail: "Cozy, elevated desserts crafted to look as beautiful as they taste.",
  },
  {
    title: "Pickup Or Delivery",
    detail: "Convenient options across Miami for every celebration or craving.",
  },
] as const;

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
    <div className="bg-surface">
      <section className="hero-surface wave-divider py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="kicker kicker-accent mb-4">
            Flour Haus • Cozy Bakes
          </p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-fh-heading">
            A Homey Pastel Bakery
            <br />
            Made For Sweet Moments
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed text-fh-muted">
            From cookie boxes to celebration cakes, every order is made with warm flavors,
            soft colors, and thoughtful details.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/menu" className="btn-primary py-3.5 px-9 text-sm">
              Order Now
            </Link>
            <Link href="/about" className="btn-ghost py-3.5 px-9 text-sm">
              Our Story
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((highlight) => (
            <article key={highlight.title} className="panel p-6 text-center">
              <h2 className="text-lg font-semibold mb-2 text-fh-body">
                {highlight.title}
              </h2>
              <p className="text-sm leading-relaxed text-fh-muted">
                {highlight.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="kicker kicker-blue mb-3">
            Featured Favorites
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-fh-heading">
            Fresh From The Oven
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
    </div>
  );
}
