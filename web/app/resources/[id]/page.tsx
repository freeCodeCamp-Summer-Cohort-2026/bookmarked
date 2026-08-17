"use client";
import {
  addReaction,
  getResource,
  reportResource,
  deleteResource,
} from "@/lib/api";
import { Resource } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleUserRound,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  groupReactions,
  REACTION_OPTIONS,
} from "../../components/ResourceCard";
import { Modal } from "../../components/Modal";
import "./resource-page.css";

export default function Page() {
  const router = useRouter();
  const { auth } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    getResource(id)
      .then((data) => {
        if (!ignore) setResource(data.resource);
      })
      .catch((error) => {
        if (!ignore) setError(error.message);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleReport() {
    if (!auth || !resource) return;
    setError(null);
    try {
      const { resource: updated } = await reportResource(
        resource.id,
        auth.token,
      );
      setResource(updated);
      setReported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleReact(emoji: string) {
    if (!auth || !resource) return;
    setError(null);
    try {
      const { resource: updated } = await addReaction(
        { resourceId: resource.id, emoji },
        auth.token,
      );
      setResource(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCopyLink() {
    if (!resource) return;
    try {
      await navigator.clipboard.writeText(resource.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      setError("Failed to copy link");
    }
  }

  async function confirmDelete() {
    if (!auth || !resource || !canDelete || isDeleting) return;
    setError(null);
    setIsDeleting(true);
    try {
      await deleteResource(resource.id, auth.token);
      setIsDeleteModalOpen(false);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  if (error && !resource) {
    return (
      <div className="container">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="container">
        <div className="resource-detail-loading">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const reactionGroups = groupReactions(resource.reactions || []);
  const canDelete =
    !!auth &&
    (auth.user.role === "moderator" ||
      auth.user.id === resource.submittedBy?.id);

  return (
    <div className="container">
      <a className="resource-detail-back" href="/">
        &larr; Back
      </a>

      <article className="resource-card">
        <header className="resource-card-header">
          <div className="resource-heading">
            <h1 className="resource-detail-title">
              <a href={resource.url} target="_blank" rel="noreferrer noopener">
                {resource.title}
              </a>
            </h1>
            <span className="resource-detail-url">
              <ExternalLink size={13} aria-hidden="true" />
              <a href={resource.url} target="_blank" rel="noreferrer noopener">
                {resource.url}
              </a>
            </span>
            <span className="resource-author">
              <CircleUserRound size={24} strokeWidth={1} aria-hidden="true" />
              <span className="author">
                {resource.submittedBy?.displayName || "Unknown"}
              </span>
            </span>
          </div>
          <div className="resource-card-controls">
            <button
              type="button"
              className={`card-icon-button${copied ? " card-icon-button-success" : ""}`}
              onClick={handleCopyLink}
              aria-label={copied ? "Link copied" : "Copy link"}
              title={copied ? "Link copied" : "Copy link"}
            >
              {copied ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Copy size={17} aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {resource.tags?.length > 0 && (
          <div className="tags">
            {resource.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {resource.description && (
          <div className="resource-description">
            <div className="resource-description-text">
              {resource.description}
            </div>
          </div>
        )}

        <div className="resource-card-toolbar">
          <div className="reactions">
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <span key={emoji} className="reaction-count">
                {emoji} {count}
              </span>
            ))}
            {auth &&
              REACTION_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="reaction-button"
                  onClick={() => handleReact(emoji)}
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
          </div>

          {canDelete && (
            <div className="resource-card-controls">
              <button
                type="button"
                className="card-icon-button card-icon-button-danger"
                onClick={() => setIsDeleteModalOpen(true)}
                aria-label="Delete"
                title="Delete resource"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        <footer className="resource-card-footer">
          <time dateTime={resource.createdAt}>
            <CalendarDays size={14} aria-hidden="true" />
            {new Date(resource.createdAt).toLocaleString()}
          </time>
          <div className="resource-footer-actions">
            {auth && (
              <button
                type="button"
                className="resource-text-action"
                onClick={handleReport}
                disabled={reported}
              >
                {reported ? "Reported" : "Report broken link"}
              </button>
            )}
          </div>
        </footer>

        {error && <p className="error resource-card-error">{error}</p>}
      </article>

      <div className="resource-detail-meta">
        <span className="resource-detail-id">{resource.id}</span>
      </div>

      {isDeleteModalOpen && (
        <Modal
          title="Delete resource"
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
        >
          <p className="modal-message">
            Delete <strong>{resource.title}</strong>? This action cannot be
            undone.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              <span>Cancel</span>
              <kbd>Esc</kbd>
            </button>
            <button
              type="button"
              className="modal-danger"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              <span>{isDeleting ? "Deleting..." : "Delete resource"}</span>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
