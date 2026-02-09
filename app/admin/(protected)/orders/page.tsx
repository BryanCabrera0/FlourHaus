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
        <h1 className="text-3xl font-bold mb-5" style={{ color: "#40375F" }}>
          Orders
        </h1>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#3F83B5" }}>
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={getFilterHref({ fulfillment: fulfillmentFilter })}
                className={!statusFilter ? "filter-chip-active" : "filter-chip"}
              >
                All
              </Link>
              {ORDER_STATUSES.map((status) => (
                <Link
                  key={status}
                  href={getFilterHref({ status, fulfillment: fulfillmentFilter })}
                  className={statusFilter === status ? "filter-chip-active" : "filter-chip"}
                >
                  {status}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#4DAE8A" }}>
              Fulfillment
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={getFilterHref({ status: statusFilter })}
                className={!fulfillmentFilter ? "filter-chip-active" : "filter-chip"}
              >
                All
              </Link>
              {FULFILLMENT_METHODS.map((fulfillment) => (
                <Link
                  key={fulfillment}
                  href={getFilterHref({ status: statusFilter, fulfillment })}
                  className={fulfillmentFilter === fulfillment ? "filter-chip-active" : "filter-chip"}
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
          <p style={{ color: "#6B5D79" }}>No orders match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = parseOrderItems(order.items);
            return (
              <div key={order.id} className="panel p-0 overflow-hidden">
                {/* Header row */}
                <div className="p-5 flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-semibold" style={{ color: "#40375F" }}>
                        Order #{order.id}
                      </p>
                      <span className={STATUS_BADGE[order.status] ?? "badge"}>
                        {order.status}
                      </span>
                      <span className={FULFILLMENT_BADGE[order.fulfillment as FulfillmentMethod] ?? "badge"}>
                        {order.fulfillment}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#6B5D79" }}>
                      {order.createdAt.toLocaleString()}
                    </p>

                    {/* Customer info */}
                    {order.customerName ? (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "#463A55" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>
                          {order.customerName}
                          {order.customerPhone ? ` \u00b7 ${order.customerPhone}` : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <OrderStatusControl
                    orderId={order.id}
                    currentStatus={order.status as OrderStatus}
                  />
                </div>

                {/* Notes callout */}
                {order.notes ? (
                  <div className="mx-5 mb-4">
                    <div className="notes-callout">
                      <p className="text-xs uppercase tracking-wider mb-1 font-semibold" style={{ color: "#3F83B5" }}>
                        Notes
                      </p>
                      {order.notes}
                    </div>
                  </div>
                ) : null}

                {/* Items section */}
                <div className="border-t border-[#D5CCE5] px-5 py-4 space-y-1">
                  {items.length === 0 ? (
                    <p className="text-sm" style={{ color: "#6B5D79" }}>
                      No line items captured.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={`${order.id}-${item.id}`}
                        className="flex justify-between text-sm"
                      >
                        <span style={{ color: "#40375F" }}>
                          {item.quantity}x {item.name}
                        </span>
                        <span style={{ color: "#6B5D79" }}>
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                <div className="border-t border-[#D5CCE5] px-5 py-3 flex justify-end">
                  <p className="font-bold text-lg" style={{ color: "#3F83B5" }}>
                    {formatCurrency(order.total)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
