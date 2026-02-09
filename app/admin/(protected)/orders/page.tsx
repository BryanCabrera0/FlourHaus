import Link from "next/link";
import prisma from "@/app/lib/prisma";
import {
  FULFILLMENT_METHODS,
  ORDER_STATUSES,
  type FulfillmentMethod,
  type OrderStatus,
} from "@/app/lib/types";
import { formatCurrency } from "@/app/lib/format";
import { parseOrderItems } from "@/lib/orderItems";
import OrderStatusControl from "../../components/OrderStatusControl";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams: Promise<{ status?: string; fulfillment?: string }>;
};

function asOrderStatus(value: string | undefined): OrderStatus | undefined {
  if (!value) {
    return undefined;
  }
  return ORDER_STATUSES.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : undefined;
}

function asFulfillment(value: string | undefined): FulfillmentMethod | undefined {
  if (!value) {
    return undefined;
  }
  return FULFILLMENT_METHODS.includes(value as FulfillmentMethod)
    ? (value as FulfillmentMethod)
    : undefined;
}

function getFilterHref({
  status,
  fulfillment,
}: {
  status?: string;
  fulfillment?: string;
}): string {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (fulfillment) {
    params.set("fulfillment", fulfillment);
  }
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  const statusFilter = asOrderStatus(params.status);
  const fulfillmentFilter = asFulfillment(params.fulfillment);

  const orders = await prisma.order.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(fulfillmentFilter ? { fulfillment: fulfillmentFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h1 className="text-3xl font-bold mb-4" style={{ color: "#3D2B1F" }}>
          Orders
        </h1>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
              Status Filter
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={getFilterHref({ fulfillment: fulfillmentFilter })} className="btn-ghost text-xs py-2 px-3">
                All
              </Link>
              {ORDER_STATUSES.map((status) => (
                <Link
                  key={status}
                  href={getFilterHref({ status, fulfillment: fulfillmentFilter })}
                  className="btn-ghost text-xs py-2 px-3"
                >
                  {status}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#8B5E3C" }}>
              Fulfillment Filter
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={getFilterHref({ status: statusFilter })} className="btn-ghost text-xs py-2 px-3">
                All
              </Link>
              {FULFILLMENT_METHODS.map((fulfillment) => (
                <Link
                  key={fulfillment}
                  href={getFilterHref({ status: statusFilter, fulfillment })}
                  className="btn-ghost text-xs py-2 px-3"
                >
                  {fulfillment}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="panel p-6">
          <p style={{ color: "#6B5740" }}>No orders match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = parseOrderItems(order.items);
            return (
              <div key={order.id} className="panel p-5">
                <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: "#3D2B1F" }}>
                      Order #{order.id}
                    </p>
                    <p className="text-sm" style={{ color: "#6B5740" }}>
                      {order.createdAt.toLocaleString()}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#6B5740" }}>
                      Fulfillment: {order.fulfillment}
                    </p>
                    <p className="text-sm" style={{ color: "#6B5740" }}>
                      Stripe session: {order.stripeSessionId}
                    </p>
                    {order.customerName ? (
                      <p className="text-sm" style={{ color: "#6B5740" }}>
                        Customer: {order.customerName}
                        {order.customerPhone ? ` (${order.customerPhone})` : ""}
                      </p>
                    ) : null}
                    {order.notes ? (
                      <p className="text-sm mt-1" style={{ color: "#6B5740" }}>
                        Notes: {order.notes}
                      </p>
                    ) : null}
                  </div>
                  <OrderStatusControl
                    orderId={order.id}
                    currentStatus={order.status as OrderStatus}
                  />
                </div>

                <div className="mt-4 border-t border-[#ECDCCF] pt-4 space-y-1">
                  {items.length === 0 ? (
                    <p className="text-sm" style={{ color: "#6B5740" }}>
                      No line items captured.
                    </p>
                  ) : (
                    items.map((item) => (
                      <p key={`${order.id}-${item.id}`} className="text-sm" style={{ color: "#3D2B1F" }}>
                        {item.quantity}x {item.name} — {formatCurrency(item.price * item.quantity)}
                      </p>
                    ))
                  )}
                </div>

                <p className="mt-4 font-bold" style={{ color: "#8B5E3C" }}>
                  Total: {formatCurrency(order.total)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
