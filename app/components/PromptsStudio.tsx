"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePromptMixAction } from "@/app/catalogActions";
import type {
  PromptChain,
  PromptChainMix,
  PromptChainMixEntry,
  PromptChainStep,
} from "@/lib/catalog";
import ResourceManager from "./ResourceManager";

export default function PromptsStudio({
  chains,
  steps,
  mixes,
  entries,
  missing,
  error,
}: {
  chains: PromptChain[];
  steps: PromptChainStep[];
  mixes: PromptChainMix[];
  entries: PromptChainMixEntry[];
  missing: boolean;
  error?: string;
}) {
  const [tab, setTab] = useState<"chains" | "steps" | "mix">("chains");
  const chainName = useMemo(
    () => Object.fromEntries(chains.map((c) => [c.id, c.name])),
    [chains]
  );

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Prompts</span>
          <h1 className="page-title">
            Prompt <span className="text-gradient">chains</span>
          </h1>
        </div>
        <p className="page-sub">
          Inspect chains and steps, then adjust how much each chain contributes
          to the mix.
        </p>
      </div>

      <div className="filter-pill-group">
        <button
          type="button"
          className={`nav-pill ${tab === "chains" ? "active" : ""}`}
          onClick={() => setTab("chains")}
        >
          Chains
        </button>
        <button
          type="button"
          className={`nav-pill ${tab === "steps" ? "active" : ""}`}
          onClick={() => setTab("steps")}
        >
          Steps
        </button>
        <button
          type="button"
          className={`nav-pill ${tab === "mix" ? "active" : ""}`}
          onClick={() => setTab("mix")}
        >
          Mix
        </button>
      </div>

      {tab === "chains" ? (
        <ResourceManager
          kicker="Catalog"
          title="Prompt chains"
          subtitle="Named pipelines used to generate copy."
          table="prompt_chains"
          rows={chains}
          missing={missing}
          error={error}
          readOnly
          searchKeys={["name", "description"]}
          columns={[
            { key: "name", label: "Name" },
            { key: "description", label: "Description", max: 90 },
            { key: "is_active", label: "Active" },
            { key: "updated_at", label: "Updated", mono: true, max: 24 },
          ]}
          fields={[]}
        />
      ) : null}

      {tab === "steps" ? (
        <ResourceManager
          kicker="Pipeline"
          title="Chain steps"
          subtitle="Each step is a prompt template inside a chain."
          table="prompt_chain_steps"
          rows={[...steps]
            .sort((a, b) => a.step_order - b.step_order)
            .map((step) => ({
              ...step,
              chain_name: chainName[step.chain_id] || step.chain_id,
            }))}
          missing={missing}
          error={error}
          readOnly
          searchKeys={["name", "prompt_template", "chain_name"]}
          columns={[
            { key: "chain_name", label: "Chain" },
            { key: "step_order", label: "Order" },
            { key: "name", label: "Step" },
            { key: "prompt_template", label: "Template", max: 72 },
          ]}
          fields={[]}
        />
      ) : null}

      {tab === "mix" ? (
        <MixEditor chains={chains} mixes={mixes} entries={entries} missing={missing} />
      ) : null}
    </div>
  );
}

function MixEditor({
  chains,
  mixes,
  entries,
  missing,
}: {
  chains: PromptChain[];
  mixes: PromptChainMix[];
  entries: PromptChainMixEntry[];
  missing: boolean;
}) {
  const router = useRouter();
  const mix = mixes[0];
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(mix?.name ?? "Default mix");
  const [notes, setNotes] = useState(mix?.notes ?? "");
  const [active, setActive] = useState(mix?.is_active ?? true);
  const [rows, setRows] = useState(
    entries
      .filter((entry) => !mix || entry.mix_id === mix.id)
      .map((entry) => ({ chain_id: entry.chain_id, weight: Number(entry.weight) }))
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const save = () => {
    if (!mix) return;
    startTransition(async () => {
      const res = await savePromptMixAction({
        mixId: mix.id,
        name,
        notes,
        is_active: active,
        entries: rows,
      });
      if (!res.success) {
        setStatusMsg(res.error || "Could not save mix.");
        return;
      }
      setStatusMsg("Saved.");
      router.refresh();
    });
  };

  return (
    <section className="telemetry-panel">
      <span className="kicker">Traffic mix</span>
      <h2 className="section-title" style={{ marginTop: "6px" }}>
        Prompt chain mix
      </h2>
      <p className="card-copy" style={{ marginTop: "6px" }}>
        Weight is relative. Higher numbers send more traffic to that chain.
      </p>
      {missing || !mix ? (
        <div className="schema-banner" style={{ marginTop: "16px" }}>
          The mix table is not ready yet. Run{" "}
          <code>supabase/admin_catalog.sql</code> in Supabase.
        </div>
      ) : (
        <>
          <div className="upload-studio-grid" style={{ marginTop: "18px" }}>
            <label className="admin-field-label">
              <span className="kicker">Name</span>
              <input
                className="admin-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="admin-field-label">
              <span className="kicker">Active</span>
              <select
                className="admin-input"
                value={active ? "true" : "false"}
                onChange={(e) => setActive(e.target.value === "true")}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="admin-field-label" style={{ gridColumn: "1 / -1" }}>
              <span className="kicker">Notes</span>
              <textarea
                className="admin-input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div style={{ marginTop: "18px" }}>
            <span className="kicker">Chain weights</span>
            {rows.map((row, index) => (
              <div
                key={`${row.chain_id}-${index}`}
                className="admin-toolbar"
                style={{ marginTop: "10px" }}
              >
                <select
                  className="admin-input"
                  value={row.chain_id}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, chain_id: e.target.value } : item
                      )
                    )
                  }
                >
                  {chains.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step="0.1"
                  value={row.weight}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, weight: Number(e.target.value) }
                          : item
                      )
                    )
                  }
                  style={{ maxWidth: "140px" }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: "12px" }}
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { chain_id: chains[0]?.id || "", weight: 1 },
                ])
              }
              disabled={chains.length === 0}
            >
              Add chain
            </button>
          </div>

          {statusMsg ? (
            <p className={statusMsg === "Saved." ? "bootstrap-success" : "form-error"}>
              {statusMsg}
            </p>
          ) : null}

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: "18px" }}
            disabled={isPending}
            onClick={save}
          >
            {isPending ? "Saving…" : "Save mix"}
          </button>
        </>
      )}
    </section>
  );
}
