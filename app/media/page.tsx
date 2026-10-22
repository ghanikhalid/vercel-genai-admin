import AdminGate from "@/app/components/AdminGate";
import AdminHeader from "@/app/components/AdminHeader";
import MediaManager from "@/app/components/MediaManager";
import { loadAdminContext } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function MediaAdminPage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data) {
    return (
      <div className="page-wrap">
        <AdminHeader user={ctx.user} active="media" isSuperadmin={false} />
        <main className="main-content">
          <AdminGate
            status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
            user={ctx.user}
            currentProfile={ctx.currentProfile}
            hasDbSuperadminColumn={ctx.hasDbSuperadminColumn}
            nextPath="/media"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="media" isSuperadmin={true} />
      <main className="main-content">
        <MediaManager
          media={ctx.data.media}
          profiles={ctx.data.profiles}
          storageObjects={ctx.data.storageObjects}
        />
      </main>
    </div>
  );
}
