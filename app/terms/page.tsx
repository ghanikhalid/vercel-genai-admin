import AdminHeader from "@/app/components/AdminHeader";
import ResourceManager from "@/app/components/ResourceManager";
import UnauthorizedView from "@/app/components/UnauthorizedView";
import { loadAdminContext } from "@/lib/adminData";
import { listCatalog, type Term } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const ctx = await loadAdminContext();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <UnauthorizedView
        status={ctx.status}
        user={ctx.user}
        active="terms"
        nextPath="/terms"
      />
    );
  }

  const terms = await listCatalog<Term>("terms");

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="terms" isSuperadmin />
      <main className="main-content">
        <div className="page-header-row">
          <div>
            <span className="kicker">Legal</span>
            <h1 className="page-title">
              Terms &amp; <span className="text-gradient">policies</span>
            </h1>
          </div>
          <p className="page-sub">
            Create and edit the copy members see before they join.
          </p>
        </div>
        <ResourceManager
          kicker="Documents"
          title="Terms"
          subtitle="Each slug is a public document, such as terms or privacy."
          table="terms"
          rows={terms.rows}
          missing={terms.missing}
          error={terms.error}
          searchKeys={["slug", "title", "body"]}
          columns={[
            { key: "title", label: "Title" },
            { key: "slug", label: "Slug", mono: true },
            { key: "is_published", label: "Published" },
            { key: "updated_at", label: "Updated", mono: true, max: 24 },
          ]}
          fields={[
            { key: "title", label: "Title", kind: "text", required: true },
            { key: "slug", label: "Slug", kind: "text", required: true },
            { key: "body", label: "Body", kind: "textarea", required: true },
            { key: "is_published", label: "Published", kind: "toggle" },
          ]}
        />
      </main>
    </div>
  );
}
