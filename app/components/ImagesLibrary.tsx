"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStudioImageAction,
  deleteStudioImageAction,
  updateStudioImageAction,
} from "@/app/catalogActions";
import type { StudioImage } from "@/lib/catalog";
import { IconPlus, IconTrash } from "./Icons";

export default function ImagesLibrary({
  images,
  missing,
  error,
}: {
  images: StudioImage[];
  missing: boolean;
  error?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");

  const onCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createStudioImageAction(formData);
      if (!res.success) {
        setStatusMsg(res.error || "Upload failed.");
        return;
      }
      setStatusMsg("Saved.");
      setShowForm(false);
      formRef.current?.reset();
      router.refresh();
    });
  };

  return (
    <div className="telemetry-suite">
      <div className="panel-header-split">
        <div>
          <span className="kicker">Library</span>
          <h1 className="page-title">
            Studio <span className="text-gradient">images</span>
          </h1>
          <p className="page-sub" style={{ marginTop: "6px" }}>
            Upload or link images used across the product.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          <IconPlus size={16} />
          <span>{showForm ? "Close" : "Upload image"}</span>
        </button>
      </div>

      {missing ? (
        <div className="schema-banner">
          The images table is not in the database yet. Run{" "}
          <code>supabase/admin_catalog.sql</code> in Supabase.
        </div>
      ) : null}
      {error ? <div className="form-error">{error}</div> : null}
      {statusMsg ? (
        <div
          className={
            statusMsg === "Saved." || statusMsg === "Deleted."
              ? "bootstrap-success"
              : "form-error"
          }
        >
          {statusMsg}
        </div>
      ) : null}

      {showForm ? (
        <form ref={formRef} onSubmit={onCreate} className="upload-studio">
          <div className="upload-studio-grid">
            <label className="admin-field-label">
              <span className="kicker">File</span>
              <input className="admin-input" type="file" name="image" accept="image/*" />
            </label>
            <label className="admin-field-label">
              <span className="kicker">Or image URL</span>
              <input
                className="admin-input"
                type="url"
                name="image_url"
                placeholder="https://"
              />
            </label>
            <label className="admin-field-label" style={{ gridColumn: "1 / -1" }}>
              <span className="kicker">Alt text</span>
              <input className="admin-input" name="alt_text" placeholder="What is in the frame" />
            </label>
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "16px" }}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save image"}
          </button>
        </form>
      ) : null}

      <div className="image-library-grid">
        {images.length === 0 ? (
          <div className="empty-card">
            <p className="empty-title">No images yet</p>
          </div>
        ) : (
          images.map((image) => (
            <article key={image.id} className="image-library-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.image_url} alt={image.alt_text || "Studio image"} />
              {editingId === image.id ? (
                <div className="image-library-meta">
                  <input
                    className="admin-input"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                  />
                  <div className="resource-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await updateStudioImageAction({
                            id: image.id,
                            alt_text: editAlt,
                          });
                          if (!res.success) {
                            setStatusMsg(res.error || "Update failed.");
                            return;
                          }
                          setEditingId(null);
                          setStatusMsg("Saved.");
                          router.refresh();
                        })
                      }
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="image-library-meta">
                  <p>{image.alt_text || "No alt text"}</p>
                  <div className="resource-actions">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setEditingId(image.id);
                        setEditAlt(image.alt_text);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        if (!window.confirm("Delete this image?")) return;
                        startTransition(async () => {
                          const res = await deleteStudioImageAction(
                            image.id,
                            image.storage_path
                          );
                          if (!res.success) {
                            setStatusMsg(res.error || "Delete failed.");
                            return;
                          }
                          setStatusMsg("Deleted.");
                          router.refresh();
                        });
                      }}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
