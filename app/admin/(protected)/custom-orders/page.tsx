import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  CUSTOM_ORDER_REQUEST_STATUSES,
  type CustomOrderRequestStatus,
} from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import CustomOrderRequestActions from "../../components/CustomOrderRequestActions";

export const dynamic = "force-dynamic";

type CustomOrdersPageProps = {
  searchParams: { status?: string };
};

const STATUS_BADGE: Record<string, string> = {
  pending: "badge badge-new",
  accepted: "badge badge-paid",
  denied: "badge badge-canceled",
};

function asStatus(value: string | undefined): CustomOrderRequestStatus | undefined {
  if (!value) {
    return undefined;
  }
  return CUSTOM_ORDER_REQUEST_STATUSES.includes(value as CustomOrderRequestStatus)
    ? (value as CustomOrderRequestStatus)
    : undefined;
}

function getFilterHref({ status }: { status?: string }) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  return query ? `/admin/custom-orders?${query}` : "/admin/custom-orders";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not specified";
  }
  return value.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminCustomOrdersPage({ searchParams }: CustomOrdersPageProps) {
  const statusFilter = asStatus(searchParams.status);

  const requests = await prisma.customOrderRequest.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 250,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-fh-heading">Custom Orders</h1>
            <p className="text-sm text-fh-muted">
              Requests for items not listed on the menu.
            </p>
          </div>
          <Link href="/" className="btn-admin-nav py-2 px-4 text-xs w-fit">
            View Site
          </Link>
        </div>

        <div className="mt-6">
          <p className="kicker kicker-blue mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={getFilterHref({})}
              className={!statusFilter ? "filter-chip-active" : "filter-chip"}
            >
              All
            </Link>
            {CUSTOM_ORDER_REQUEST_STATUSES.map((status) => (
              <Link
                key={status}
                href={getFilterHref({ status })}
                className={statusFilter === status ? "filter-chip-active" : "filter-chip"}
              >
                {status}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="panel p-6">
          <p className="text-fh-muted">No custom order requests match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="panel p-0 overflow-hidden">
              <div className="p-5 flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-lg font-semibold text-fh-heading">Request #{req.id}</p>
                    <span className={STATUS_BADGE[req.status] ?? "badge"}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-fh-muted">Submitted {req.createdAt.toLocaleString()}</p>

                <div className="flex flex-col gap-1 text-sm text-fh-body">
                  <p>
                    <span className="font-semibold">Customer:</span> {req.customerName}
                    {" \u00b7 "}
                    <a className="underline" href={`mailto:${req.customerEmail}`}>
                        {req.customerEmail}
                      </a>
                      {req.customerPhone ? ` \u00b7 ${req.customerPhone}` : ""}
                    </p>
                    <p>
                      <span className="font-semibold">Needed by:</span> {formatDate(req.requestedDate)}
                      {" \u00b7 "}
                      <span className="font-semibold">Fulfillment:</span>{" "}
                      {req.fulfillmentPreference ?? "Not specified"}
                      {req.budget ? ` \u00b7 Budget: ${req.budget}` : ""}
                      {req.paymentPaidAt
                        ? " \u00b7 Paid"
                        : typeof req.paymentAmount === "number"
                          ? ` \u00b7 Payment: ${formatCurrency(req.paymentAmount)}`
                          : ""}
                    </p>
                  </div>
                </div>

                <CustomOrderRequestActions
                  requestId={req.id}
                  customerName={req.customerName}
                  customerEmail={req.customerEmail}
                  currentStatus={req.status as CustomOrderRequestStatus}
                  paymentAmount={req.paymentAmount}
                  paymentPaidAt={req.paymentPaidAt ? req.paymentPaidAt.toISOString() : null}
                />
              </div>

              <div className="border-t surface-divider px-5 py-4 space-y-3">
                <div>
                  <p className="kicker kicker-blue mb-1">Desired Items</p>
                  <p className="text-sm text-fh-body">{req.desiredItems}</p>
                </div>

                <div>
                  <p className="kicker kicker-success mb-1">Details</p>
                  <p className="text-sm whitespace-pre-wrap text-fh-body">{req.requestDetails}</p>
                </div>

                {req.messages.length > 0 ? (
                  <div className="mt-2">
                    <p className="kicker kicker-accent mb-2">Message History</p>
                    <div className="space-y-2">
                      {req.messages.map((message) => (
                        <div
                          key={message.id}
                          className="surface-soft p-4"
                        >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                            <div>
                              <p className="text-sm font-semibold text-fh-heading">
                                {message.subject}
                              </p>
                              <p className="text-xs text-fh-muted">
                                {message.createdAt.toLocaleString()} \u00b7 {message.sentByEmail}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm mt-3 whitespace-pre-wrap text-fh-body">
                            {message.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
