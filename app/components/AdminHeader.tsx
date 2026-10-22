import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import AuthButton from "./AuthButton";
import {
  IconCamera,
  IconChart,
  IconShield,
  IconUser,
  IconVoteUp,
} from "./Icons";

export type AdminRouteTab =
  | "telemetry"
  | "users"
  | "media"
  | "ratings"
  | "security";

export default function AdminHeader({
  user,
  active,
  isSuperadmin = false,
}: {
  user: User | null;
  active?: AdminRouteTab;
  isSuperadmin?: boolean;
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-orb" aria-hidden="true" />
        <span>PRISM POP</span>
        <span className="brand-tag">SUPERADMIN STUDIO</span>
      </Link>

      {isSuperadmin && (
        <nav className="site-nav" aria-label="Admin navigation">
          <Link
            href="/"
            className={`nav-pill ${active === "telemetry" ? "active" : ""}`}
          >
            <IconChart size={14} />
            <span>Telemetry</span>
          </Link>
          <Link
            href="/users"
            className={`nav-pill ${active === "users" ? "active" : ""}`}
          >
            <IconUser size={14} />
            <span>Users &amp; Profiles</span>
          </Link>
          <Link
            href="/media"
            className={`nav-pill ${active === "media" ? "active" : ""}`}
          >
            <IconCamera size={14} />
            <span>AI Media</span>
          </Link>
          <Link
            href="/ratings"
            className={`nav-pill ${active === "ratings" ? "active" : ""}`}
          >
            <IconVoteUp size={14} />
            <span>Votes &amp; Ratings</span>
          </Link>
          <Link
            href="/security"
            className={`nav-pill ${active === "security" ? "active" : ""}`}
          >
            <IconShield size={14} />
            <span>Access</span>
          </Link>
        </nav>
      )}

      <div className="header-actions">
        <AuthButton user={user} />
      </div>
    </header>
  );
}
