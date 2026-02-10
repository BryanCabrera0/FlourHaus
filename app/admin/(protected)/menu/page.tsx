import prisma from "@/lib/prisma";
import { ensureCookieVariantsForActiveMenuItems } from "@/lib/menuItemVariantRules";
import AdminMenuManager from "../../components/AdminMenuManager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await ensureCookieVariantsForActiveMenuItems(prisma);

  const menuItems = await prisma.menuItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { id: "asc" }],
    include: {
      variants: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });

  return (
    <div className="space-y-5">
      <div className="panel menu-header-panel p-6">
        <h1 className="text-3xl font-bold mb-2 text-fh-heading">
          Menu Manager
        </h1>
        <p className="text-fh-muted">
          Create, update, archive, and sort items shown on the storefront.
        </p>
      </div>
      <AdminMenuManager
        initialItems={menuItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          variants: item.variants.map((variant) => ({
            ...variant,
            createdAt: variant.createdAt.toISOString(),
            updatedAt: variant.updatedAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
