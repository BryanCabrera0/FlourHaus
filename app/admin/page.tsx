import prisma from "../lib/prisma";

export default async function AdminPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-[#4A3F4B] mb-8">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-[#6B5B6E]">No orders yet.</p>
      ) : (
        orders.map((order) => {
          const items = JSON.parse(order.items);
          return (
            <div
              key={order.id}
              className="bg-white p-6 rounded-xl border border-[#F0D9E8] mb-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-sm text-[#6B5B6E]">
                    Order #{order.id}
                  </span>
                  <span className="ml-4 text-sm text-[#6B5B6E]">
                    {order.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      order.fulfillment === "delivery"
                        ? "bg-[#F0D9E8] text-[#6B5B6E]"
                        : "bg-[#E8F0D9] text-[#5B6B4A]"
                    }`}
                  >
                    {order.fulfillment}
                  </span>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      order.status === "new"
                        ? "bg-[#D9E8F0] text-[#4A5B6B]"
                        : "bg-[#E8F0D9] text-[#5B6B4A]"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="mb-3">
                {items.map(
                  (
                    item: { name: string; quantity: number; price: number },
                    index: number
                  ) => (
                    <p key={index} className="text-sm text-[#4A3F4B]">
                      {item.quantity}x {item.name} — $
                      {(item.price * item.quantity).toFixed(2)}
                    </p>
                  )
                )}
              </div>
              <p className="font-bold text-[#D4A0B9]">
                Total: ${order.total.toFixed(2)}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
