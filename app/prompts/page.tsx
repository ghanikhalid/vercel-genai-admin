import AdminHeader from "@/app/components/AdminHeader";
import PromptsStudio from "@/app/components/PromptsStudio";
import UnauthorizedView from "@/app/components/UnauthorizedView";
import { loadAdminContext } from "@/lib/adminData";
import { listCatalog } from "@/lib/catalog";
import type {
  PromptChain,
  PromptChainMix,
  PromptChainMixEntry,
  PromptChainStep,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const ctx = await loadAdminContext();
  if (ctx.status !== "authorized" || !ctx.user) {
    return (
      <UnauthorizedView
        status={ctx.status}
        user={ctx.user}
        active="prompts"
        nextPath="/prompts"
      />
    );
  }

  const [chains, steps, mixes, entries] = await Promise.all([
    listCatalog<PromptChain>("prompt_chains"),
    listCatalog<PromptChainStep>("prompt_chain_steps", "step_order"),
    listCatalog<PromptChainMix>("prompt_chain_mix", "updated_at"),
    listCatalog<PromptChainMixEntry>("prompt_chain_mix_entries"),
  ]);

  return (
    <div className="page-wrap">
      <AdminHeader user={ctx.user} active="prompts" isSuperadmin />
      <main className="main-content">
        <PromptsStudio
          chains={chains.rows}
          steps={steps.rows}
          mixes={mixes.rows}
          entries={entries.rows}
          missing={
            chains.missing || steps.missing || mixes.missing || entries.missing
          }
          error={chains.error || steps.error || mixes.error || entries.error}
        />
      </main>
    </div>
  );
}
