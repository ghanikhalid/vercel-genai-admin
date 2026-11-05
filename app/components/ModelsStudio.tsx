"use client";

import { useMemo, useState } from "react";
import type { LlmModel, LlmProvider } from "@/lib/catalog";
import ResourceManager from "./ResourceManager";

export default function ModelsStudio({
  providers,
  models,
  missing,
  error,
}: {
  providers: LlmProvider[];
  models: LlmModel[];
  missing: boolean;
  error?: string;
}) {
  const [tab, setTab] = useState<"providers" | "models">("providers");
  const providerName = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p.name])),
    [providers]
  );

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Models</span>
          <h1 className="page-title">
            Providers &amp; <span className="text-gradient">LLM catalog</span>
          </h1>
        </div>
        <p className="page-sub">
          Keep the vendor list and the models the product is allowed to call.
        </p>
      </div>

      <div className="filter-pill-group">
        <button
          type="button"
          className={`nav-pill ${tab === "providers" ? "active" : ""}`}
          onClick={() => setTab("providers")}
        >
          Providers
        </button>
        <button
          type="button"
          className={`nav-pill ${tab === "models" ? "active" : ""}`}
          onClick={() => setTab("models")}
        >
          Models
        </button>
      </div>

      {tab === "providers" ? (
        <ResourceManager
          kicker="Vendors"
          title="LLM providers"
          subtitle="OpenAI, Gemini, Anthropic, and anything else you route through."
          table="llm_providers"
          rows={providers}
          missing={missing}
          error={error}
          searchKeys={["name", "slug", "base_url"]}
          columns={[
            { key: "name", label: "Name" },
            { key: "slug", label: "Slug", mono: true },
            { key: "base_url", label: "Base URL", max: 48 },
            { key: "is_enabled", label: "Enabled" },
          ]}
          fields={[
            { key: "name", label: "Name", kind: "text", required: true },
            { key: "slug", label: "Slug", kind: "text", required: true },
            { key: "base_url", label: "Base URL", kind: "url" },
            { key: "is_enabled", label: "Enabled", kind: "toggle" },
          ]}
        />
      ) : (
        <ResourceManager
          kicker="Catalog"
          title="LLM models"
          subtitle="The actual model keys used in generation."
          table="llm_models"
          rows={models.map((row) => ({
            ...row,
            provider_name: row.provider_id
              ? providerName[row.provider_id] || row.provider_id
              : "—",
          }))}
          missing={missing}
          error={error}
          searchKeys={["name", "model_key"]}
          columns={[
            { key: "name", label: "Name" },
            { key: "model_key", label: "Key", mono: true },
            { key: "provider_name", label: "Provider" },
            { key: "is_enabled", label: "Enabled" },
          ]}
          fields={[
            { key: "name", label: "Name", kind: "text", required: true },
            { key: "model_key", label: "Model key", kind: "text", required: true },
            {
              key: "provider_id",
              label: "Provider",
              kind: "select",
              options: providers.map((p) => ({ value: p.id, label: p.name })),
            },
            { key: "is_enabled", label: "Enabled", kind: "toggle" },
          ]}
        />
      )}
    </div>
  );
}
