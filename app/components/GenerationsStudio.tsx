"use client";

import { useMemo, useState } from "react";
import type {
  GenerationExample,
  GenerationRequest,
  LlmModel,
  LlmResponse,
} from "@/lib/catalog";
import ResourceManager from "./ResourceManager";

export default function GenerationsStudio({
  requests,
  examples,
  responses,
  models,
  missing,
  error,
}: {
  requests: GenerationRequest[];
  examples: GenerationExample[];
  responses: LlmResponse[];
  models: LlmModel[];
  missing: boolean;
  error?: string;
}) {
  const [tab, setTab] = useState<"requests" | "examples" | "responses">(
    "requests"
  );
  const modelName = useMemo(
    () => Object.fromEntries(models.map((m) => [m.id, m.name])),
    [models]
  );
  const modelOptions = models.map((m) => ({ value: m.id, label: m.name }));

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Generations</span>
          <h1 className="page-title">
            Requests, examples &amp;{" "}
            <span className="text-gradient">model replies</span>
          </h1>
        </div>
        <p className="page-sub">
          Review live generation traffic, keep golden examples, and inspect raw
          model output.
        </p>
      </div>

      <div className="filter-pill-group">
        <button
          type="button"
          className={`nav-pill ${tab === "requests" ? "active" : ""}`}
          onClick={() => setTab("requests")}
        >
          Requests
        </button>
        <button
          type="button"
          className={`nav-pill ${tab === "examples" ? "active" : ""}`}
          onClick={() => setTab("examples")}
        >
          Examples
        </button>
        <button
          type="button"
          className={`nav-pill ${tab === "responses" ? "active" : ""}`}
          onClick={() => setTab("responses")}
        >
          Responses
        </button>
      </div>

      {tab === "requests" ? (
        <ResourceManager
          kicker="Traffic"
          title="Generation requests"
          subtitle="Inbound jobs from the product."
          table="generation_requests"
          rows={requests.map((row) => ({
            ...row,
            model_name: row.model_id ? modelName[row.model_id] || row.model_id : "—",
          }))}
          missing={missing}
          error={error}
          readOnly
          searchKeys={["prompt", "status", "user_id"]}
          columns={[
            { key: "status", label: "Status" },
            { key: "prompt", label: "Prompt", max: 80 },
            { key: "model_name", label: "Model" },
            { key: "created_at", label: "Requested", mono: true, max: 24 },
          ]}
          fields={[]}
        />
      ) : null}

      {tab === "examples" ? (
        <ResourceManager
          kicker="Golden set"
          title="AI generation examples"
          subtitle="Golden prompts and outputs for evaluation."
          table="generation_examples"
          rows={examples.map((row) => ({
            ...row,
            model_name: row.model_id ? modelName[row.model_id] || row.model_id : "—",
          }))}
          missing={missing}
          error={error}
          searchKeys={["title", "prompt", "output_text"]}
          columns={[
            { key: "title", label: "Title" },
            { key: "prompt", label: "Prompt", max: 64 },
            { key: "output_text", label: "Output", max: 64 },
            { key: "model_name", label: "Model" },
          ]}
          fields={[
            { key: "title", label: "Title", kind: "text", required: true },
            { key: "prompt", label: "Prompt", kind: "textarea", required: true },
            { key: "output_text", label: "Output", kind: "textarea" },
            { key: "image_url", label: "Image URL", kind: "url" },
            {
              key: "model_id",
              label: "Model",
              kind: "select",
              options: modelOptions,
            },
          ]}
        />
      ) : null}

      {tab === "responses" ? (
        <ResourceManager
          kicker="Completions"
          title="LLM responses"
          subtitle="Raw completions stored against a request."
          table="llm_responses"
          rows={responses.map((row) => ({
            ...row,
            model_name: row.model_id ? modelName[row.model_id] || row.model_id : "—",
          }))}
          missing={missing}
          error={error}
          readOnly
          searchKeys={["content", "request_id"]}
          columns={[
            { key: "request_id", label: "Request", mono: true, max: 12 },
            { key: "model_name", label: "Model" },
            { key: "content", label: "Content", max: 80 },
            { key: "token_count", label: "Tokens" },
            { key: "latency_ms", label: "Latency ms" },
          ]}
          fields={[]}
        />
      ) : null}
    </div>
  );
}
