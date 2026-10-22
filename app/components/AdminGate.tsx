"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { EnrichedProfile } from "@/lib/adminData";
import { bootstrapSuperadminAction } from "@/app/actions";
import AuthButton from "./AuthButton";
import { IconDatabase, IconLock, IconShield, IconSparkle } from "./Icons";

export default function AdminGate({
  status,
  user,
  currentProfile,
  hasDbSuperadminColumn,
  nextPath = "/",
}: {
  status: "unauthenticated" | "forbidden";
  user: User | null;
  currentProfile: EnrichedProfile | null;
  hasDbSuperadminColumn: boolean;
  nextPath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const userId = user?.id || "c93ee310-c0d4-41e6-9cd2-711125ab35d9";

  const sqlSnippet = `-- Run in Supabase SQL Editor to add is_superadmin & promote your account:
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.profiles
  SET is_superadmin = TRUE
  WHERE id = '${userId}';`;

  const handleBootstrap = () => {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await bootstrapSuperadminAction();
      if (!res.success) {
        setError(res.error || "Bootstrap failed.");
        return;
      }
      setFeedback(res.message || "Superadmin access activated!");
      router.refresh();
    });
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlSnippet);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  if (status === "unauthenticated") {
    return (
      <section className="hero-stage-3d">
        <div className="hero-copy-col">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>ZERO-TRUST DATABASE CONSOLE · GOOGLE LOGIN WALL</span>
          </div>

          <h1 className="hero-title">
            Prism Pop{" "}
            <span className="text-gradient">Superadmin Command Center.</span>
          </h1>

          <p className="hero-sub">
            Every route in this administration suite is locked behind{" "}
            <strong>Google OAuth</strong> and verified against{" "}
            <code>profiles.is_superadmin == TRUE</code>. Unauthenticated
            visitors cannot inspect telemetry, profiles, AI media, or ratings.
          </p>

          <div className="hero-cta-row">
            <AuthButton user={null} nextPath={nextPath} />
          </div>

          <div className="security-pill-row">
            <div className="security-mini-pill">
              <IconLock size={14} />
              <span> Step 1: Google OAuth Session</span>
            </div>
            <div className="security-mini-pill">
              <IconShield size={14} />
              <span>Step 2: profiles.is_superadmin == TRUE</span>
            </div>
            <div className="security-mini-pill">
              <IconDatabase size={14} />
              <span>Step 3: Full CRUD + Telemetry</span>
            </div>
          </div>
        </div>

        <div className="apple-3d-scene" aria-hidden="true">
          <div className="apple-3d-rig">
            <div className="floating-chip chip-top-left">
              <IconLock size={14} />
              <span>ROUTE GUARD ACTIVE</span>
            </div>
            <div className="floating-chip chip-bottom-right">
              <IconShield size={14} />
              <span>RLS + SUPERADMIN</span>
            </div>

            <div className="showcase-card-back">
              <div className="showcase-back-label">PROTECTED ENDPOINTS</div>
              <div className="showcase-back-caption">
                / · /users · /media · /ratings · /security
              </div>
            </div>

            <div className="showcase-card-front">
              <div className="showcase-art">
                <div className="showcase-svg-wrap">
                  <IconShield size={84} />
                </div>
                <div className="showcase-meme-bar">
                  &ldquo;ACCESS REQUIRES GOOGLE AUTH +
                  PROFILES.IS_SUPERADMIN == TRUE&rdquo;
                </div>
              </div>
              <div className="showcase-slip">
                <span className="showcase-slip-kicker">SECURITY POSTURE</span>
                <p className="showcase-slip-text">
                  Sign in with your Google account to verify superadmin
                  clearance or run the self-bootstrap promotion flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // status === "forbidden": Signed in with Google, but is_superadmin is currently FALSE
  return (
    <div className="lockout-stack">
      <section className="gate-card lockout-hero-card">
        <div className="hero-badge" style={{ margin: "0 auto 16px" }}>
          <span className="hero-badge-dot" />
          <span>AUTHENTICATED AS {user?.email?.toUpperCase()}</span>
        </div>

        <h1 className="gate-title">
          Superadmin Clearance Required{" "}
          <span className="text-gradient">(profiles.is_superadmin == TRUE)</span>
        </h1>

        <p className="gate-copy" style={{ maxWidth: "680px" }}>
          You passed the Google Login Wall as{" "}
          <strong>{currentProfile?.full_name || user?.email}</strong> (UUID:{" "}
          <code>{user?.id}</code>), but your profile currently has{" "}
          <code>is_superadmin = FALSE</code>
          {!hasDbSuperadminColumn &&
            " (and the physical is_superadmin column has not been added in SQL yet)"}
          .
        </p>

        <div className="lockout-actions-box">
          <button
            type="button"
            onClick={handleBootstrap}
            disabled={isPending}
            className="btn-primary"
          >
            <IconSparkle size={16} />
            <span>
              {isPending
                ? "Promoting Account to Superadmin..."
                : "Bootstrap My Account (Set is_superadmin = TRUE)"}
            </span>
          </button>
          <AuthButton user={user} nextPath={nextPath} />
        </div>

        {feedback && <p className="bootstrap-success">{feedback}</p>}
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="upload-studio">
        <span className="kicker">
          Architecture Deep-Dive · Solving the Bootstrap Paradox
        </span>
        <h2 className="card-heading" style={{ marginTop: "8px", fontSize: "1.45rem" }}>
          Wait — if <code>profiles.is_superadmin == TRUE</code> is required to
          access the admin area, how do we avoid locking ourselves out?
        </h2>
        <p className="card-copy" style={{ marginTop: "8px", maxWidth: "840px" }}>
          This is the classic <strong>chicken-and-egg privilege bootstrap problem</strong>.
          Given the exact tools and credentials at our disposal in{" "}
          <code>vercel-genai</code> (our Google OAuth session,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, existing Supabase RLS
          policies, and the Supabase SQL Editor), here are the three ways to
          solve it:
        </p>

        <div className="bento-grid" style={{ marginTop: "22px" }}>
          <div className="bento-card" style={{ minHeight: "auto" }}>
            <div className="bento-body">
              <span className="kicker">Method 01 · RLS Self-Update Bootstrap</span>
              <h3 className="card-heading">
                Use <code>profiles_update_own</code> Policy
              </h3>
              <p className="card-copy">
                In <code>vercel-genai/supabase/schema.sql</code>, the{" "}
                <code>profiles_update_own</code> RLS policy allows any{" "}
                <code>authenticated</code> user to <code>UPDATE</code> their own
                row (<code>auth.uid() = id</code>) without column-level
                restrictions. Clicking the{" "}
                <strong>Bootstrap My Account</strong> button above executes{" "}
                <code>
                  supabase.from(&quot;profiles&quot;).update(&#123;
                  is_superadmin: true &#125;).eq(&quot;id&quot;, user.id)
                </code>{" "}
                using your active Google session!
              </p>
            </div>
          </div>

          <div className="bento-card" style={{ minHeight: "auto" }}>
            <div className="bento-body">
              <span className="kicker">Method 02 · Out-of-Band SQL Editor</span>
              <h3 className="card-heading">
                Supabase Dashboard / <code>postgres</code> Role
              </h3>
              <p className="card-copy">
                As the project owner, running SQL in the{" "}
                <strong>Supabase SQL Editor</strong> (or toggling the cell in
                Table Editor) executes as the <code>postgres</code> superuser,
                bypassing RLS entirely to add the{" "}
                <code>is_superadmin</code> column and seed the initial
                superadmin UUIDs before locking down the policy.
              </p>
            </div>
          </div>

          <div className="bento-card" style={{ minHeight: "auto" }}>
            <div className="bento-body">
              <span className="kicker">Method 03 · Server Bootstrap Allowlist</span>
              <h3 className="card-heading">
                Owner UUID / Email Seed + RLS Hardening
              </h3>
              <p className="card-copy">
                Once the initial superadmin is promoted, we harden{" "}
                <code>public.profiles</code> with our{" "}
                <code>public.is_superadmin()</code>{" "}
                <code>SECURITY DEFINER</code> function in{" "}
                <code>supabase/admin_schema.sql</code> so only existing
                superadmins can grant or revoke superadmin privileges going
                forward.
              </p>
            </div>
          </div>
        </div>

        <div className="sql-box-wrap" style={{ marginTop: "22px" }}>
          <div className="feed-header">
            <span className="kicker">
              Ready-to-Run SQL Migration (supabase/admin_schema.sql)
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="btn-ghost"
              style={{ padding: "6px 14px", fontSize: "0.78rem" }}
            >
              {copiedSql ? "Copied SQL!" : "Copy SQL"}
            </button>
          </div>
          <pre className="sql-code-block">{sqlSnippet}</pre>
        </div>
      </section>
    </div>
  );
}
