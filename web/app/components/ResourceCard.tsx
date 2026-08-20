"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCode,
  Pencil,
  Save,
  Trash2,
  CircleUserRound,
  X,
} from "lucide-react";
import {
  addReaction,
  deleteResource,
  reportResource,
  updateResource,
} from "@/lib/api";
import { AuthState, Reaction, Resource } from "@/lib/types";
import ReactionPicker from "./ReactionPicker";
import { Modal } from "./Modal";
import { format } from "date-fns";

export function groupReactions(reactions: Reaction[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const reaction of reactions) {
    groups[reaction.emoji] = (groups[reaction.emoji] || 0) + 1;
  }
  return groups;
}

interface ResourceCardProps {
  resource: Resource;
  auth: AuthState | null;
  reactionHistory: string[];
  onUpdated: (resource: Resource) => void;
  onReactionSelected: (emoji: string) => void;
  onDeleted: (resourceId: string) => void;
}

export default function ResourceCard({
  resource,
  auth,
  reactionHistory,
  onUpdated,
  onReactionSelected,
  onDeleted,
}: ResourceCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const reactionGroups = groupReactions(resource.reactions || []);
  const [isDescShortened, setIsDescShortened] = useState(
    resource.description.length > 200,
  );
  const canDelete =
    !!auth &&
    (auth.user.role === "moderator" ||
      auth.user.id === resource.submittedBy?.id);
  const isOwner = !!auth && auth.user.id === resource.submittedBy?.id;
  const [reported, setReported] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState(resource.title);
  const [editUrl, setEditUrl] = useState(resource.url);
  const [editDescription, setEditDescription] = useState(resource.description);
  const [editTagsInput, setEditTagsInput] = useState(resource.tags.join(", "));

  function startEditing() {
    setEditTitle(resource.title);
    setEditUrl(resource.url);
    setEditDescription(resource.description);
    setEditTagsInput(resource.tags.join(", "));
    setError(null);
    setIsEditing(true);
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth) return;
    setError(null);

    const tags = editTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const { resource: updated } = await updateResource(
        resource.id,
        { title: editTitle, url: editUrl, description: editDescription, tags },
        auth.token,
      );
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReport() {
    if (!auth) return;
    setError(null);
    try {
      const { resource: updated } = await reportResource(
        resource.id,
        auth.token,
      );
      onUpdated(updated);
      setReported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(resource.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      setError("Failed to copy link");
    }
  }

  async function handleCopyMarkdown() {
    try {
      await navigator.clipboard.writeText(
        `[${resource.title}](${resource.url})`,
      );
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 1000);
    } catch {
      setError("Failed to copy markdown");
    }
  }

  async function handleReact(emoji: string) {
    if (!auth) return;
    setError(null);
    try {
      const { resource: updated } = await addReaction(
        { resourceId: resource.id, emoji },
        auth.token,
      );
      onUpdated(updated);
      onReactionSelected(emoji);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function confirmDelete() {
    if (!auth || !canDelete || isDeleting) return;

    setError(null);
    setIsDeleting(true);
    try {
      await deleteResource(resource.id, auth.token);
      setIsDeleteModalOpen(false);
      onDeleted(resource.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <article className="resource-card resource-card-editing resource-card-owned">
        <form
          className="resource-form resource-edit-form"
          onSubmit={handleEditSubmit}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={200}
            aria-label="Resource title"
            required
          />
          <input
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            aria-label="Resource URL"
            required
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={1000}
            aria-label="Resource description"
          />
          <input
            type="text"
            value={editTagsInput}
            onChange={(e) => setEditTagsInput(e.target.value)}
            placeholder="Tags, comma separated"
            aria-label="Resource tags"
          />
          <div className="edit-actions">
            <button
              type="button"
              className="edit-cancel-button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <X size={16} aria-hidden="true" />
              Cancel
            </button>
            <button
              type="submit"
              className="edit-save-button"
              disabled={isSaving}
            >
              <Save size={16} aria-hidden="true" />
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </article>
    );
  }

  return (
    <article
      className={`resource-card${isOwner ? " resource-card-owned" : ""}`}
    >
      <header className="resource-card-header">
        <div className="resource-heading">
          <h3 className="resource-title">
            <a href={resource.url} target="_blank" rel="noreferrer noopener">
              {resource.title}
            </a>
          </h3>
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
          <button
            type="button"
            className={`card-icon-button${copiedMarkdown ? " card-icon-button-success" : ""}`}
            onClick={handleCopyMarkdown}
            aria-label={copiedMarkdown ? "Markdown copied" : "Copy markdown"}
            title={copiedMarkdown ? "Markdown copied" : "Copy markdown"}
          >
            {copiedMarkdown ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <FileCode size={17} aria-hidden="true" />
            )}
          </button>
          {isOwner && (
            <button
              type="button"
              className="card-icon-button"
              onClick={startEditing}
              aria-label="Edit resource"
              title="Edit resource"
            >
              <Pencil size={17} aria-hidden="true" />
            </button>
          )}
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
          {resource.description.length && !isDescShortened ? (
            <div className="resource-description-row">
              <div className="resource-description-text">
                {resource.description}
              </div>
              {resource.description.length > 200 && (
                <button
                  className="resource-btn-action"
                  onClick={() => setIsDescShortened(!isDescShortened)}
                  aria-label="Show less"
                  title="Show less"
                >
                  <ChevronUp />
                </button>
              )}
            </div>
          ) : (
            <div className="resource-description-row">
              <div className="resource-description-text">
                {resource.description.substring(0, 200)}...
              </div>
              <button
                className="resource-btn-action"
                onClick={() => setIsDescShortened(!isDescShortened)}
                aria-label="Show more"
                title="Show more"
              >
                <ChevronDown />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="resource-card-toolbar">
        <div className="reactions">
          {Object.entries(reactionGroups).map(([emoji, count]) => (
            <span key={emoji} className="reaction-count">
              {emoji} {count}
            </span>
          ))}

          {auth && (
            <ReactionPicker history={reactionHistory} onSelect={handleReact} />
          )}
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
          {format(new Date(resource.createdAt), "PPP 'at' p")}
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
          <Link
            className="resource-text-action"
            href={`/resources/${resource.id}`}
          >
            View Details
          </Link>
        </div>
      </footer>

      {error && <p className="error resource-card-error">{error}</p>}

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
    </article>
  );
}
