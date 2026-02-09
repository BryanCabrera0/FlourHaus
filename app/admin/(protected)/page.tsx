import Link from "next/link";
import prisma from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/format";
import { parseOrderItems } from "@/lib/orderItems";
import type { OrderStatus, FulfillmentMethod } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  new: "badge badge-new",
  paid: "badge badge-paid",
  baking: "badge badge-baking",
  ready: "badge badge-ready",
  completed: "badge badge-completed",
  canceled: "badge badge-canceled",
};

const FULFILLMENT_BADGE: Record<string, string> = {
  pickup: "badge badge-pickup",
  delivery: "badge badge-delivery",
};

export default async function AdminDashboardPage() {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [totalOrders, openOrders, todaysOrders, totalMenuItems, activeMenuItems, recentOrders, todaysRevenue] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: ["new", "paid", "baking", "ready"] } },
      }),
      prisma.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.menuItem.count(),
      prisma.menuItem.count({ where: { isActive: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: todayStart } },
      }),
    ]);

  const revenue = todaysRevenue._sum.total ?? 0;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="stat-card stat-card-amber p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Orders Today
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {todaysOrders}
          </p>
        </div>
        <div className="stat-card stat-card-green p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Open Orders
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {openOrders}
          </p>
        </div>
        <div className="stat-card stat-card-teal p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Revenue Today
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {formatCurrency(revenue)}
          </p>
        </div>
        <div className="stat-card p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
            Active Menu Items
          </p>
          <p className="text-3xl font-bold" style={{ color: "#3D2B1F" }}>
            {activeMenuItems}
            <span className="text-lg font-normal" style={{ color: "#8B5E3C" }}>
              {" "}/ {totalMenuItems}
            </span>
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex justify-between items-center mb-5">
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
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: "#3D2B1F" }}>
                        Order #{order.id}
                      </p>
                      <span className={STATUS_BADGE[order.status] ?? "badge"}>
                        {order.status}
                      </span>
                      <span className={FULFILLMENT_BADGE[order.fulfillment as FulfillmentMethod] ?? "badge"}>
                        {order.fulfillment}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#6B5740" }}>
                      {order.createdAt.toLocaleString()} &middot; {itemCount} item
                      {itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="font-bold self-start md:self-center text-lg" style={{ color: "#8B5E3C" }}>
                    {formatCurrency(order.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href="/admin/orders"
          className="panel p-6 block group hover:border-[rgba(196,146,108,0.3)] transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#3D2B1F" }}>
                Orders Queue
              </h3>
              <p style={{ color: "#6B5740" }}>
                Update status from new to completed and keep fulfillment moving.
              </p>
            </div>
            <span
              className="text-xl mt-1 opacity-40 group-hover:opacity-70 group-hover:translate-x-1 transition-all"
              style={{ color: "#8B5E3C" }}
            >
              &rarr;
            </span>
          </div>
        </Link>
        <Link
          href="/admin/menu"
          className="panel p-6 block group hover:border-[rgba(196,146,108,0.3)] transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#3D2B1F" }}>
                Menu Manager
              </h3>
              <p style={{ color: "#6B5740" }}>
                Add new products, update pricing, adjust sort order, and archive items.
              </p>
            </div>
            <span
              className="text-xl mt-1 opacity-40 group-hover:opacity-70 group-hover:translate-x-1 transition-all"
              style={{ color: "#8B5E3C" }}
            >
              &rarr;
            </span>
          </div>
        </Link>
      </section>
    </div>
  );
}
