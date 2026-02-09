import Link from "next/link";

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero-surface wave-divider py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="uppercase tracking-[0.2em] text-sm font-medium mb-4" style={{ color: "#8CC8E8" }}>Our Story</p>
          <h1 className="text-4xl md:text-6xl font-bold" style={{ color: "#FFFFFF" }}>About Flour Haus</h1>
        </div>
      </section>

      <section className="bg-surface">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="panel p-10 md:p-14">
            <div className="space-y-6 leading-relaxed text-lg" style={{ color: "#4A4068" }}>
              <p>
                Flour Haus is a home-based bakery serving the Miami community. We pride ourselves on using the freshest ingredients and traditional recipes to create delicious baked goods that bring joy to our customers.
              </p>
              <p>
                Whether you&apos;re looking for a birthday cake, fresh pastries for brunch, or a box of cookies to share with friends, everything is made from scratch with care and attention to detail.
              </p>
              <p>
                We offer local pickup and delivery across the Miami area, making it easy to enjoy homemade baked goods without leaving your home.
              </p>
            </div>
          </div>

          <div className="mt-14 panel p-10 text-center bg-cream">
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#332B52" }}>Want to place an order?</h2>
            <p className="mb-7 leading-relaxed" style={{ color: "#5E5580" }}>Browse our menu and add your favorites to the cart.</p>
            <Link href="/menu" className="btn-primary py-3.5 px-10 text-sm inline-block">
              View Menu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
