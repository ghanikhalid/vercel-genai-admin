import AdminGate from "@/app/components/AdminGate";
import AdminHeader from "@/app/components/AdminHeader";
import TelemetryDashboard from "@/app/components/TelemetryDashboard";
import { loadAdminContext } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data) {
    return (
      <div className="page-wrap">
        <AdminHeader
          user={ctx.user}
          active="telemetry"
          isSuperadmin={false}
        />
        <main className="main-content">
          <AdminGate
            status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
            user={ctx.user}
            nextPath="/"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <AdminHeader
        user={ctx.user}
        active="telemetry"
        isSuperadmin={true}
      />
      <main className="main-content">
        <TelemetryDashboard
          stats={ctx.data.stats}
          profiles={ctx.data.profiles}
          media={ctx.data.media}
          votes={ctx.data.votes}
          storageObjects={ctx.data.storageObjects}
        />
      </main>
    </div>
  );
}
