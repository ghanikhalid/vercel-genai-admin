import AdminHeader from "@/app/components/AdminHeader";
import ModelsStudio from "@/app/components/ModelsStudio";
import UnauthorizedView from "@/app/components/UnauthorizedView";
import { loadAdminContext } from "@/lib/adminData";
import { listCatalog, type LlmModel, type LlmProvider } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const ctx = await loadAdminContext();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <UnauthorizedView
        status={ctx.status}
        user={ctx.user}
        active="models"
        nextPath="/models"
      />
    );
  }

  const [providers, models] = await Promise.all([
    listCatalog<LlmProvider>("llm_providers", "name"),
    listCatalog<LlmModel>("llm_models", "name"),
  ]);

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="models" isSuperadmin />
      <main className="main-content">
        <ModelsStudio
          providers={providers.rows}
          models={models.rows}
          missing={providers.missing || models.missing}
          error={providers.error || models.error}
        />
      </main>
    </div>
  );
}
