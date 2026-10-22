import type { User } from "@supabase/supabase-js";
import AuthButton from "./AuthButton";
import { IconLock, IconShield } from "./Icons";

export default function AdminGate({
  status,
  user,
  nextPath = "/",
}: {
  status: "unauthenticated" | "forbidden";
  user: User | null;
  nextPath?: string;
}) {
  if (status === "unauthenticated") {
    return (
      <section className="hero-stage-3d">
        <div className="hero-copy-col">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>SUPERADMIN STUDIO</span>
          </div>

          <h1 className="hero-title">
            Prism Pop{" "}
            <span className="text-gradient">Superadmin Command Center.</span>
          </h1>

          <p className="hero-sub">
            Sign in with Google. Only approved superadmins can open this
            console.
          </p>

          <div className="hero-cta-row">
            <AuthButton user={null} nextPath={nextPath} />
          </div>
        </div>

        <div className="apple-3d-scene" aria-hidden="true">
          <div className="apple-3d-rig">
            <div className="floating-chip chip-top-left">
              <IconLock size={14} />
              <span>PRIVATE CONSOLE</span>
            </div>
            <div className="floating-chip chip-bottom-right">
              <IconShield size={14} />
              <span>INVITE ONLY</span>
            </div>

            <div className="showcase-card-back">
              <div className="showcase-back-label">PROTECTED</div>
              <div className="showcase-back-caption">
                Telemetry · Members · Media · Ratings
              </div>
            </div>

            <div className="showcase-card-front">
              <div className="showcase-art">
                <div className="showcase-svg-wrap">
                  <IconShield size={84} />
                </div>
                <div className="showcase-meme-bar">
                  ACCESS IS GRANTED, NOT CLAIMED
                </div>
              </div>
              <div className="showcase-slip">
                <span className="showcase-slip-kicker">CLEARANCE</span>
                <p className="showcase-slip-text">
                  Superadmin is assigned by an existing admin. Signing in is
                  not enough on its own.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="lockout-stack">
      <section className="gate-card lockout-hero-card">
        <div className="hero-badge" style={{ margin: "0 auto 16px" }}>
          <span className="hero-badge-dot" />
          <span>SIGNED IN</span>
        </div>

        <h1 className="gate-title">
          This account doesn&apos;t have{" "}
          <span className="text-gradient">superadmin access</span>
        </h1>

        <p className="gate-copy" style={{ maxWidth: "640px" }}>
          You&apos;re signed in as{" "}
          <strong>{user?.email || "this Google account"}</strong>. Ask an
          existing superadmin to grant access from the Users page.
        </p>

        <div className="lockout-actions-box">
          <AuthButton user={user} nextPath={nextPath} />
        </div>
      </section>
    </div>
  );
}
