import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePgConnectionString } from "../lib/normalizePgConnectionString";

const adapter = new PrismaPg({ connectionString: normalizePgConnectionString(process.env.DATABASE_URL) });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.menuItem.createMany({
    data: [
      { name: "Chocolate Cake", price: 4.99, description: "Rich and creamy chocolate cake with a velvety ganache finish.", category: "Cakes" },
      { name: "Lemon Tart", price: 3.49, description: "Tangy and sweet lemon curd on a buttery shortcrust base.", category: "Pastries" },
      { name: "Croissant", price: 2.99, description: "Flaky, golden, and buttery. Baked fresh every morning.", category: "Pastries" },
      { name: "Guava Pastelito", price: 3.50, description: "Flaky puff pastry with sweet guava filling. A Miami classic.", category: "Pastries" },
      { name: "Tres Leches Cake", price: 5.99, description: "Sponge cake soaked in three milks, topped with whipped cream.", category: "Cakes" },
      { name: "Cinnamon Roll", price: 4.49, description: "Warm, soft rolls with cinnamon swirl and cream cheese glaze.", category: "Pastries" },
    ],
  });
  console.log("Seeded menu items!");
}

main();
