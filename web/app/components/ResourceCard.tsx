"use client";

import { FormEvent, useState } from "react";
import { addReaction, deleteResource, reportResource, updateResource } from "@/lib/api";
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
    }
  }

async function handleReport() {
if(!auth) return;
setError(null);
try{
const {resource: updated} =await reportResource(resource.id,auth.token);
onUpdated(updated);
setReported(true);
}catch(err){
setError(err instanceof Error ? err.message: "Something went wrong");
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

  const formatRelativeTime = (inputString: Date | string) => {
    const date = new Date(inputString);
    
    const now = new Date();

    const diffInMs = now.getTime() - date.getTime();

    if (diffInMs < 0) {
      return "in future";
    }

    const diffInSeconds = diffInMs / 1000;
    if (diffInSeconds < 60) {
      return "just now";
    }

    const diffInMinutes = diffInSeconds / 60;
    if (diffInMinutes < 60) {
      const roundedMinutes = Math.round(diffInMinutes);
      return `${roundedMinutes} minute${roundedMinutes === 1 ? "" : "s"} ago`;
    }

    const diffInHours = diffInMinutes / 60;
    if (diffInHours < 24) {
      const roundedHours = Math.round(diffInHours);
      return `${roundedHours} hour${roundedHours === 1 ? "" : "s"} ago`;
    }

    const diffInDays = diffInHours / 24;
    if (diffInDays < 7) {
      const roundedDays = Math.round(diffInDays);
      return `${roundedDays} day${roundedDays === 1 ? "" : "s"} ago`;
    }

    // fallback to full date
    return date.toLocaleString("en-US");
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
      <article className="resource-card">
        <form className="resource-form" onSubmit={handleEditSubmit}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={200}
            required
          />
          <input
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            required
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={1000}
          />
          <input
            type="text"
            value={editTagsInput}
            onChange={(e) => setEditTagsInput(e.target.value)}
            placeholder="Tags, comma separated"
          />
          <div className="edit-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </article>
    );
  }

  return (
    <article className="resource-card">
      <header>
        <span className="resource-title">
          <a href={resource.url} target="_blank" rel="noreferrer noopener">
            {resource.title}
          </a>
        </span>
        <span className="author">
          {resource.submittedBy?.displayName || "Unknown"}
        </span>
        <button
          type="button"
          className="copy-link-button"
          onClick={handleCopyLink}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        {isOwner && (
          <button type="button" className="edit-button" onClick={startEditing}>
            Edit
          </button>
        )}
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
      <footer>
        <a className="resource-title-details" href={`/${resource.id}`}>
          View Details
        </a>
        <time>{formatRelativeTime(resource.createdAt)}</time>
        <div className="actions">
          {canDelete && (
          <button
            type="button"
            className="delete-button"
            onClick={handleDelete}
          >
            Delete
          </button>
        )}

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
              >
                {emoji}
              </button>
            ))}
        </div>
        </div>
        {auth && (
  <button type="button" onClick={handleReport} disabled={reported}>
    {reported ? "Reported" : "Report broken link"}
  </button>
)}
      </footer>
      {error && <p className="error">{error}</p>}
    </article>
  );
}