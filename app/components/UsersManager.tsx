"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  EnrichedMedia,
  EnrichedProfile,
  EnrichedVote,
} from "@/lib/adminData";
import { toggleUserSuperadminAction } from "@/app/actions";
import {
  IconCamera,
  IconShield,
  IconUser,
  IconVoteDown,
  IconVoteUp,
} from "./Icons";

export default function UsersManager({
  profiles,
  media,
  votes,
  currentUserId,
}: {
  profiles: EnrichedProfile[];
  media: EnrichedMedia[];
  votes: EnrichedVote[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "superadmin" | "member">(
    "all"
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    profiles[0]?.id ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const filteredProfiles = profiles.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.first_name || "").toLowerCase().includes(q) ||
      (p.last_name || "").toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (roleFilter === "superadmin") return p.is_superadmin;
    if (roleFilter === "member") return !p.is_superadmin;
    return true;
  });

  const inspectedUser =
    profiles.find((p) => p.id === selectedUserId) ??
    filteredProfiles[0] ??
    null;

  const inspectedUserMedia = inspectedUser
    ? media.filter((m) => m.user_id === inspectedUser.id)
    : [];
  const inspectedUserVotes = inspectedUser
    ? votes.filter((v) => v.user_id === inspectedUser.id)
    : [];
  const superadminCount = profiles.filter((p) => p.is_superadmin).length;

  const handleToggleSuperadmin = (prof: EnrichedProfile) => {
    setStatusMsg(null);
    const nextVal = !prof.is_superadmin;
    startTransition(async () => {
      const res = await toggleUserSuperadminAction(prof.id, nextVal);
      if (!res.success) {
        setStatusMsg(`Error: ${res.error}`);
        return;
      }
      setStatusMsg(
        nextVal
          ? `Granted superadmin to ${prof.full_name}.`
          : `Removed superadmin from ${prof.full_name}.`
      );
      router.refresh();
    });
  };

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Members</span>
          <h1 className="page-title">
            Users &amp; <span className="text-gradient">member profiles</span>
          </h1>
        </div>
        <p className="page-sub">
          Search the club, review activity, and grant or revoke superadmin.
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="admin-toolbar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="admin-input search-input"
        />

        <div className="filter-pill-group">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`nav-pill ${roleFilter === "all" ? "active" : ""}`}
          >
            All ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("superadmin")}
            className={`nav-pill ${
              roleFilter === "superadmin" ? "active" : ""
            }`}
          >
            Superadmins ({profiles.filter((p) => p.is_superadmin).length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("member")}
            className={`nav-pill ${roleFilter === "member" ? "active" : ""}`}
          >
            Standard ({profiles.filter((p) => !p.is_superadmin).length})
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={
            statusMsg.startsWith("Error") ? "form-error" : "schema-banner"
          }
        >
          {statusMsg}
        </div>
      )}

      <div className="users-split-layout">
        {/* Profiles Table / List */}
        <div className="telemetry-panel" style={{ overflowX: "auto" }}>
          <div className="feed-header" style={{ marginBottom: "16px" }}>
            <h2 className="section-title">Registered Profiles Directory</h2>
            <span className="count-pill">
              {filteredProfiles.length} shown
            </span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>AI Media</th>
                <th>Net Karma</th>
                <th>Votes Cast</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((prof) => {
                const isSelected = inspectedUser?.id === prof.id;
                const isSelf = prof.id === currentUserId;
                return (
                  <tr
                    key={prof.id}
                    onClick={() => setSelectedUserId(prof.id)}
                    className={isSelected ? "selected-row" : ""}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="user-cell">
                        {prof.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={prof.avatar_url}
                            alt={prof.full_name}
                            className="user-avatar-thumb"
                          />
                        ) : (
                          <div className="user-avatar-fallback">
                            <IconUser size={16} />
                          </div>
                        )}
                        <div>
                          <div className="user-cell-name">
                            {prof.full_name}
                            {isSelf && (
                              <span className="you-tag">YOU</span>
                            )}
                          </div>
                          <div className="user-cell-uuid">
                            {prof.id.slice(0, 8)}…{prof.id.slice(-4)} ·{" "}
                            {prof.avatar_source === "supabase_storage"
                              ? "Custom Avatar"
                              : prof.avatar_source === "google_oauth"
                              ? "Google Avatar"
                              : "No Avatar"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {prof.is_superadmin ? (
                        <span className="status-badge superadmin">
                          <IconShield size={12} />
                          <span>Superadmin</span>
                        </span>
                      ) : (
                        <span className="status-badge member">Member</span>
                      )}
                    </td>
                    <td>
                      <strong>{prof.memes_count}</strong> frames
                    </td>
                    <td>
                      <span
                        style={{
                          color:
                            prof.net_karma_earned >= 0
                              ? "var(--accent-sage)"
                              : "var(--accent-coral)",
                          fontWeight: 700,
                        }}
                      >
                        {prof.net_karma_earned >= 0
                          ? `+${prof.net_karma_earned}`
                          : prof.net_karma_earned}
                      </span>{" "}
                      <span className="leader-sub">
                        ({prof.upvotes_received}↑/{prof.downvotes_received}↓)
                      </span>
                    </td>
                    <td>
                      <strong>{prof.votes_cast_total}</strong>{" "}
                      <span className="leader-sub">
                        ({prof.generosity_rate}% ↑)
                      </span>
                    </td>
                    <td className="leader-sub">
                      {prof.updated_at
                        ? new Date(prof.updated_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={
                          isPending ||
                          (prof.is_superadmin && superadminCount <= 1)
                        }
                        onClick={() => handleToggleSuperadmin(prof)}
                        className="btn-ghost"
                        style={{ padding: "6px 12px", fontSize: "0.76rem" }}
                      >
                        {prof.is_superadmin ? "Revoke Admin" : "Grant Admin"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Profile Detail Inspector */}
        <aside className="telemetry-panel user-dossier">
          {inspectedUser ? (
            <>
              <span className="kicker">Member Dossier Inspector</span>
              <div className="dossier-header">
                {inspectedUser.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inspectedUser.avatar_url}
                    alt={inspectedUser.full_name}
                    className="dossier-avatar"
                  />
                ) : (
                  <div className="dossier-avatar-fallback">
                    <IconUser size={28} />
                  </div>
                )}
                <div>
                  <h3 className="card-heading">{inspectedUser.full_name}</h3>
                  <p className="user-cell-uuid" style={{ wordBreak: "break-all" }}>
                    {inspectedUser.id}
                  </p>
                </div>
              </div>

              <div className="inspector-meta-grid" style={{ marginTop: "16px" }}>
                <div className="meta-pill">
                  <span className="meta-pill-label">FIRST / LAST NAME</span>
                  <span className="meta-pill-value">
                    {inspectedUser.first_name || "—"} /{" "}
                    {inspectedUser.last_name || "—"}
                  </span>
                </div>
                <div className="meta-pill">
                  <span className="meta-pill-label">ROLE</span>
                  <span className="meta-pill-value">
                    {inspectedUser.is_superadmin ? "Superadmin" : "Member"}
                  </span>
                </div>
                <div className="meta-pill">
                  <span className="meta-pill-label">AVG KARMA / MEME</span>
                  <span className="meta-pill-value">
                    {inspectedUser.avg_karma_per_meme >= 0
                      ? `+${inspectedUser.avg_karma_per_meme}`
                      : inspectedUser.avg_karma_per_meme}
                  </span>
                </div>
                <div className="meta-pill">
                  <span className="meta-pill-label">DAILY ORACLE VIBE</span>
                  <span className="meta-pill-value">
                    {inspectedUser.fortune_vibe || "Unrolled"}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "20px" }}>
                <span className="kicker">
                  Authored AI Media ({inspectedUserMedia.length})
                </span>
                {inspectedUserMedia.length === 0 ? (
                  <p className="card-copy" style={{ marginTop: "8px" }}>
                    No AI captioned images uploaded by this profile yet.
                  </p>
                ) : (
                  <div className="dossier-media-list">
                    {inspectedUserMedia.map((m) => (
                      <div key={m.id} className="dossier-media-item">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.image_url}
                          alt={m.caption}
                          className="dossier-media-thumb"
                        />
                        <div style={{ flex: 1 }}>
                          <div className="dossier-media-caption">
                            &ldquo;{m.caption}&rdquo;
                          </div>
                          <div className="leader-sub">
                            Score: {m.net_score >= 0 ? `+${m.net_score}` : m.net_score}{" "}
                            ({m.upvotes}↑ / {m.downvotes}↓)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: "20px" }}>
                <span className="kicker">
                  Recent Ratings Cast ({inspectedUserVotes.length})
                </span>
                {inspectedUserVotes.length === 0 ? (
                  <p className="card-copy" style={{ marginTop: "8px" }}>
                    No votes cast by this user yet.
                  </p>
                ) : (
                  <div className="dossier-media-list">
                    {inspectedUserVotes.slice(0, 5).map((v) => (
                      <div key={v.id} className="dossier-vote-item">
                        <span
                          className={`vote-tag ${
                            v.vote_value === 1 ? "up" : "down"
                          }`}
                        >
                          {v.vote_value === 1 ? (
                            <IconVoteUp size={12} />
                          ) : (
                            <IconVoteDown size={12} />
                          )}
                          {v.vote_value === 1 ? "+1" : "-1"}
                        </span>
                        <span className="dossier-vote-caption">
                          {v.media_caption}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-card">
              <IconCamera size={24} />
              <p className="empty-title">Select a user profile</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
