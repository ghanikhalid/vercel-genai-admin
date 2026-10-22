import AdminGate from "@/app/components/AdminGate";
import AdminHeader from "@/app/components/AdminHeader";
import RatingsViewer from "@/app/components/RatingsViewer";
import { loadAdminContext } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function RatingsAdminPage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data) {
    return (
      <div className="page-wrap">
        <AdminHeader user={ctx.user} active="ratings" isSuperadmin={false} />
        <main className="main-content">
          <AdminGate
            status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
            user={ctx.user}
            currentProfile={ctx.currentProfile}
            hasDbSuperadminColumn={ctx.hasDbSuperadminColumn}
            nextPath="/ratings"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="ratings" isSuperadmin={true} />
      <main className="main-content">
        <RatingsViewer
          votes={ctx.data.votes}
          media={ctx.data.media}
          profiles={ctx.data.profiles}
        />
      </main>
    </div>
  );
}
