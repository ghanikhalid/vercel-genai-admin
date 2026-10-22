import Link from "next/link";
import AdminHeader from "@/app/components/AdminHeader";
import { loadAdminContext } from "@/lib/adminData";

export default async function NotFound() {
  const ctx = await loadAdminContext();

  return (
    <div className="page-wrap">
      <AdminHeader
        user={ctx.user}
        isSuperadmin={ctx.status === "authorized"}
      />
      <main className="main-content">
        <section className="gate-card">
          <span className="kicker">404 · Route Not Found</span>
          <h1 className="gate-title">
            Lost in the <span className="text-gradient">Admin Multiverse.</span>
          </h1>
          <p className="gate-copy">
            This route does not exist in the Prism Pop Superadmin Console.
          </p>
          <div className="lockout-actions-box">
            <Link href="/" className="btn-primary">
              Return to Superadmin Console
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
