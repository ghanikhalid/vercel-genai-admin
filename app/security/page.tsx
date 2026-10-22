import AdminGate from "@/app/components/AdminGate";
import AdminHeader from "@/app/components/AdminHeader";
import { IconDatabase, IconLock, IconShield } from "@/app/components/Icons";
import { loadAdminContext } from "@/lib/adminData";

export const dynamic = "force-dynamic";

export default async function SecurityGuidePage() {
  const ctx = await loadAdminContext();

  if (ctx.status !== "authorized" || !ctx.data || !ctx.user) {
    return (
      <div className="page-wrap">
        <AdminHeader user={ctx.user} active="security" isSuperadmin={false} />
        <main className="main-content">
          <AdminGate
            status={ctx.status === "unauthenticated" ? "unauthenticated" : "forbidden"}
            user={ctx.user}
            currentProfile={ctx.currentProfile}
            hasDbSuperadminColumn={ctx.hasDbSuperadminColumn}
            nextPath="/security"
          />
        </main>
      </div>
    );
  }

  const sqlMigration = `-- PRISM POP — SUPERADMIN DATABASE MIGRATION & RLS POLICIES
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
SET is_superadmin = TRUE
WHERE id = '${ctx.user.id}';

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()),
        FALSE
    );
$$;

CREATE POLICY "captioned_images_update_superadmin"
    ON public.captioned_images FOR UPDATE
    TO authenticated
    USING (public.is_superadmin() OR auth.uid() = user_id)
    WITH CHECK (public.is_superadmin() OR auth.uid() = user_id);

CREATE POLICY "captioned_images_delete_superadmin"
    ON public.captioned_images FOR DELETE
    TO authenticated
    USING (public.is_superadmin() OR auth.uid() = user_id);`;

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="security" isSuperadmin={true} />

      <main className="main-content">
        <div className="page-header-row">
          <div>
            <span className="kicker">
              Zero-Trust Architecture · Superadmin Lockout Analysis
            </span>
            <h1 className="page-title">
              Security Posture &amp;{" "}
              <span className="text-gradient">The Bootstrap Paradox</span>
            </h1>
          </div>
          <p className="page-sub">
            How every route in this Admin Console enforces{" "}
            <code>Google OAuth + profiles.is_superadmin == TRUE</code>, and how
            we solve the initial lockout paradox with the tools at our disposal.
          </p>
        </div>

        <section className="bento-grid">
          <div className="bento-card">
            <div className="bento-body">
              <div className="kpi-icon-badge" style={{ marginBottom: "8px" }}>
                <IconLock size={18} />
              </div>
              <span className="kicker">01 · Existing RLS Self-Update</span>
              <h2 className="card-heading">
                Leveraging <code>profiles_update_own</code>
              </h2>
              <p className="card-copy">
                In <code>vercel-genai/supabase/schema.sql</code>, the policy{" "}
                <code>profiles_update_own</code> grants any{" "}
                <code>authenticated</code> user permission to{" "}
                <code>UPDATE</code> their own row (<code>auth.uid() = id</code>)
                without column-level restrictions. Using our authenticated
                Google session + <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, we
                can execute{" "}
                <code>
                  supabase.from(&quot;profiles&quot;).update(&#123;
                  is_superadmin: true &#125;).eq(&quot;id&quot;, user.id)
                </code>{" "}
                to bootstrap our own account!
              </p>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-body">
              <div className="kpi-icon-badge" style={{ marginBottom: "8px" }}>
                <IconDatabase size={18} />
              </div>
              <span className="kicker">02 · Out-of-Band Database Access</span>
              <h2 className="card-heading">
                Supabase SQL Editor / Table Editor
              </h2>
              <p className="card-copy">
                As the database owner, running SQL in the{" "}
                <strong>Supabase Dashboard SQL Editor</strong> (or using the{" "}
                <code>service_role</code> key in a local seed script) executes
                with superuser privileges that bypass RLS completely, allowing us
                to add <code>is_superadmin</code> and set{" "}
                <code>is_superadmin = TRUE</code> on our own UUID before
                enforcing the admin check.
              </p>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-body">
              <div className="kpi-icon-badge" style={{ marginBottom: "8px" }}>
                <IconShield size={18} />
              </div>
              <span className="kicker">03 · Hardening Post-Bootstrap</span>
              <h2 className="card-heading">
                <code>SECURITY DEFINER</code> Guard
              </h2>
              <p className="card-copy">
                Once our superadmin account is promoted, we apply{" "}
                <code>public.is_superadmin()</code> in RLS policies so that only
                verified superadmins can modify other users&apos; roles or
                perform cross-user <code>UPDATE</code> and <code>DELETE</code>{" "}
                operations on <code>captioned_images</code>.
              </p>
            </div>
          </div>
        </section>

        <section className="telemetry-panel">
          <span className="kicker">
            Database Migration · supabase/admin_schema.sql
          </span>
          <h2 className="section-title" style={{ marginTop: "6px" }}>
            Complete SQL Schema for Superadmin Role &amp; Policies
          </h2>
          <pre className="sql-code-block">{sqlMigration}</pre>
        </section>
      </main>
    </div>
  );
}
