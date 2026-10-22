"use client";

import { useState } from "react";
import type {
  EnrichedMedia,
  EnrichedProfile,
  EnrichedVote,
} from "@/lib/adminData";
import { IconUser, IconVoteDown, IconVoteUp } from "./Icons";

export default function RatingsViewer({
  votes,
  media,
  profiles,
}: {
  votes: EnrichedVote[];
  media: EnrichedMedia[];
  profiles: EnrichedProfile[];
}) {
  const [search, setSearch] = useState("");
  const [voteType, setVoteType] = useState<"all" | "up" | "down">("all");
  const [voterFilter, setVoterFilter] = useState("all");

  const upvotesCount = votes.filter((v) => v.vote_value === 1).length;
  const downvotesCount = votes.filter((v) => v.vote_value === -1).length;
  const totalVotes = upvotesCount + downvotesCount;
  const upvotePct =
    totalVotes > 0 ? Math.round((upvotesCount / totalVotes) * 100) : 50;

  const filteredVotes = votes.filter((v) => {
    if (voteType === "up" && v.vote_value !== 1) return false;
    if (voteType === "down" && v.vote_value !== -1) return false;
    if (voterFilter !== "all" && v.user_id !== voterFilter) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.voter_name.toLowerCase().includes(q) ||
      v.media_caption.toLowerCase().includes(q) ||
      v.media_author_name.toLowerCase().includes(q) ||
      v.image_id.toLowerCase().includes(q)
    );
  });

  const ratedMediaSummary = [...media].sort(
    (a, b) => b.total_votes - a.total_votes || b.net_score - a.net_score
  );

  return (
    <div className="telemetry-suite">
      <div className="page-header-row">
        <div>
          <span className="kicker">Community</span>
          <h1 className="page-title">
            Upvotes, Downvotes &amp;{" "}
            <span className="text-gradient">ratings</span>
          </h1>
        </div>
        <p className="page-sub">
          Every upvote and downvote across the club, plus how each frame is
          landing.
        </p>
      </div>

      {/* Sentiment Consensus Strip */}
      <section className="telemetry-panel">
        <div className="feed-header">
          <div>
            <span className="kicker">Global Rating Polarity</span>
            <h2 className="section-title" style={{ marginTop: "4px" }}>
              {upvotesCount} Upvotes ({upvotePct}%) vs. {downvotesCount}{" "}
              Downvotes ({totalVotes > 0 ? 100 - upvotePct : 0}%)
            </h2>
          </div>
          <span className="count-pill">{totalVotes} total votes</span>
        </div>

        <div className="polarity-bar-track" style={{ marginTop: "14px" }}>
          <div
            className="polarity-up-fill"
            style={{ width: `${upvotePct}%` }}
          />
          <div
            className="polarity-down-fill"
            style={{ width: `${100 - upvotePct}%` }}
          />
        </div>
      </section>

      {/* Aggregated Media Scorecards */}
      <section className="telemetry-panel">
        <div className="feed-header" style={{ marginBottom: "14px" }}>
          <h2 className="section-title">Aggregated Media Rating Breakdown</h2>
          <span className="count-pill">{media.length} frames</span>
        </div>

        <div className="rating-summary-grid">
          {ratedMediaSummary.slice(0, 6).map((m) => (
            <div key={m.id} className="rating-summary-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.image_url}
                alt={m.caption}
                className="rating-summary-thumb"
              />
              <div className="rating-summary-body">
                <div className="rating-summary-caption">
                  &ldquo;{m.caption}&rdquo;
                </div>
                <div className="leader-sub">by {m.author_name}</div>
                <div className="rating-summary-pills">
                  <span className="vote-tag up">
                    <IconVoteUp size={12} /> {m.upvotes}
                  </span>
                  <span className="vote-tag down">
                    <IconVoteDown size={12} /> {m.downvotes}
                  </span>
                  <span className="count-pill">
                    Net: {m.net_score >= 0 ? `+${m.net_score}` : m.net_score} (
                    {m.approval_rate}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Toolbar */}
      <div className="admin-toolbar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search votes by voter name, caption, or creator..."
          className="admin-input search-input"
        />

        <select
          value={voterFilter}
          onChange={(e) => setVoterFilter(e.target.value)}
          className="admin-input"
          style={{ maxWidth: "220px" }}
        >
          <option value="all">All Voters ({profiles.length})</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.votes_cast_total} votes)
            </option>
          ))}
        </select>

        <div className="filter-pill-group">
          <button
            type="button"
            onClick={() => setVoteType("all")}
            className={`nav-pill ${voteType === "all" ? "active" : ""}`}
          >
            All ({votes.length})
          </button>
          <button
            type="button"
            onClick={() => setVoteType("up")}
            className={`nav-pill ${voteType === "up" ? "active" : ""}`}
          >
            Upvotes +1 ({upvotesCount})
          </button>
          <button
            type="button"
            onClick={() => setVoteType("down")}
            className={`nav-pill ${voteType === "down" ? "active" : ""}`}
          >
            Downvotes -1 ({downvotesCount})
          </button>
        </div>
      </div>

      {/* Individual Votes Table */}
      <section className="telemetry-panel" style={{ overflowX: "auto" }}>
        <div className="feed-header" style={{ marginBottom: "16px" }}>
          <h2 className="section-title">Individual Vote Records</h2>
          <span className="count-pill">{filteredVotes.length} records</span>
        </div>

        {filteredVotes.length === 0 ? (
          <div className="empty-card">
            <p className="empty-title">No vote records match this filter.</p>
            <p className="empty-sub">
              When club members upvote (+1) or downvote (-1) captions in Prism
              Pop, every rating record appears in this ledger.
            </p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Voter Profile</th>
                <th>Rating Value</th>
                <th>Target AI Media</th>
                <th>Media Creator</th>
                <th>Media Net Score</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredVotes.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="user-cell">
                      {v.voter_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.voter_avatar}
                          alt={v.voter_name}
                          className="user-avatar-thumb"
                        />
                      ) : (
                        <div className="user-avatar-fallback">
                          <IconUser size={15} />
                        </div>
                      )}
                      <div>
                        <div className="user-cell-name">
                          {v.voter_name}
                          {v.is_self_vote && (
                            <span className="you-tag">SELF-VOTE</span>
                          )}
                        </div>
                        <div className="user-cell-uuid">
                          {v.user_id.slice(0, 8)}…
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {v.vote_value === 1 ? (
                      <span className="vote-tag up">
                        <IconVoteUp size={13} />
                        <span>UPVOTE (+1)</span>
                      </span>
                    ) : (
                      <span className="vote-tag down">
                        <IconVoteDown size={13} />
                        <span>DOWNVOTE (-1)</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="user-cell">
                      {v.media_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.media_image_url}
                          alt={v.media_caption}
                          className="table-media-thumb"
                        />
                      )}
                      <span className="table-caption-text">
                        &ldquo;{v.media_caption}&rdquo;
                      </span>
                    </div>
                  </td>
                  <td>{v.media_author_name}</td>
                  <td>
                    <span
                      style={{
                        color:
                          v.media_net_score >= 0
                            ? "var(--accent-sage)"
                            : "var(--accent-coral)",
                        fontWeight: 700,
                      }}
                    >
                      {v.media_net_score >= 0
                        ? `+${v.media_net_score}`
                        : v.media_net_score}
                    </span>
                  </td>
                  <td className="leader-sub">
                    {new Date(v.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
