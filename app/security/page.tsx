import AdminGate from "@/app/components/AdminGate";
import AdminHeader from "@/app/components/AdminHeader";
import { IconShield, IconUser } from "@/app/components/Icons";
import { loadAdminContext } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data || !ctx.user) {
    return (
      <div className="page-wrap">
        <AdminHeader user={ctx.user} active="security" isSuperadmin={false} />
        <main className="main-content">
          <AdminGate
            status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
            user={ctx.user}
            nextPath="/security"
          />
        </main>
      </div>
    );
  }

  const superadmins = ctx.data.profiles.filter((p) => p.is_superadmin);
  const currentUserId = ctx.user.id;

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="security" isSuperadmin={true} />

      <main className="main-content">
        <div className="page-header-row">
          <div>
            <span className="kicker">Access</span>
            <h1 className="page-title">
              Who can open{" "}
              <span className="text-gradient">this console</span>
            </h1>
          </div>
          <p className="page-sub">
            Superadmin is stored on each member profile and can only be changed
            by someone who already has it. Nobody can grant it to themselves.
          </p>
        </div>

        <section className="bento-grid">
          <div className="bento-card">
            <div className="bento-body">
              <div className="kpi-icon-badge" style={{ marginBottom: "8px" }}>
                <IconShield size={18} />
              </div>
              <span className="kicker">Active superadmins</span>
              <h2 className="card-heading">{superadmins.length}</h2>
              <p className="card-copy">
                Grant or revoke from Users. The last superadmin cannot be
                removed.
              </p>
            </div>
          </div>
        </section>

        <section className="telemetry-panel" style={{ marginTop: "22px" }}>
          <div className="feed-header">
            <h2 className="section-title">Approved accounts</h2>
            <span className="count-pill">{superadmins.length} superadmin</span>
          </div>

          <div className="dossier-media-list" style={{ marginTop: "16px" }}>
            {superadmins.map((prof) => (
              <div key={prof.id} className="dossier-media-item">
                {prof.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prof.avatar_url}
                    alt={prof.full_name}
                    className="user-avatar-thumb"
                  />
                ) : (
                  <div className="user-avatar-fallback">
                    <IconUser size={16} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="user-cell-name">{prof.full_name}</div>
                  <div className="leader-sub">
                    {prof.id === currentUserId ? "You" : "Superadmin"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
