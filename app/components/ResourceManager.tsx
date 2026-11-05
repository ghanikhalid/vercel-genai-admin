"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCatalogRowAction,
  deleteCatalogRowAction,
  updateCatalogRowAction,
} from "@/app/catalogActions";
import type { WritableTable } from "@/lib/catalog";
import { IconEdit, IconPlus, IconTrash } from "./Icons";

export type ResourceField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "number" | "toggle" | "select" | "email" | "url";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
};

export type ResourceColumn = {
  key: string;
  label: string;
  mono?: boolean;
  max?: number;
};

function asRecord(row: object): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function display(value: unknown, max = 80) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function ResourceManager<T extends { id: string }>({
  kicker,
  title,
  subtitle,
  table,
  rows,
  missing,
  error,
  columns,
  fields,
  searchKeys,
  readOnly = false,
  emptyLabel = "Nothing here yet.",
}: {
  kicker: string;
  title: string;
  subtitle: string;
  table: WritableTable | "prompt_chains" | "prompt_chain_steps" | "generation_requests" | "llm_responses";
  rows: T[];
  missing: boolean;
  error?: string;
  columns: ResourceColumn[];
  fields: ResourceField[];
  searchKeys: string[];
  readOnly?: boolean;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isWritable =
    !readOnly &&
    table !== "generation_requests" &&
    table !== "llm_responses";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const rec = asRecord(row);
      return searchKeys.some((key) =>
        String(rec[key] ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, searchKeys]);

  const openCreate = () => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      next[field.key] = field.kind === "toggle" ? "false" : "";
    }
    setDraft(next);
    setEditingId("new");
    setStatusMsg(null);
  };

  const openEdit = (row: T) => {
    const rec = asRecord(row);
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = rec[field.key];
      if (field.kind === "toggle") next[field.key] = value ? "true" : "false";
      else next[field.key] = value == null ? "" : String(value);
    }
    setDraft(next);
    setEditingId(row.id);
    setStatusMsg(null);
  };

  const payloadFromDraft = () => {
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = draft[field.key] ?? "";
      if (field.kind === "toggle") payload[field.key] = raw === "true";
      else if (field.kind === "number") {
        payload[field.key] = raw === "" ? null : Number(raw);
      } else payload[field.key] = raw;
    }
    return payload;
  };

  const save = () => {
    if (readOnly || !isWritable) return;
    const writableTable = table as WritableTable;
    startTransition(async () => {
      const payload = payloadFromDraft();
      const res =
        editingId === "new"
          ? await createCatalogRowAction(writableTable, payload)
          : await updateCatalogRowAction(writableTable, editingId!, payload);
      if (!res.success) {
        setStatusMsg(res.error || "Save failed.");
        return;
      }
      setEditingId(null);
      setStatusMsg("Saved.");
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (readOnly || !isWritable) return;
    if (!window.confirm("Delete this record?")) return;
    startTransition(async () => {
      const res = await deleteCatalogRowAction(table as WritableTable, id);
      if (!res.success) {
        setStatusMsg(res.error || "Delete failed.");
        return;
      }
      setStatusMsg("Deleted.");
      router.refresh();
    });
  };

  return (
    <section className="telemetry-panel">
      <div className="panel-header-split">
        <div>
          <span className="kicker">{kicker}</span>
          <h2 className="section-title" style={{ marginTop: "6px" }}>
            {title}
          </h2>
          <p className="card-copy" style={{ marginTop: "6px" }}>
            {subtitle}
          </p>
        </div>
        {isWritable ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <IconPlus size={16} />
            <span>New</span>
          </button>
        ) : null}
      </div>

      {missing ? (
        <div className="schema-banner">
          These tables are not in the database yet. Run{" "}
          <code>supabase/admin_catalog.sql</code> once in the Supabase SQL
          editor.
        </div>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}
      {statusMsg ? (
        <div className={statusMsg === "Saved." || statusMsg === "Deleted." ? "bootstrap-success" : "form-error"}>
          {statusMsg}
        </div>
      ) : null}

      <div className="admin-toolbar" style={{ marginTop: "16px" }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="admin-input search-input"
        />
        <span className="count-pill">{filtered.length} shown</span>
      </div>

      {editingId ? (
        <form
          className="upload-studio"
          style={{ marginTop: "16px" }}
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="upload-studio-grid">
            {fields.map((field) => (
              <label key={field.key} className="admin-field-label">
                <span className="kicker">{field.label}</span>
                {field.kind === "textarea" ? (
                  <textarea
                    className="admin-input"
                    rows={5}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={draft[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : field.kind === "toggle" ? (
                  <select
                    className="admin-input"
                    value={draft[field.key] ?? "false"}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : field.kind === "select" ? (
                  <select
                    className="admin-input"
                    required={field.required}
                    value={draft[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    <option value="">Select…</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="admin-input"
                    type={
                      field.kind === "number"
                        ? "number"
                        : field.kind === "email"
                          ? "email"
                          : field.kind === "url"
                            ? "url"
                            : "text"
                    }
                    required={field.required}
                    placeholder={field.placeholder}
                    value={draft[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="lockout-actions-box" style={{ marginTop: "16px" }}>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditingId(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div style={{ overflowX: "auto", marginTop: "16px" }}>
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {isWritable ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (isWritable ? 1 : 0)}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const rec = asRecord(row);
                return (
                  <tr key={row.id}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={col.mono ? "user-cell-uuid" : undefined}
                      >
                        {display(rec[col.key], col.max)}
                      </td>
                    ))}
                    {isWritable ? (
                      <td>
                        <div className="resource-actions">
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "6px 10px" }}
                            onClick={() => openEdit(row)}
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "6px 10px" }}
                            onClick={() => remove(row.id)}
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
