import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSessionFromCookieStore } from "@/lib/adminAuth";
import AdminLogoutButton from "../components/AdminLogoutButton";
import AdminNav from "../components/AdminNav";

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
    <div className="bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <header className="panel p-4 sm:p-5 mb-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex items-center gap-3">
            <div>
              <p
                className="text-xs uppercase tracking-[0.2em] font-semibold"
                style={{ color: "#5E5485" }}
              >
                Flour Haus Admin
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6B5D79" }}>
                {session.email}
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 flex-wrap">
            <AdminNav />
            <span
              className="hidden sm:block w-px h-5 mx-1"
              style={{ background: "rgba(155, 114, 207, 0.15)" }}
            />
            <Link
              href="/"
              className="btn-admin-nav py-2 px-3 text-xs"
              style={{ fontSize: "0.7rem" }}
            >
              Back to site
            </Link>
            <AdminLogoutButton />
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
