import { redirect } from "next/navigation";
import { getAdminSessionFromCookieStore, isAdminAuthConfigured } from "@/lib/adminAuth";
import AdminLoginForm from "../components/AdminLoginForm";

type AdminLoginPageProps = {
  searchParams: { next?: string };
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const session = await getAdminSessionFromCookieStore();
  if (session) {
    redirect("/admin");
  }

  const configured = isAdminAuthConfigured();
  const nextPath = typeof searchParams.next === "string" ? searchParams.next : "/admin";

  if (!configured) {
    return (
      <div className="bg-surface flex items-center justify-center px-6 py-16">
        <div className="panel p-8 max-w-lg">
          <h1 className="text-3xl font-bold mb-3 text-fh-heading">
            Admin Auth Not Configured
          </h1>
          <p className="text-fh-muted">
            Set <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code>, and{" "}
            <code>ADMIN_SESSION_SECRET</code> in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-[#A78BDB]">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-fh-heading">
            Flour Haus
          </h1>
          <p className="text-sm mt-1 text-fh-muted">
            Admin Portal
          </p>
        </div>
        <AdminLoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
