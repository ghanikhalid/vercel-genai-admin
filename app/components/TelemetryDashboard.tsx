"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  AdminTelemetryStats,
  EnrichedMedia,
  EnrichedProfile,
  EnrichedVote,
  StorageObjectSummary,
} from "@/lib/adminData";
import {
  IconCamera,
  IconDatabase,
  IconShield,
  IconSparkle,
  IconUser,
  IconVoteDown,
  IconVoteUp,
} from "./Icons";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

const ARCHETYPE_COLORS: Record<
  EnrichedMedia["archetype"],
  { bg: string; border: string; text: string }
> = {
  "Crowd Pleaser": {
    bg: "rgba(143, 193, 169, 0.14)",
    border: "rgba(143, 193, 169, 0.4)",
    text: "#8fc1a9",
  },
  "Spicy Debate": {
    bg: "rgba(217, 149, 137, 0.15)",
    border: "rgba(217, 149, 137, 0.42)",
    text: "#d99589",
  },
  "Hidden Gem": {
    bg: "rgba(228, 201, 160, 0.14)",
    border: "rgba(228, 201, 160, 0.38)",
    text: "#e4c9a0",
  },
  "Tough Crowd": {
    bg: "rgba(217, 123, 115, 0.15)",
    border: "rgba(217, 123, 115, 0.42)",
    text: "#d97b73",
  },
  "Fresh Drop": {
    bg: "rgba(170, 178, 214, 0.14)",
    border: "rgba(170, 178, 214, 0.38)",
    text: "#aab2d6",
  },
};

export default function TelemetryDashboard({
  stats,
  profiles,
  media,
  votes,
  storageObjects,
}: {
  stats: AdminTelemetryStats;
  profiles: EnrichedProfile[];
  media: EnrichedMedia[];
  votes: EnrichedVote[];
  storageObjects: StorageObjectSummary[];
}) {
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(
    media[0]?.id ?? null
  );

  const selectedMedia =
    media.find((m) => m.id === selectedMediaId) ?? media[0] ?? null;

  const maxVotesOnMedia = Math.max(1, ...media.map((m) => m.total_votes));
  const maxHourly = Math.max(1, ...stats.hourlyActivity.map((h) => h.total));

  const topCreators = [...profiles]
    .sort(
      (a, b) =>
        b.net_karma_earned - a.net_karma_earned ||
        b.memes_count - a.memes_count
    )
    .slice(0, 5);

  const topCritics = [...profiles]
    .sort(
      (a, b) =>
        b.votes_cast_total - a.votes_cast_total ||
        b.generosity_rate - a.generosity_rate
    )
    .slice(0, 5);

  return (
    <div className="telemetry-suite">
      {/* Hero Banner */}
      <section className="admin-hero-banner">
        <div className="admin-hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>LIVE SUPABASE TELEMETRY · SUPERADMIN VERIFIED</span>
          </div>
          <h1 className="page-title">
            Prism Pop{" "}
            <span className="text-gradient">Executive Observatory.</span>
          </h1>
          <p className="page-sub" style={{ marginTop: "10px" }}>
            Real-time creative intelligence across{" "}
            <strong>{stats.totalUsers} club profiles</strong>,{" "}
            <strong>{stats.totalMedia} AI-captioned frames</strong>,{" "}
            <strong>{stats.totalVotes} community ratings</strong>, and{" "}
            <strong>{formatBytes(stats.totalStorageBytes)}</strong> of Supabase
            bucket media.
          </p>
        </div>

        <div className="admin-quick-actions">
          <Link href="/media" className="btn-primary">
            <IconCamera size={16} />
            <span>Manage AI Media (CRUD)</span>
          </Link>
          <Link href="/users" className="btn-ghost">
            <IconUser size={16} />
            <span>Inspect Profiles</span>
          </Link>
          <Link href="/ratings" className="btn-ghost">
            <IconVoteUp size={16} />
            <span>Ratings Ledger</span>
          </Link>
        </div>
      </section>

      {/* Top 4 KPI Cards */}
      <section className="kpi-grid-4">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kicker">01 · Club Identity</span>
            <span className="kpi-icon-badge">
              <IconUser size={18} />
            </span>
          </div>
          <div className="kpi-value">{stats.totalUsers}</div>
          <div className="kpi-label">Registered Member Profiles</div>
          <div className="kpi-foot">
            <span>{stats.superadminCount} Superadmins</span>
            <span>·</span>
            <span>
              {stats.customAvatarCount} Custom / {stats.googleAvatarCount} OAuth
              Avatars
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kicker">02 · AI Media Vault</span>
            <span className="kpi-icon-badge">
              <IconCamera size={18} />
            </span>
          </div>
          <div className="kpi-value">{stats.totalMedia}</div>
          <div className="kpi-label">Gemini Vision Captioned Frames</div>
          <div className="kpi-foot">
            <span>{formatBytes(stats.totalStorageBytes)} in Storage</span>
            <span>·</span>
            <span>{storageObjects.length} Bucket Objects</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kicker">03 · Audience Sentiment</span>
            <span className="kpi-icon-badge">
              <IconVoteUp size={18} />
            </span>
          </div>
          <div className="kpi-value">
            {stats.globalApprovalRate}%
            <span className="kpi-inline-sub">approval</span>
          </div>
          <div className="kpi-label">
            {stats.totalVotes} Total Ratings ({stats.totalUpvotes} Up /{" "}
            {stats.totalDownvotes} Down)
          </div>
          <div className="kpi-foot">
            <span
              style={{
                color:
                  stats.netCommunityKarma >= 0
                    ? "var(--accent-sage)"
                    : "var(--accent-coral)",
              }}
            >
              Net Karma:{" "}
              {stats.netCommunityKarma >= 0
                ? `+${stats.netCommunityKarma}`
                : stats.netCommunityKarma}
            </span>
            <span>·</span>
            <span>{stats.avgVotesPerMedia} votes / meme</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kicker">04 · Punchline Forensics</span>
            <span className="kpi-icon-badge">
              <IconSparkle size={18} />
            </span>
          </div>
          <div className="kpi-value">
            {stats.avgCaptionWords}
            <span className="kpi-inline-sub">words/meme</span>
          </div>
          <div className="kpi-label">
            Avg {stats.avgCaptionChars} chars per AI caption
          </div>
          <div className="kpi-foot">
            <span>{stats.activeFortunesCount} Daily Oracle Rolls</span>
            <span>·</span>
            <span>12-word AI target</span>
          </div>
        </div>
      </section>

      {/* CREATIVE HIGHLIGHT 1: The Comedy Heat & Controversy Matrix */}
      <section className="telemetry-panel">
        <div className="panel-header-split">
          <div>
            <span className="kicker">
              Creative Telemetry 01 · 2D Sentiment &amp; Polarization Stage
            </span>
            <h2 className="section-title" style={{ marginTop: "4px" }}>
              The Comedy Heat &amp; Controversy Matrix
            </h2>
            <p className="card-copy" style={{ maxWidth: "680px" }}>
              Every AI-captioned frame is plotted by{" "}
              <strong>Engagement Volume</strong> (X-axis: total ratings) against{" "}
              <strong>Approval Consensus</strong> (Y-axis: % upvotes). Click any
              node to inspect its comedic archetype and live rating breakdown.
            </p>
          </div>

          <div className="archetype-legend">
            {(
              Object.keys(ARCHETYPE_COLORS) as Array<EnrichedMedia["archetype"]>
            ).map((arch) => (
              <span
                key={arch}
                className="archetype-chip"
                style={{
                  background: ARCHETYPE_COLORS[arch].bg,
                  borderColor: ARCHETYPE_COLORS[arch].border,
                  color: ARCHETYPE_COLORS[arch].text,
                }}
              >
                {arch}: {stats.archetypeBreakdown[arch]}
              </span>
            ))}
          </div>
        </div>

        <div className="matrix-grid">
          {/* 2D Plot Canvas */}
          <div className="scatter-stage">
            <div className="quadrant-label q-top-left">HIDDEN GEMS</div>
            <div className="quadrant-label q-top-right">CROWD PLEASERS</div>
            <div className="quadrant-label q-bottom-left">COLD OPEN</div>
            <div className="quadrant-label q-bottom-right">
              SPICY / TOUGH CROWD
            </div>
            <div className="scatter-midline-h" />
            <div className="scatter-midline-v" />

            {media.map((item, idx) => {
              const xPct =
                maxVotesOnMedia > 0
                  ? 10 + (item.total_votes / maxVotesOnMedia) * 80
                  : 50;
              // Add slight deterministic jitter so overlapping points remain clickable
              const jitterX = ((idx % 5) - 2) * 2.2;
              const jitterY = ((Math.floor(idx / 3) % 5) - 2) * 2.2;
              const baseApproval =
                item.total_votes > 0 ? item.approval_rate : 50;
              const yPct = Math.min(
                90,
                Math.max(10, 90 - (baseApproval / 100) * 80 + jitterY)
              );
              const finalX = Math.min(90, Math.max(10, xPct + jitterX));
              const isSelected = selectedMedia?.id === item.id;
              const style = ARCHETYPE_COLORS[item.archetype];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMediaId(item.id)}
                  className={`scatter-node ${isSelected ? "selected" : ""}`}
                  style={{
                    left: `${finalX}%`,
                    top: `${yPct}%`,
                    background: style.bg,
                    borderColor: style.text,
                    color: style.text,
                  }}
                  title={`${item.caption} (${item.net_score >= 0 ? "+" : ""}${item.net_score})`}
                >
                  <span className="scatter-node-score">
                    {item.net_score > 0
                      ? `+${item.net_score}`
                      : item.net_score}
                  </span>
                </button>
              );
            })}

            <div className="scatter-axis-x">
              <span>Low Volume (0 votes)</span>
              <span>Engagement Volume (Total Votes Cast) →</span>
              <span>Peak ({maxVotesOnMedia} votes)</span>
            </div>
          </div>

          {/* Selected Node Inspector */}
          <div className="matrix-inspector">
            {selectedMedia ? (
              <>
                <div className="inspector-media-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedMedia.image_url}
                    alt={selectedMedia.caption}
                    className="inspector-img"
                  />
                  <div className="meme-scrim" />
                  <span
                    className="archetype-chip inspector-badge"
                    style={{
                      background:
                        ARCHETYPE_COLORS[selectedMedia.archetype].bg,
                      borderColor:
                        ARCHETYPE_COLORS[selectedMedia.archetype].border,
                      color: ARCHETYPE_COLORS[selectedMedia.archetype].text,
                    }}
                  >
                    {selectedMedia.archetype}
                  </span>
                  <p className="meme-overlay-caption" style={{ fontSize: "0.95rem" }}>
                    {selectedMedia.caption}
                  </p>
                </div>

                <div className="inspector-meta-grid">
                  <div className="meta-pill">
                    <span className="meta-pill-label">CREATOR</span>
                    <span className="meta-pill-value">
                      {selectedMedia.author_name}
                    </span>
                  </div>
                  <div className="meta-pill">
                    <span className="meta-pill-label">NET RATING</span>
                    <span
                      className="meta-pill-value"
                      style={{
                        color:
                          selectedMedia.net_score >= 0
                            ? "var(--accent-sage)"
                            : "var(--accent-coral)",
                      }}
                    >
                      {selectedMedia.net_score > 0
                        ? `+${selectedMedia.net_score}`
                        : selectedMedia.net_score}{" "}
                      ({selectedMedia.upvotes}↑ / {selectedMedia.downvotes}↓)
                    </span>
                  </div>
                  <div className="meta-pill">
                    <span className="meta-pill-label">APPROVAL / POLARIZATION</span>
                    <span className="meta-pill-value">
                      {selectedMedia.approval_rate}% approve ·{" "}
                      {selectedMedia.controversy_score}% spicy
                    </span>
                  </div>
                  <div className="meta-pill">
                    <span className="meta-pill-label">CAPTION FOOTPRINT</span>
                    <span className="meta-pill-value">
                      {selectedMedia.word_count} words ·{" "}
                      {selectedMedia.char_count} chars
                      {selectedMedia.storage_bytes
                        ? ` · ${formatBytes(selectedMedia.storage_bytes)}`
                        : ""}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-card">
                <p className="empty-title">No media items to plot yet.</p>
                <p className="empty-sub">
                  Create your first AI-captioned image in the AI Media CRUD tab.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CREATIVE HIGHLIGHT 2: Linguistic Forensics & Brevity vs. Virality */}
      <div className="two-col-panels">
        <section className="telemetry-panel">
          <span className="kicker">
            Creative Telemetry 02 · Gemini Linguistic Forensics
          </span>
          <h2 className="section-title" style={{ marginTop: "4px" }}>
            Punchline Brevity vs. Virality Curve
          </h2>
          <p className="card-copy">
            Does a tighter punchline score higher with the club? Comparing AI
            caption word-count brackets against average net karma and approval
            percentage.
          </p>

          <div className="brevity-bars" style={{ marginTop: "20px" }}>
            {stats.lengthVsKarmaBuckets.map((b) => (
              <div key={b.label} className="brevity-row">
                <div className="brevity-info">
                  <div>
                    <span className="brevity-title">{b.label}</span>
                    <span className="brevity-range">{b.range}</span>
                  </div>
                  <div className="brevity-stats">
                    <span>{b.count} memes</span>
                    <span>·</span>
                    <span
                      style={{
                        color:
                          b.avgScore >= 0
                            ? "var(--accent-sage)"
                            : "var(--accent-coral)",
                        fontWeight: 700,
                      }}
                    >
                      Avg {b.avgScore >= 0 ? `+${b.avgScore}` : b.avgScore}{" "}
                      karma
                    </span>
                    <span>·</span>
                    <span>{b.avgApproval}% approval</span>
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill champagne"
                    style={{
                      width: `${Math.max(8, b.avgApproval)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "24px" }}>
            <span className="kicker">
              Recurring AI Punchline Vocabulary &amp; Karma Impact
            </span>
            <div className="keyword-cloud" style={{ marginTop: "12px" }}>
              {stats.topKeywords.length === 0 ? (
                <span className="card-copy">
                  No caption tokens extracted yet.
                </span>
              ) : (
                stats.topKeywords.map((kw) => (
                  <span key={kw.word} className="keyword-pill">
                    <strong>{kw.word}</strong>
                    <span className="keyword-count">×{kw.count}</span>
                    <span
                      className="keyword-score"
                      style={{
                        color:
                          kw.avgScore >= 0
                            ? "var(--accent-sage)"
                            : "var(--accent-coral)",
                      }}
                    >
                      {kw.avgScore >= 0 ? `+${kw.avgScore}` : kw.avgScore}
                    </span>
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        {/* CREATIVE HIGHLIGHT 3: 24-Hour Circadian Pulse & Storage Telemetry */}
        <section className="telemetry-panel">
          <span className="kicker">
            Creative Telemetry 03 · Circadian Rhythm &amp; Bucket Footprint
          </span>
          <h2 className="section-title" style={{ marginTop: "4px" }}>
            24-Hour Studio Activity &amp; Storage Telemetry
          </h2>
          <p className="card-copy">
            Hourly distribution (UTC) of AI caption generations and community
            votes across the 24-hour cycle, paired with Supabase Storage bucket
            utilization.
          </p>

          <div className="hourly-chart">
            {stats.hourlyActivity.map((h) => {
              const heightPct =
                maxHourly > 0 ? Math.max(8, (h.total / maxHourly) * 100) : 8;
              return (
                <div
                  key={h.hour}
                  className="hour-col"
                  title={`${h.label} UTC — ${h.uploads} uploads, ${h.votes} votes`}
                >
                  <div className="hour-bar-wrap">
                    <div
                      className={`hour-bar ${h.total > 0 ? "active" : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  {h.hour % 4 === 0 && (
                    <span className="hour-tick">{String(h.hour).padStart(2, "0")}h</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="storage-breakdown-box">
            <div className="storage-bucket-row">
              <div>
                <span className="kicker">BUCKET: CAPTIONED-IMAGES</span>
                <p className="card-copy" style={{ margin: "2px 0 0" }}>
                  AI meme frames ({storageObjects.filter((o) => o.bucket === "captioned-images").length} files)
                </p>
              </div>
              <span className="storage-byte-badge">
                {formatBytes(stats.captionedBucketBytes)}
              </span>
            </div>

            <div className="storage-bucket-row">
              <div>
                <span className="kicker">BUCKET: AVATARS</span>
                <p className="card-copy" style={{ margin: "2px 0 0" }}>
                  Custom member portraits ({storageObjects.filter((o) => o.bucket === "avatars").length} files)
                </p>
              </div>
              <span className="storage-byte-badge">
                {formatBytes(stats.avatarsBucketBytes)}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* CREATIVE HIGHLIGHT 4: Architects vs. Critics & Affinity Network */}
      <div className="two-col-panels">
        <section className="telemetry-panel">
          <span className="kicker">
            Creative Telemetry 04 · Creator vs. Critic Dynamics
          </span>
          <h2 className="section-title" style={{ marginTop: "4px" }}>
            Top Meme Architects &amp; Chief Critics
          </h2>
          <p className="card-copy">
            Comparing the members who generate the highest-scoring AI media with
            the most active voters and their{" "}
            <strong>Generosity Index</strong> (% of votes that are upvotes).
          </p>

          <div className="mini-leaderboard">
            <div className="leaderboard-subhead">
              <span>MEME ARCHITECTS (BY NET KARMA)</span>
              <span>KARMA / MEMES</span>
            </div>
            {topCreators.map((prof, i) => (
              <div key={prof.id} className="leader-row">
                <div className="leader-user">
                  <span className="leader-rank">0{i + 1}</span>
                  <div>
                    <div className="leader-name">
                      {prof.full_name}
                      {prof.is_superadmin && (
                        <span className="super-Verify-pill">
                          <IconShield size={11} />
                          <span>ADMIN</span>
                        </span>
                      )}
                    </div>
                    <div className="leader-sub">
                      {prof.upvotes_received}↑ · {prof.downvotes_received}↓
                      received
                    </div>
                  </div>
                </div>
                <div className="leader-metric">
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
                  </span>
                  <span className="leader-sub">
                    {prof.memes_count} frames
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mini-leaderboard" style={{ marginTop: "20px" }}>
            <div className="leaderboard-subhead">
              <span>TASTE-MAKERS (BY VOTES CAST)</span>
              <span>GENEROSITY INDEX</span>
            </div>
            {topCritics.map((prof, i) => (
              <div key={prof.id} className="leader-row">
                <div className="leader-user">
                  <span className="leader-rank">0{i + 1}</span>
                  <div>
                    <div className="leader-name">{prof.full_name}</div>
                    <div className="leader-sub">
                      {prof.votes_cast_total} votes cast ({prof.upvotes_cast}↑ /{" "}
                      {prof.downvotes_cast}↓)
                    </div>
                  </div>
                </div>
                <div className="leader-metric">
                  <span style={{ color: "var(--accent-champagne)", fontWeight: 700 }}>
                    {prof.generosity_rate}% kind
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="telemetry-panel">
          <span className="kicker">
            Creative Telemetry 05 · Cross-Member Rating Graph
          </span>
          <h2 className="section-title" style={{ marginTop: "4px" }}>
            Voter-to-Creator Affinity Ledger
          </h2>
          <p className="card-copy">
            Tracks directional sentiment between club members: who consistently
            upvotes (or roasts) whose AI-generated captions.
          </p>

          <div className="affinity-list" style={{ marginTop: "18px" }}>
            {stats.affinityPairs.length === 0 ? (
              <div className="empty-card" style={{ padding: "28px 20px" }}>
                <p className="empty-title">No cross-member votes recorded yet.</p>
                <p className="empty-sub">
                  As members upvote and downvote captions, directional affinity
                  pairs appear here.
                </p>
              </div>
            ) : (
              stats.affinityPairs.slice(0, 7).map((pair) => (
                <div
                  key={`${pair.voterId}->${pair.creatorId}`}
                  className="affinity-row"
                >
                  <div className="affinity-names">
                    <strong>{pair.voterName}</strong>
                    <span className="affinity-arrow">→ rated →</span>
                    <strong>{pair.creatorName}</strong>
                  </div>
                  <div className="affinity-badges">
                    <span className="vote-tag up">
                      <IconVoteUp size={13} />
                      {pair.upvotes}
                    </span>
                    <span className="vote-tag down">
                      <IconVoteDown size={13} />
                      {pair.downvotes}
                    </span>
                    <span
                      className={`affinity-net ${
                        pair.netAffinity >= 0 ? "pos" : "neg"
                      }`}
                    >
                      {pair.netAffinity >= 0
                        ? `+${pair.netAffinity}`
                        : pair.netAffinity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {votes.length > 0 && (
            <div style={{ marginTop: "18px", textAlign: "right" }}>
              <Link href="/ratings" className="btn-ghost">
                <span>View Full Ratings Ledger ({votes.length}) →</span>
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
