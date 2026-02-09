import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  CUSTOM_ORDER_REQUEST_STATUSES,
  type CustomOrderRequestStatus,
} from "@/lib/types";
import CustomOrderRequestActions from "../../components/CustomOrderRequestActions";

export const dynamic = "force-dynamic";

type CustomOrdersPageProps = {
  searchParams: Promise<{ status?: string }>;
};

const STATUS_BADGE: Record<CustomOrderRequestStatus, string> = {
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
  const params = await searchParams;
  const statusFilter = asStatus(params.status);

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
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#40375F" }}>
              Custom Orders
            </h1>
            <p className="text-sm" style={{ color: "#6B5D79" }}>
              Requests for items not listed on the menu.
            </p>
          </div>
          <Link href="/" className="btn-admin-nav py-2 px-4 text-xs w-fit">
            View Site
          </Link>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#3F83B5" }}>
            Status
          </p>
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
          <p style={{ color: "#6B5D79" }}>No custom order requests match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="panel p-0 overflow-hidden">
              <div className="p-5 flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-lg font-semibold" style={{ color: "#40375F" }}>
                      Request #{req.id}
                    </p>
                    <span className={STATUS_BADGE[req.status as CustomOrderRequestStatus] ?? "badge"}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#6B5D79" }}>
                    Submitted {req.createdAt.toLocaleString()}
                  </p>

                  <div className="flex flex-col gap-1 text-sm" style={{ color: "#463A55" }}>
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
                    </p>
                  </div>
                </div>

                <CustomOrderRequestActions
                  requestId={req.id}
                  customerName={req.customerName}
                  customerEmail={req.customerEmail}
                  currentStatus={req.status as CustomOrderRequestStatus}
                />
              </div>

              <div className="border-t border-[#D5CCE5] px-5 py-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1 font-semibold" style={{ color: "#3F83B5" }}>
                    Desired Items
                  </p>
                  <p className="text-sm" style={{ color: "#4A4068" }}>
                    {req.desiredItems}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider mb-1 font-semibold" style={{ color: "#4DAE8A" }}>
                    Details
                  </p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "#4A4068" }}>
                    {req.requestDetails}
                  </p>
                </div>

                {req.messages.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{ color: "#5E5485" }}>
                      Message History
                    </p>
                    <div className="space-y-2">
                      {req.messages.map((message) => (
                        <div
                          key={message.id}
                          className="bg-[#FFFDFC] rounded-xl border border-[#D5CCE5] p-4"
                        >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: "#40375F" }}>
                                {message.subject}
                              </p>
                              <p className="text-xs" style={{ color: "#6B5D79" }}>
                                {message.createdAt.toLocaleString()} \u00b7 {message.sentByEmail}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm mt-3 whitespace-pre-wrap" style={{ color: "#4A4068" }}>
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

