import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSessionFromCookieStore } from "@/lib/adminAuth";
import AdminLogoutButton from "../components/AdminLogoutButton";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSessionFromCookieStore();
  if (!session) {
    redirect("/admin/login?next=/admin");
  }

  return (
    <div className="min-h-screen bg-warm-gradient">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <header className="panel p-5 mb-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#8B5E3C" }}>
              Flour Haus Admin
            </p>
            <p className="text-sm mt-1" style={{ color: "#6B5740" }}>
              Signed in as {session.email}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin" className="btn-ghost py-2 px-4 text-xs">
              Dashboard
            </Link>
            <Link href="/admin/orders" className="btn-ghost py-2 px-4 text-xs">
              Orders
            </Link>
            <Link href="/admin/menu" className="btn-ghost py-2 px-4 text-xs">
              Menu
            </Link>
            <AdminLogoutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
