import Link from "next/link";
import prisma from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/format";
import { parseOrderItems } from "@/lib/orderItems";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalOrders, openOrders, todaysOrders, totalMenuItems, activeMenuItems, recentOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: ["new", "paid", "baking", "ready"] } },
      }),
      prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.menuItem.count(),
      prisma.menuItem.count({ where: { isActive: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Orders Today
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {todaysOrders}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Open Orders
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {openOrders}
          </p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Active Menu Items
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {activeMenuItems} / {totalMenuItems}
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold" style={{ color: "#3D2B1F" }}>
            Recent Orders
          </h2>
          <Link href="/admin/orders" className="btn-primary py-2 px-4 text-xs">
            Manage Orders
          </Link>
        </div>

        {totalOrders === 0 ? (
          <p style={{ color: "#6B5740" }}>No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const items = parseOrderItems(order.items);
              const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-[#ECDCCF] p-4 flex flex-col md:flex-row md:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold" style={{ color: "#3D2B1F" }}>
                      Order #{order.id}
                    </p>
                    <p className="text-sm" style={{ color: "#6B5740" }}>
                      {order.createdAt.toLocaleString()} • {itemCount} item
                      {itemCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#6B5740" }}>
                      {order.fulfillment} • {order.status}
                    </p>
                  </div>
                  <div className="font-bold self-start md:self-center" style={{ color: "#8B5E3C" }}>
                    {formatCurrency(order.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link href="/admin/orders" className="panel p-6 block">
          <h3 className="text-xl font-semibold mb-2" style={{ color: "#3D2B1F" }}>
            Orders Queue
          </h3>
          <p style={{ color: "#6B5740" }}>
            Update status from new to completed and keep fulfillment moving.
          </p>
        </Link>
        <Link href="/admin/menu" className="panel p-6 block">
          <h3 className="text-xl font-semibold mb-2" style={{ color: "#3D2B1F" }}>
            Menu Manager
          </h3>
          <p style={{ color: "#6B5740" }}>
            Add new products, update pricing, adjust sort order, and archive items.
          </p>
        </Link>
      </section>
    </div>
  );
}
