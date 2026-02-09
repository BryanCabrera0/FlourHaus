import Link from "next/link";
import prisma from "@/app/lib/prisma";
import { formatCurrency } from "@/app/lib/format";
import { parseOrderItems } from "@/lib/orderItems";
import type { FulfillmentMethod } from "@/app/lib/types";

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
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#C08A30" }}>
            Orders Today
          </p>
          <p className="text-3xl font-bold" style={{ color: "#332B52" }}>
            {todaysOrders}
          </p>
        </div>
        <div className="stat-card stat-card-green p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#3D9E7A" }}>
            Open Orders
          </p>
          <p className="text-3xl font-bold" style={{ color: "#332B52" }}>
            {openOrders}
          </p>
        </div>
        <div className="stat-card stat-card-teal p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#40A8A0" }}>
            Revenue Today
          </p>
          <p className="text-3xl font-bold" style={{ color: "#332B52" }}>
            {formatCurrency(revenue)}
          </p>
        </div>
        <div className="stat-card stat-card-rose p-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#D06080" }}>
            Active Menu Items
          </p>
          <p className="text-3xl font-bold" style={{ color: "#332B52" }}>
            {activeMenuItems}
            <span className="text-lg font-normal" style={{ color: "#8B7EB0" }}>
              {" "}/ {totalMenuItems}
            </span>
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold" style={{ color: "#332B52" }}>
            Recent Orders
          </h2>
          <Link href="/admin/orders" className="btn-primary py-2 px-4 text-xs">
            Manage Orders
          </Link>
        </div>

        {totalOrders === 0 ? (
          <p style={{ color: "#5E5580" }}>No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const items = parseOrderItems(order.items);
              const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-[#E0D8F0] p-4 flex flex-col md:flex-row md:justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: "#332B52" }}>
                        Order #{order.id}
                      </p>
                      <span className={STATUS_BADGE[order.status] ?? "badge"}>
                        {order.status}
                      </span>
                      <span className={FULFILLMENT_BADGE[order.fulfillment as FulfillmentMethod] ?? "badge"}>
                        {order.fulfillment}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#5E5580" }}>
                      {order.createdAt.toLocaleString()} &middot; {itemCount} item
                      {itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="font-bold self-start md:self-center text-lg" style={{ color: "#5BA4D4" }}>
                    {formatCurrency(order.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
