"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  EnrichedMedia,
  EnrichedProfile,
  StorageObjectSummary,
} from "@/lib/adminData";
import {
  createAdminMediaAction,
  deleteAdminMediaAction,
  regenerateMediaCaptionWithAiAction,
  updateAdminMediaAction,
} from "@/app/actions";
import {
  IconCamera,
  IconEdit,
  IconPlus,
  IconSparkle,
  IconTrash,
  IconVoteDown,
  IconVoteUp,
} from "./Icons";

const STYLE_PRESETS = [
  "Deadpan Relatable Roast",
  "3:14 AM Productivity Spiral",
  "Unbothered Delusion Mode",
  "CEO of Overthinking",
  "Main Character Energy",
];

export default function MediaManager({
  media,
  profiles,
  storageObjects,
}: {
  media: EnrichedMedia[];
  profiles: EnrichedProfile[];
  storageObjects: StorageObjectSummary[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sourceMode, setSourceMode] = useState<"upload" | "url">("upload");
  const [captionMode, setCaptionMode] = useState<"ai" | "manual">("ai");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [storagePathInput, setStoragePathInput] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const [styleHint, setStyleHint] = useState(STYLE_PRESETS[0]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // Filter / View state
  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "newest" | "score" | "votes" | "controversial"
  >("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Edit / Status state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const captionedBucketObjects = storageObjects.filter(
    (o) =>
      o.bucket === "captioned-images" &&
      !o.path.endsWith(".svg") &&
      !o.path.endsWith(".json")
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMsg(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!file) {
      setPreviewUrl(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);
    const formData = new FormData(e.currentTarget);
    formData.set("sourceMode", sourceMode);
    formData.set("captionMode", captionMode);
    formData.set("styleHint", styleHint);
    if (sourceMode === "url") {
      formData.set("imageUrl", imageUrlInput);
      formData.set("storagePath", storagePathInput);
    }
    if (captionMode === "manual") {
      formData.set("caption", manualCaption);
    }

    startTransition(async () => {
      const res = await createAdminMediaAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || "Could not create AI media.");
        return;
      }
      setFeedback(
        `Created new AI media item: "${res.caption || manualCaption}"`
      );
      formRef.current?.reset();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFileName("");
      setManualCaption("");
      setImageUrlInput("");
      setShowCreateForm(false);
      router.refresh();
    });
  };

  const startEdit = (item: EnrichedMedia) => {
    setEditingId(item.id);
    setEditCaption(item.caption);
    setEditImageUrl(item.image_url);
    setErrorMsg(null);
    setFeedback(null);
  };

  const handleSaveEdit = (id: string) => {
    setErrorMsg(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await updateAdminMediaAction({
        id,
        caption: editCaption,
        image_url: editImageUrl,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Update failed.");
        return;
      }
      setEditingId(null);
      setFeedback("Updated AI media record.");
      router.refresh();
    });
  };

  const handleRespinAi = (item: EnrichedMedia) => {
    setErrorMsg(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await regenerateMediaCaptionWithAiAction({
        id: item.id,
        imageUrl: item.image_url,
        styleHint,
      });
      if (!res.success) {
        setErrorMsg(res.error || "AI caption regeneration failed.");
        return;
      }
      setFeedback(`Gemini generated fresh punchline: "${res.caption}"`);
      if (editingId === item.id && res.caption) {
        setEditCaption(res.caption);
      }
      router.refresh();
    });
  };

  const handleDelete = (item: EnrichedMedia) => {
    setErrorMsg(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteAdminMediaAction(item.id);
      if (!res.success) {
        setErrorMsg(res.error || "Delete failed.");
        return;
      }
      setFeedback(`Deleted media "${item.caption.slice(0, 38)}..."`);
      router.refresh();
    });
  };

  const filteredMedia = media
    .filter((m) => {
      if (authorFilter !== "all" && m.user_id !== authorFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        m.caption.toLowerCase().includes(q) ||
        m.author_name.toLowerCase().includes(q) ||
        m.archetype.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.net_score - a.net_score;
      if (sortBy === "votes") return b.total_votes - a.total_votes;
      if (sortBy === "controversial")
        return b.controversy_score - a.controversy_score;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

  return (
    <div className="telemetry-suite">
      <div className="panel-header-split">
        <div>
          <span className="kicker">
            Database Table · public.captioned_images (Full CRUD)
          </span>
          <h1 className="page-title">
            AI Generated <span className="text-gradient">Media Studio</span>
          </h1>
          <p className="page-sub" style={{ marginTop: "6px" }}>
            Create new Gemini Vision captioned images, inspect all community
            frames, edit or AI-regenerate captions inline, and delete media
            records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="btn-primary"
        >
          <IconPlus size={16} />
          <span>
            {showCreateForm ? "Close Creator Studio" : "Create New AI Media"}
          </span>
        </button>
      </div>

      {feedback && <div className="bootstrap-success">{feedback}</div>}
      {errorMsg && <div className="form-error">{errorMsg}</div>}

      {/* CREATE AI MEDIA STUDIO */}
      {showCreateForm && (
        <form
          ref={formRef}
          onSubmit={handleCreateSubmit}
          className="upload-studio"
        >
          <div className="feed-header" style={{ marginBottom: "18px" }}>
            <div>
              <span className="kicker">CREATE · public.captioned_images</span>
              <h2 className="upload-heading" style={{ marginTop: "4px" }}>
                Generate or Stamp New AI Media
              </h2>
            </div>

            <div className="filter-pill-group">
              <button
                type="button"
                onClick={() => setSourceMode("upload")}
                className={`nav-pill ${
                  sourceMode === "upload" ? "active" : ""
                }`}
              >
                Upload Image File
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("url")}
                className={`nav-pill ${sourceMode === "url" ? "active" : ""}`}
              >
                Use Storage / Image URL
              </button>
            </div>
          </div>

          <div className="upload-studio-grid">
            {sourceMode === "upload" ? (
              <label htmlFor="admin-image-upload" className="dropzone">
                <input
                  id="admin-image-upload"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  required={sourceMode === "upload"}
                  onChange={handleFileChange}
                  className="sr-only-input"
                />
                {previewUrl ? (
                  <div className="dropzone-preview-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Upload preview"
                      className="dropzone-preview"
                    />
                    <span className="dropzone-change-pill">
                      {fileName || "Change photo"}
                    </span>
                  </div>
                ) : (
                  <div className="dropzone-empty">
                    <div className="dropzone-icon">
                      <IconCamera size={24} />
                    </div>
                    <p className="dropzone-title">
                      Drop or click to choose a photo
                    </p>
                    <p className="dropzone-hint">
                      JPEG, PNG, WebP, or GIF up to 4.5 MB
                    </p>
                  </div>
                )}
              </label>
            ) : (
              <div className="url-source-box">
                <label className="admin-field-label">
                  <span className="kicker">Image URL (https://...)</span>
                  <input
                    type="url"
                    required={sourceMode === "url"}
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://tdzvwadwkosyckdxljco.supabase.co/storage/v1/object/public/..."
                    className="admin-input"
                  />
                </label>

                {captionedBucketObjects.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <span className="kicker">
                      Or Quick-Pick Existing Storage Bucket Frame:
                    </span>
                    <div className="storage-thumb-strip">
                      {captionedBucketObjects.slice(0, 6).map((obj) => (
                        <button
                          key={obj.path}
                          type="button"
                          onClick={() => {
                            setImageUrlInput(obj.public_url);
                            setStoragePathInput(obj.path);
                          }}
                          className={`storage-thumb-btn ${
                            imageUrlInput === obj.public_url ? "active" : ""
                          }`}
                          title={obj.path}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={obj.public_url} alt={obj.path} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="upload-controls" style={{ width: "100%" }}>
              <div className="filter-pill-group">
                <button
                  type="button"
                  onClick={() => setCaptionMode("ai")}
                  className={`nav-pill ${
                    captionMode === "ai" ? "active" : ""
                  }`}
                >
                  <IconSparkle size={13} />
                  <span>Gemini Vision Auto-Caption</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionMode("manual")}
                  className={`nav-pill ${
                    captionMode === "manual" ? "active" : ""
                  }`}
                >
                  <IconEdit size={13} />
                  <span>Custom Manual Caption</span>
                </button>
              </div>

              {captionMode === "ai" ? (
                <label className="admin-field-label" style={{ width: "100%" }}>
                  <span className="kicker">
                    Comedic Tone / Vibe Direction for Gemini
                  </span>
                  <select
                    value={styleHint}
                    onChange={(e) => setStyleHint(e.target.value)}
                    className="admin-input"
                  >
                    {STYLE_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="admin-field-label" style={{ width: "100%" }}>
                  <span className="kicker">
                    Custom Meme Caption (1–280 chars)
                  </span>
                  <input
                    type="text"
                    required={captionMode === "manual"}
                    maxLength={280}
                    value={manualCaption}
                    onChange={(e) => setManualCaption(e.target.value)}
                    placeholder="POV: YOU DEPLOYED ON FRIDAY AT 4:59 PM"
                    className="admin-input"
                  />
                </label>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary"
                >
                  <IconSparkle size={16} />
                  <span>
                    {isPending
                      ? "Creating & Captioning Media..."
                      : captionMode === "ai"
                      ? "Generate AI Caption & Save Record"
                      : "Save Media Record"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* FILTER / SEARCH / VIEW CONTROLS */}
      <div className="admin-toolbar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search captions, creators, or archetypes..."
          className="admin-input search-input"
        />

        <select
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          className="admin-input"
          style={{ maxWidth: "210px" }}
        >
          <option value="all">All Creators ({profiles.length})</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.memes_count})
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(
              e.target.value as
                | "newest"
                | "score"
                | "votes"
                | "controversial"
            )
          }
          className="admin-input"
          style={{ maxWidth: "210px" }}
        >
          <option value="newest">Sort: Newest First</option>
          <option value="score">Sort: Highest Net Score</option>
          <option value="votes">Sort: Most Votes Cast</option>
          <option value="controversial">Sort: Most Controversial</option>
        </select>

        <div className="filter-pill-group">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`nav-pill ${viewMode === "grid" ? "active" : ""}`}
          >
            Visual Cards ({filteredMedia.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`nav-pill ${viewMode === "table" ? "active" : ""}`}
          >
            Database Table
          </button>
        </div>
      </div>

      {/* MEDIA DISPLAY: GRID OR TABLE */}
      {filteredMedia.length === 0 ? (
        <div className="empty-card">
          <div
            style={{
              display: "inline-flex",
              marginBottom: "10px",
              color: "var(--accent-champagne)",
            }}
          >
            <IconCamera size={28} />
          </div>
          <p className="empty-title">No AI media records match your filter.</p>
          <p className="empty-sub">
            Click &ldquo;Create New AI Media&rdquo; above to upload a photo or
            stamp a new Gemini Vision caption.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="meme-grid">
          {filteredMedia.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <article key={item.id} className="meme-card">
                <div className="meme-stage">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.caption}
                    className="meme-img"
                    loading="lazy"
                  />
                  <div className="meme-scrim" />
                  <p className="meme-overlay-caption">{item.caption}</p>
                </div>

                <div className="meme-bar">
                  <div className="meme-credit">
                    <span className="meme-author">{item.author_name}</span>
                    <time className="meme-date">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {item.archetype}
                    </time>
                  </div>

                  <div className="vote-pill">
                    <span className="vote-btn up active">
                      <IconVoteUp size={14} />
                      <span>{item.upvotes}</span>
                    </span>
                    <span
                      className={`vote-net ${
                        item.net_score > 0
                          ? "pos"
                          : item.net_score < 0
                          ? "neg"
                          : ""
                      }`}
                    >
                      {item.net_score > 0
                        ? `+${item.net_score}`
                        : item.net_score}
                    </span>
                    <span className="vote-btn down active">
                      <IconVoteDown size={14} />
                      <span>{item.downvotes}</span>
                    </span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="admin-card-editor">
                    <label className="admin-field-label">
                      <span className="kicker">Edit Caption (1–280 chars)</span>
                      <textarea
                        rows={2}
                        maxLength={280}
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        className="admin-input"
                      />
                    </label>
                    <label className="admin-field-label">
                      <span className="kicker">Image URL</span>
                      <input
                        type="url"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        className="admin-input"
                      />
                    </label>
                    <div className="admin-card-actions">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSaveEdit(item.id)}
                        className="btn-primary"
                        style={{ padding: "8px 14px", fontSize: "0.8rem" }}
                      >
                        Save Update
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRespinAi(item)}
                        className="btn-ghost"
                        style={{ padding: "8px 12px", fontSize: "0.78rem" }}
                      >
                        <IconSparkle size={13} />
                        <span>AI Re-Spin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn-ghost"
                        style={{ padding: "8px 12px", fontSize: "0.78rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-card-footer">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startEdit(item)}
                      className="btn-ghost"
                      style={{ padding: "7px 13px", fontSize: "0.78rem" }}
                    >
                      <IconEdit size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRespinAi(item)}
                      className="btn-ghost"
                      style={{ padding: "7px 13px", fontSize: "0.78rem" }}
                      title="Ask Gemini Vision to write a fresh caption for this photo"
                    >
                      <IconSparkle size={13} />
                      <span>Re-Spin AI</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(item)}
                      className="btn-ghost danger-btn"
                      style={{ padding: "7px 13px", fontSize: "0.78rem" }}
                    >
                      <IconTrash size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="telemetry-panel" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Frame</th>
                <th>AI Caption</th>
                <th>Author</th>
                <th>Ratings</th>
                <th>Archetype</th>
                <th>Created</th>
                <th>CRUD Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr key={item.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.caption}
                      className="table-media-thumb"
                    />
                  </td>
                  <td style={{ maxWidth: "340px" }}>
                    {editingId === item.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <input
                          type="text"
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="admin-input"
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSaveEdit(item.id)}
                            className="btn-primary"
                            style={{ padding: "6px 12px", fontSize: "0.76rem" }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="btn-ghost"
                            style={{ padding: "6px 12px", fontSize: "0.76rem" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="table-caption-text">
                        &ldquo;{item.caption}&rdquo;
                      </div>
                    )}
                  </td>
                  <td>{item.author_name}</td>
                  <td>
                    <span
                      style={{
                        color:
                          item.net_score >= 0
                            ? "var(--accent-sage)"
                            : "var(--accent-coral)",
                        fontWeight: 700,
                      }}
                    >
                      {item.net_score >= 0
                        ? `+${item.net_score}`
                        : item.net_score}
                    </span>{" "}
                    <span className="leader-sub">
                      ({item.upvotes}↑ / {item.downvotes}↓)
                    </span>
                  </td>
                  <td>
                    <span className="count-pill">{item.archetype}</span>
                  </td>
                  <td className="leader-sub">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                      >
                        <IconEdit size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRespinAi(item)}
                        className="btn-ghost"
                        style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                        title="Re-Spin AI Caption"
                      >
                        <IconSparkle size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(item)}
                        className="btn-ghost danger-btn"
                        style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
