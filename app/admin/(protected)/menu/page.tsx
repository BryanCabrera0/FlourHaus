import prisma from "@/app/lib/prisma";
import AdminMenuManager from "../../components/AdminMenuManager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const menuItems = await prisma.menuItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { id: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="admin-mesh-bg" aria-hidden="true" />
      <div className="panel menu-header-panel panel-hover-glow animate-card-enter p-6 relative z-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "#40375F" }}>
          Menu Manager
        </h1>
        <p style={{ color: "#6B5D79" }}>
          Create, update, archive, and sort items shown on the storefront.
        </p>
      </div>
      <AdminMenuManager
        initialItems={menuItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
