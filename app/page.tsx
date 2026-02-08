function MenuItem({ name, price, description }: { name: string; price: number; description?: string }) {
  return (
    <div>
      <h3>{name}</h3>
      <p>{description}</p>
      <p>${price.toFixed(2)}</p>
    </div>
  );
}

const menuItems = [
  { name: "Chocolate Cake", price: 4.99, description: "Rich and creamy chocolate cake." },
  { name: "Lemon Tart", price: 3.49, description: "Tangy and sweet lemon tart." },
  { name: "Croissant", price: 2.99, description: "Flaky and buttery croissant." },
];

export default function HomePage() {
  return (
    <div>
      <h1>Christine Bakery</h1>
      <p>the sweet life.</p>
      {menuItems.map((item) => (
        <MenuItem key={item.name} name={item.name} price={item.price} description={item.description} />
      ))}
    </div>
  );
}