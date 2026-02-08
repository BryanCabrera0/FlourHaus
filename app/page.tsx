function MenuItem({ name, price, description }: { name: string; price: number; description: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{name}</h3>
        <span className="text-[var(--color-accent-dark)] font-bold">${price.toFixed(2)}</span>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

const menuItems = [
  { name: "Chocolate Cake", price: 4.99, description: "Rich and creamy chocolate cake with a velvety ganache finish." },
  { name: "Lemon Tart", price: 3.49, description: "Tangy and sweet lemon curd on a buttery shortcrust base." },
  { name: "Croissant", price: 2.99, description: "Flaky, golden, and buttery. Baked fresh every morning." },
  { name: "Guava Pastelito", price: 3.50, description: "Flaky puff pastry with sweet guava filling. A Miami classic." },
  { name: "Tres Leches Cake", price: 5.99, description: "Sponge cake soaked in three milks, topped with whipped cream." },
  { name: "Cinnamon Roll", price: 4.49, description: "Warm, soft rolls with cinnamon swirl and cream cheese glaze." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-2">Christine&apos;s Bakery</h1>
        <p className="text-lg text-gray-400 italic">the sweet life.</p>
        <div className="w-24 h-1 bg-[var(--color-accent)] mx-auto mt-4 rounded-full"></div>
      </header>

      <section>
        <h2 className="text-2xl font-semibold mb-6">Our Menu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <MenuItem key={item.name} name={item.name} price={item.price} description={item.description} />
          ))}
        </div>
      </section>

      <footer className="text-center mt-16 text-sm text-gray-400">
        <p>Homemade with love in Miami</p>
        <p className="mt-1">Pickup &amp; Local Delivery Available</p>
      </footer>
    </div>
  );
}
