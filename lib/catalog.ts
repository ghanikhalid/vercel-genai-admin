import { cache } from "react";
import { createClient } from "@/lib/supabaseServer";
import { loadAdminContext } from "@/lib/adminData";

export const CATALOG_TABLES = [
  "llm_providers",
  "llm_models",
  "prompt_chains",
  "prompt_chain_steps",
  "prompt_chain_mix",
  "prompt_chain_mix_entries",
  "terms",
  "images",
  "generation_requests",
  "generation_examples",
  "llm_responses",
  "allowed_signup_domains",
  "whitelisted_emails",
] as const;

export type CatalogTable = (typeof CATALOG_TABLES)[number];

export const WRITABLE_TABLES = [
  "llm_providers",
  "llm_models",
  "prompt_chains",
  "prompt_chain_steps",
  "prompt_chain_mix",
  "prompt_chain_mix_entries",
  "terms",
  "images",
  "generation_examples",
  "allowed_signup_domains",
  "whitelisted_emails",
] as const satisfies readonly CatalogTable[];

export type WritableTable = (typeof WRITABLE_TABLES)[number];

export type CatalogList<T> = {
  rows: T[];
  missing: boolean;
  error?: string;
};

export type LlmProvider = {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type LlmModel = {
  id: string;
  provider_id: string | null;
  name: string;
  model_key: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PromptChain = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PromptChainStep = {
  id: string;
  chain_id: string;
  step_order: number;
  name: string;
  prompt_template: string;
  model_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PromptChainMix = {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  updated_at: string;
};

export type PromptChainMixEntry = {
  id: string;
  mix_id: string;
  chain_id: string;
  weight: number;
};

export type Term = {
  id: string;
  slug: string;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type StudioImage = {
  id: string;
  user_id: string | null;
  storage_path: string;
  image_url: string;
  alt_text: string;
  created_at: string;
  updated_at: string;
};

export type GenerationRequest = {
  id: string;
  user_id: string | null;
  prompt: string;
  chain_id: string | null;
  model_id: string | null;
  status: string;
  created_at: string;
};

export type GenerationExample = {
  id: string;
  title: string;
  prompt: string;
  output_text: string;
  image_url: string | null;
  model_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LlmResponse = {
  id: string;
  request_id: string | null;
  model_id: string | null;
  content: string;
  token_count: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type SignupDomain = {
  id: string;
  domain: string;
  notes: string | null;
  created_at: string;
};

export type WhitelistedEmail = {
  id: string;
  email: string;
  notes: string | null;
  created_at: string;
};

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export async function requireCatalogAdmin() {
  const ctx = await loadAdminContext();
  if (ctx.status !== "authorized" || !ctx.user) {
    return {
      ok: false as const,
      error: "Superadmin authorization required.",
      userId: null,
    };
  }
  return { ok: true as const, error: null, userId: ctx.user.id };
}

export const listCatalog = cache(async function listCatalog<T>(
  table: CatalogTable,
  orderColumn?: string
): Promise<CatalogList<T>> {
  const gate = await requireCatalogAdmin();
  if (!gate.ok) return { rows: [], missing: false, error: gate.error };

  const supabase = await createClient();
  const query = orderColumn
    ? supabase.from(table).select("*").order(orderColumn, { ascending: false })
    : supabase.from(table).select("*");
  const { data, error } = await query;

  if (error) {
    if (isMissingRelation(error)) return { rows: [], missing: true };
    return { rows: [], missing: false, error: error.message };
  }

  return { rows: (data ?? []) as T[], missing: false };
});

export function isWritableTable(table: string): table is WritableTable {
  return (WRITABLE_TABLES as readonly string[]).includes(table);
}

export function isCatalogTable(table: string): table is CatalogTable {
  return (CATALOG_TABLES as readonly string[]).includes(table);
}
