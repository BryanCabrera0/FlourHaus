function Welcome({ name }: { name: string }) {
  return <p>Welcome to our bakery, {name}!</p>;
}

export default function Home() {
  return (
    <div>
      <h1>Christine&apos;s Bakery</h1>
      <p>Fresh baked goods in Miami</p>
      <Welcome name="Maria" />
      <Welcome name="Carlos" />
    </div>
  );
}
