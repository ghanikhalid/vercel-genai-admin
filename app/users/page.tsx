import AdminGate from "@/app/components/AdminGate";
import AdminHeader from "@/app/components/AdminHeader";
import UsersManager from "@/app/components/UsersManager";
import { loadAdminContext } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data || !ctx.user) {
    return (
      <div className="page-wrap">
        <AdminHeader user={ctx.user} active="users" isSuperadmin={false} />
        <main className="main-content">
          <AdminGate
            status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
            user={ctx.user}
            currentProfile={ctx.currentProfile}
            hasDbSuperadminColumn={ctx.hasDbSuperadminColumn}
            nextPath="/users"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="users" isSuperadmin={true} />
      <main className="main-content">
        <UsersManager
          profiles={ctx.data.profiles}
          media={ctx.data.media}
          votes={ctx.data.votes}
          currentUserId={ctx.user.id}
        />
      </main>
    </div>
  );
}
