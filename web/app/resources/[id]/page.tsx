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
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CircleUserRound,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Loader2,
  Share2,
  Smile,
  Trash2,
} from "lucide-react";
import { Modal } from "../../components/Modal";
import { format, formatDistanceToNowStrict } from "date-fns";
import { groupReactions } from "../../components/ResourceCard";
import ReactionPicker from "../../components/ReactionPicker";
import { useReactionHistory } from "@/lib/useReactionHistory";
import "./resource-page.css";

const WORDS_PER_MINUTE = 200;

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isPreviewable(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export default function Page() {
  const router = useRouter();
  const { auth } = useAuth();
  const { history: reactionHistory, recordReaction } = useReactionHistory(
    auth?.user.id ?? null,
  );
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [id]);

  function showStatus(message: string) {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatus(message);
    statusTimerRef.current = setTimeout(() => setStatus(null), 2500);
  }

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
      showStatus("Reported - thanks for flagging");
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
      recordReaction(emoji);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCopyLink() {
    if (!resource) return;
    try {
      await navigator.clipboard.writeText(resource.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      showStatus("Link copied to clipboard");
    } catch {
      setError("Failed to copy link");
    }
  }

  async function handleShare() {
    if (!resource) return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: resource.title,
          text: resource.description || undefined,
          url: resource.url,
        });
        showStatus("Link shared");
      } else {
        await navigator.clipboard.writeText(resource.url);
        showStatus("Link copied to clipboard");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Failed to share link");
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
  const reactionTotal = (resource.reactions || []).length;
  const wordCount = resource.description
    ? resource.description.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readMinutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
  const domain = extractDomain(resource.url);
  const canDelete =
    !!auth &&
    (auth.user.role === "moderator" ||
      auth.user.id === resource.submittedBy?.id);
  const absoluteTime = format(new Date(resource.createdAt), "PPP 'at' p");

  return (
    <div className="container">
      <a className="resource-detail-back" href="/">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to feed
      </a>

      <header className="resource-detail-header">
        <h1 className="resource-detail-title">
          <a href={resource.url} target="_blank" rel="noreferrer noopener">
            {resource.title}
          </a>
        </h1>
        <div className="resource-detail-meta-row">
          <span className="resource-detail-domain" title={resource.url}>
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
            <a href={resource.url} target="_blank" rel="noreferrer noopener">
              {domain}
            </a>
          </span>
          <span className="resource-detail-sep" aria-hidden="true">
            &bull;
          </span>
          <span className="resource-detail-author">
            <CircleUserRound size={16} strokeWidth={1.5} aria-hidden="true" />
            {resource.submittedBy?.displayName || "Unknown"}
          </span>
          <span className="resource-detail-sep" aria-hidden="true">
            &bull;
          </span>
          <time dateTime={resource.createdAt} title={absoluteTime}>
            <Clock size={14} aria-hidden="true" />
            {formatDistanceToNowStrict(new Date(resource.createdAt), {
              addSuffix: true,
            })}
          </time>
        </div>
      </header>

      <article className="resource-card resource-detail-body">
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

        <div className="resource-detail-stats">
          <span className="resource-detail-stat" title="Total reactions">
            <Smile size={14} aria-hidden="true" />
            {reactionTotal} reaction{reactionTotal === 1 ? "" : "s"}
          </span>
          <span className="resource-detail-stat" title="Word count">
            <FileText size={14} aria-hidden="true" />
            {wordCount} word{wordCount === 1 ? "" : "s"}
          </span>
          <span className="resource-detail-stat" title="Estimated read time">
            <Clock size={14} aria-hidden="true" />
            {readMinutes} min read
          </span>
        </div>
      </article>

      <div className="resource-detail-reactions">
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
      </div>

      <div
        className="resource-detail-actions"
        role="group"
        aria-label="Resource actions"
      >
        <a
          className="resource-detail-action resource-detail-action-primary"
          href={resource.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLink size={16} aria-hidden="true" />
          Visit link
        </a>
        <button
          type="button"
          className={`resource-detail-action${copied ? " resource-detail-action-active" : ""}`}
          onClick={handleCopyLink}
          aria-label={copied ? "Link copied" : "Copy link"}
        >
          {copied ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Copy size={16} aria-hidden="true" />
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          className="resource-detail-action"
          onClick={handleShare}
          aria-label="Share link"
        >
          <Share2 size={16} aria-hidden="true" />
          Share
        </button>
        {auth && (
          <button
            type="button"
            className="resource-detail-action"
            onClick={handleReport}
            disabled={reported}
            aria-label={reported ? "Reported" : "Report broken link"}
          >
            <Flag size={16} aria-hidden="true" />
            {reported ? "Reported" : "Report"}
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="resource-detail-action resource-detail-action-danger"
            onClick={() => setIsDeleteModalOpen(true)}
            aria-label="Delete resource"
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        )}
      </div>

      <label className="resource-detail-preview-toggle">
        <input
          type="checkbox"
          checked={previewEnabled}
          onChange={(e) => {
            setPreviewEnabled(e.target.checked);
            setPreviewLoaded(false);
          }}
        />
        <Eye size={15} aria-hidden="true" />
        Preview link
      </label>

      {previewEnabled && (
        <div className="resource-detail-preview">
          <div className="resource-detail-preview-header">
            <span className="resource-detail-preview-heading">
              <img
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
                alt=""
                width={16}
                height={16}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
              {domain}
            </span>
            <a
              className="resource-text-action"
              href={resource.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open in new tab
            </a>
          </div>
          <p className="resource-detail-preview-hint">
            Some sites block embedding. If nothing loads, open the link
            directly.
          </p>
          {isPreviewable(resource.url) ? (
            <div className="resource-detail-preview-frame">
              {!previewLoaded && (
                <div
                  className="resource-detail-preview-placeholder"
                  aria-hidden="true"
                >
                  <Loader2 className="resource-detail-spinner" size={18} />
                  Loading preview...
                </div>
              )}
              <iframe
                src={resource.url}
                title={`Preview of ${resource.title}`}
                onLoad={() => setPreviewLoaded(true)}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <p className="hint resource-detail-preview-note">
              This link can&apos;t be previewed.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="error resource-card-error" role="alert">
          {error}
        </p>
      )}

      {status && (
        <p className="resource-detail-status" role="status">
          <Check size={14} aria-hidden="true" />
          {status}
        </p>
      )}

      <div className="resource-detail-footer">
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
