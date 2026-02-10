import Link from "next/link";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import type { FulfillmentMethod } from "@/lib/types";
import CustomOrderPayClient from "./pay-client";

export const dynamic = "force-dynamic";

type CustomOrderPayPageProps = {
  params: Promise<{ token: string }>;
};

function parseFulfillment(value: unknown): FulfillmentMethod {
  return value === "delivery" ? "delivery" : "pickup";
}

export default async function CustomOrderPayPage({ params }: CustomOrderPayPageProps) {
  const resolvedParams = await params;
  const token = typeof resolvedParams.token === "string" ? resolvedParams.token.trim() : "";

  if (!token) {
    return (
      <div className="bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="panel p-8">
            <h1 className="text-3xl font-bold text-fh-heading">Payment link missing</h1>
            <p className="text-sm text-fh-muted mt-2">
              Please use the payment link sent to your email.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-block py-3 px-6 text-sm">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const request = await prisma.customOrderRequest.findFirst({
    where: { paymentToken: token },
    select: {
      id: true,
      status: true,
      fulfillmentPreference: true,
      desiredItems: true,
      deliveryAddress: true,
      paymentAmount: true,
      paymentPaidAt: true,
    },
  });

  if (!request) {
    return (
      <div className="bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="panel p-8">
            <p className="kicker kicker-accent mb-3">Custom Order Payment</p>
            <h1 className="text-3xl font-bold text-fh-heading">Link expired</h1>
            <p className="text-sm text-fh-muted mt-2">
              This payment link is invalid or has expired. Please contact the bakery for a new link.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-block py-3 px-6 text-sm">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (request.paymentPaidAt) {
    return (
      <div className="bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="panel p-8">
            <p className="kicker kicker-success mb-3">Custom Order Payment</p>
            <h1 className="text-3xl font-bold text-fh-heading">Already paid</h1>
            <p className="text-sm text-fh-muted mt-2">
              Payment for custom order #{request.id} was already received.
            </p>
            <div className="flex items-center gap-2 flex-wrap mt-6">
              <Link href="/menu" className="btn-admin-nav inline-block py-3 px-6 text-sm">
                Browse menu
              </Link>
              <Link href="/" className="btn-primary inline-block py-3 px-6 text-sm">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const paymentAmount = typeof request.paymentAmount === "number" ? request.paymentAmount : null;
  if (paymentAmount === null) {
    return (
      <div className="bg-surface">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="panel p-8">
            <p className="kicker kicker-accent mb-3">Custom Order Payment</p>
            <h1 className="text-3xl font-bold text-fh-heading">Payment unavailable</h1>
            <p className="text-sm text-fh-muted mt-2">
              This custom order is missing a payment amount. Please contact the bakery.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-block py-3 px-6 text-sm">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fulfillment = parseFulfillment(request.fulfillmentPreference);

  return (
    <div className="bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="panel p-7 sm:p-9">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="kicker kicker-accent mb-2">Custom Order Payment</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-fh-heading">
                Pay for Custom Order #{request.id}
              </h1>
              <p className="text-sm text-fh-muted mt-2">
                Total:{" "}
                <span className="font-semibold text-fh-heading">
                  {formatCurrency(paymentAmount)}
                </span>
              </p>
              <p className="text-sm text-fh-muted mt-1">
                Fulfillment:{" "}
                <span className="font-semibold text-fh-heading">
                  {fulfillment === "delivery" ? "Delivery" : "Pickup"}
                </span>
              </p>
            </div>
            <Link href="/" className="btn-ghost py-2.5 px-4 text-xs w-fit">
              Back to home
            </Link>
          </div>

          <div className="mt-7">
            <div className="surface-soft p-5">
              <p className="kicker kicker-blue mb-2">Request summary</p>
              <p className="text-sm text-fh-body">{request.desiredItems}</p>
            </div>
          </div>

          <div className="mt-8">
            <CustomOrderPayClient
              token={token}
              requestId={request.id}
              fulfillment={fulfillment}
              amount={paymentAmount}
              defaultDeliveryAddress={request.deliveryAddress}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
