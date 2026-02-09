import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  FULFILLMENT_METHODS,
  ORDER_STATUSES,
  type FulfillmentMethod,
  type OrderStatus,
} from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { parseOrderItems } from "@/lib/orderItems";
import OrderStatusControl from "../../components/OrderStatusControl";

export const dynamic = "force-dynamic";

type OrdersPageProps = {
  searchParams: { status?: string; fulfillment?: string };
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
  const statusFilter = asOrderStatus(searchParams.status);
  const fulfillmentFilter = asFulfillment(searchParams.fulfillment);

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
        <h1 className="text-3xl font-bold mb-5 text-fh-heading">Orders</h1>
        <div className="flex flex-col gap-4">
          <div>
            <p className="kicker kicker-blue mb-2">Status</p>
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
            <p className="kicker kicker-success mb-2">Fulfillment</p>
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
          <p className="text-fh-muted">No orders match the current filters.</p>
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
                      <p className="text-lg font-semibold text-fh-heading">Order #{order.id}</p>
                      <span className={STATUS_BADGE[order.status] ?? "badge"}>
                        {order.status}
                      </span>
                      <span className={FULFILLMENT_BADGE[order.fulfillment] ?? "badge"}>
                        {order.fulfillment}
                      </span>
                    </div>
                    <p className="text-sm text-fh-muted">{order.createdAt.toLocaleString()}</p>

                    {/* Customer info */}
                    {order.customerName ? (
                      <div className="flex items-center gap-2 text-sm text-fh-body">
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
                      <p className="kicker kicker-blue mb-1">Notes</p>
                      {order.notes}
                    </div>
                  </div>
                ) : null}

                {/* Items section */}
                <div className="border-t border-[#D5CCE5] px-5 py-4 space-y-1">
                  {items.length === 0 ? (
                    <p className="text-sm text-fh-muted">No line items captured.</p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={`${order.id}-${item.id}`}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-fh-heading">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-fh-muted">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Total */}
                <div className="border-t border-[#D5CCE5] px-5 py-3 flex justify-end">
                  <p className="font-bold text-lg text-fh-accent-blue">{formatCurrency(order.total)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
