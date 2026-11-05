import AdminHeader from "@/app/components/AdminHeader";
import ResourceManager from "@/app/components/ResourceManager";
import UnauthorizedView from "@/app/components/UnauthorizedView";
import { IconShield, IconUser } from "@/app/components/Icons";
import { loadAdminContext } from "@/lib/adminData";
import {
  listCatalog,
  type SignupDomain,
  type WhitelistedEmail,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data || !ctx.user) {
    return (
      <UnauthorizedView
        status={ctx.status}
        user={ctx.user}
        active="security"
        nextPath="/security"
      />
    );
  }

  const superadmins = ctx.data.profiles.filter((p) => p.is_superadmin);
  const currentUserId = ctx.user.id;
  const [domains, emails] = await Promise.all([
    listCatalog<SignupDomain>("allowed_signup_domains", "domain"),
    listCatalog<WhitelistedEmail>("whitelisted_emails", "email"),
  ]);

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
            Superadmins, allowed signup domains, and individual email
            exceptions.
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

        <section className="telemetry-panel">
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

        <ResourceManager
          kicker="Signup"
          title="Allowed signup domains"
          subtitle="Only these email domains can create an account, unless the address is individually listed below."
          table="allowed_signup_domains"
          rows={domains.rows}
          missing={domains.missing}
          error={domains.error}
          searchKeys={["domain", "notes"]}
          columns={[
            { key: "domain", label: "Domain", mono: true },
            { key: "notes", label: "Notes", max: 72 },
            { key: "created_at", label: "Added", mono: true, max: 24 },
          ]}
          fields={[
            {
              key: "domain",
              label: "Domain",
              kind: "text",
              required: true,
              placeholder: "company.com",
            },
            { key: "notes", label: "Notes", kind: "text" },
          ]}
        />

        <ResourceManager
          kicker="Exceptions"
          title="Whitelisted emails"
          subtitle="Individual addresses that can sign up even if their domain is not allowed."
          table="whitelisted_emails"
          rows={emails.rows}
          missing={emails.missing}
          error={emails.error}
          searchKeys={["email", "notes"]}
          columns={[
            { key: "email", label: "Email" },
            { key: "notes", label: "Notes", max: 72 },
            { key: "created_at", label: "Added", mono: true, max: 24 },
          ]}
          fields={[
            {
              key: "email",
              label: "Email",
              kind: "email",
              required: true,
              placeholder: "name@company.com",
            },
            { key: "notes", label: "Notes", kind: "text" },
          ]}
        />
      </main>
    </div>
  );
}
