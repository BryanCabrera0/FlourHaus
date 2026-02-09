import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { parseOrderItems } from "@/lib/orderItems";
import AdminStripePanel from "../components/AdminStripePanel";

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
          <p className="kicker kicker-accent mb-2">Orders Today</p>
          <p className="text-3xl font-bold text-fh-heading">{todaysOrders}</p>
        </div>
        <div className="stat-card stat-card-green p-6">
          <p className="kicker kicker-success mb-2">Open Orders</p>
          <p className="text-3xl font-bold text-fh-heading">{openOrders}</p>
        </div>
        <div className="stat-card stat-card-teal p-6">
          <p className="kicker kicker-blue mb-2">Revenue Today</p>
          <p className="text-3xl font-bold text-fh-heading">
            {formatCurrency(revenue)}
          </p>
        </div>
        <div className="stat-card stat-card-rose p-6">
          <p className="kicker kicker-success mb-2">Active Menu Items</p>
          <p className="text-3xl font-bold text-fh-heading">
            {activeMenuItems}
            <span className="text-lg font-normal text-fh-muted">
              {" "}/ {totalMenuItems}
            </span>
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-fh-heading">Recent Orders</h2>
          <Link href="/admin/orders" className="btn-primary py-2 px-4 text-xs">
            Manage Orders
          </Link>
        </div>

        {totalOrders === 0 ? (
          <p className="text-fh-muted">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const items = parseOrderItems(order.items);
              const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="surface-soft p-4 flex flex-col md:flex-row md:justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-fh-heading">Order #{order.id}</p>
                      <span className={STATUS_BADGE[order.status] ?? "badge"}>
                        {order.status}
                      </span>
                      <span className={FULFILLMENT_BADGE[order.fulfillment] ?? "badge"}>
                        {order.fulfillment}
                      </span>
                    </div>
                    <p className="text-sm text-fh-muted">
                      {order.createdAt.toLocaleString()} &middot; {itemCount} item
                      {itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="font-bold self-start md:self-center text-lg text-fh-accent-blue">
                    {formatCurrency(order.total)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AdminStripePanel />
    </div>
  );
}
