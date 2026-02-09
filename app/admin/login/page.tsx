import { redirect } from "next/navigation";
import { getAdminSessionFromCookieStore, isAdminAuthConfigured } from "@/lib/adminAuth";
import AdminLoginForm from "../components/AdminLoginForm";

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const session = await getAdminSessionFromCookieStore();
  if (session) {
    redirect("/admin");
  }

  const configured = isAdminAuthConfigured();
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/admin";

  if (!configured) {
    return (
      <div className="min-h-screen bg-warm-gradient flex items-center justify-center px-6">
        <div className="panel p-8 max-w-lg">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "#3D2B1F" }}>
            Admin Auth Not Configured
          </h1>
          <p style={{ color: "#6B5740" }}>
            Set <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code>, and{" "}
            <code>ADMIN_SESSION_SECRET</code> in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-gradient flex items-center justify-center px-6">
      <AdminLoginForm nextPath={nextPath} />
    </div>
  );
}
