import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "../../lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    await prisma.order.create({
      data: {
        items: session.metadata?.items ?? "[]",
        total: (session.amount_total ?? 0) / 100,
        fulfillment: session.metadata?.fulfillment ?? "pickup",
        stripeSessionId: session.id,
      },
    });
  }

  return NextResponse.json({ received: true });
}
