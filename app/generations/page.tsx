import AdminHeader from "@/app/components/AdminHeader";
import GenerationsStudio from "@/app/components/GenerationsStudio";
import UnauthorizedView from "@/app/components/UnauthorizedView";
import { loadAdminContext } from "@/lib/adminData";
import { listCatalog } from "@/lib/catalog";
import type {
  GenerationExample,
  GenerationRequest,
  LlmModel,
  LlmResponse,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function GenerationsPage() {
  const ctx = await loadAdminContext();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <UnauthorizedView
        status={ctx.status}
        user={ctx.user}
        active="generations"
        nextPath="/generations"
      />
    );
  }

  const [requests, examples, responses, models] = await Promise.all([
    listCatalog<GenerationRequest>("generation_requests"),
    listCatalog<GenerationExample>("generation_examples"),
    listCatalog<LlmResponse>("llm_responses"),
    listCatalog<LlmModel>("llm_models", "name"),
  ]);

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="generations" isSuperadmin />
      <main className="main-content">
        <GenerationsStudio
          requests={requests.rows}
          examples={examples.rows}
          responses={responses.rows}
          models={models.rows}
          missing={
            requests.missing ||
            examples.missing ||
            responses.missing ||
            models.missing
          }
          error={
            requests.error || examples.error || responses.error || models.error
          }
        />
      </main>
    </div>
  );
}
