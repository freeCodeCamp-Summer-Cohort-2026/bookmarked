"use client";

import { FormEvent, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleCheck,
  Copy,
  ExternalLink,
  Link2Off,
  Pencil,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  addReaction,
  deleteResource,
  reportResource,
  updateResource,
} from "@/lib/api";
import { AuthState, Reaction, Resource } from "@/lib/types";

// Starter emoji set - deliberately small. See the "add another reaction
// emoji option" good-first-issue for extending this.
export const REACTION_OPTIONS = ["⭐", "🔖"];

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
  onUpdated: (resource: Resource) => void;
  onDeleted: (resourceId: string) => void;
}

export default function ResourceCard({ resource, auth, onUpdated, onDeleted }: ResourceCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const reactionGroups = groupReactions(resource.reactions || []);
  const canDelete = !!auth && (auth.user.role === "moderator" || auth.user.id === resource.submittedBy?.id);
  const isOwner = !!auth && auth.user.id === resource.submittedBy?.id;
  const [reported, setReported] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

    const tags = editTagsInput.split(",").map((t) => t.trim()).filter(Boolean);

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
      const { resource: updated } = await reportResource(resource.id, auth.token);
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

  async function handleReact(emoji: string) {
    if (!auth) return;
    setError(null);
    try {
      const { resource: updated } = await addReaction(
        { resourceId: resource.id, emoji },
        auth.token,
      );
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDelete() {
    if (!auth || !canDelete) return;

    const confirmed = window.confirm("Are you sure you want to delete this resource?");

    if (!confirmed) return;

    setError(null);

    try {
      await deleteResource(resource.id, auth.token);
      onDeleted(resource.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }

  }

  if (isEditing) {
    return (
      <article className="resource-card resource-card-editing">
        <form className="resource-form resource-edit-form" onSubmit={handleEditSubmit}>
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
    <article className="resource-card">
      <header className="resource-card-header">
        <div className="resource-heading">
          <h3 className="resource-title">
            <a href={resource.url} target="_blank" rel="noreferrer noopener">
              {resource.title}
            </a>
          </h3>
          <span className="resource-author">
            <UserRound size={14} aria-hidden="true" />
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
        <p className="resource-description">{resource.description}</p>
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

        <div className="resource-card-controls">
          {auth && (
            <button
              type="button"
              className={`card-icon-button${reported ? " card-icon-button-success" : ""}`}
              onClick={handleReport}
              disabled={reported}
              aria-label={reported ? "Broken link reported" : "Report broken link"}
              title={reported ? "Broken link reported" : "Report broken link"}
            >
              {reported ? (
                <CircleCheck size={17} aria-hidden="true" />
              ) : (
                <Link2Off size={17} aria-hidden="true" />
              )}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="card-icon-button card-icon-button-danger"
              onClick={handleDelete}
              aria-label="Delete"
              title="Delete resource"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <footer className="resource-card-footer">
        <time dateTime={resource.createdAt}>
          <CalendarDays size={14} aria-hidden="true" />
          {new Date(resource.createdAt).toLocaleString()}
        </time>
        <a
          className="resource-details-link"
          href={`/${resource.id}`}
          aria-label="View Details"
          title="View details"
        >
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </footer>

      {error && <p className="error resource-card-error">{error}</p>}
    </article>
  );
}
