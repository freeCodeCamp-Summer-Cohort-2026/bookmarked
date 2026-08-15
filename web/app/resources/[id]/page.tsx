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
import { groupReactions } from "../../components/ResourceCard";
import ReactionPicker from "../../components/ReactionPicker";
import { useReactionHistory } from "@/lib/useReactionHistory";
import "./resource-page.css";

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
      recordReaction(emoji);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDelete() {
    if (!auth || !resource || !canDelete) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this resource?",
    );

    if (!confirmed) return;

    setError(null);

    try {
      await deleteResource(resource.id, auth.token);
      router.push("/"); //return to homepage if they delete it because the page goes away
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!resource) {
    return (
      <div className="loading">
        <p>Loading...</p>
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
      <h1>{resource.title}</h1>
      <h2>
        <a href={resource.url} target="_blank" rel="noreferrer noopener">
          {resource.url}
        </a>
      </h2>

      <div className="tags-container">
        {resource.tags?.length > 0 && (
          <div className="tags">
            {resource.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="emoji-container">
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

      <label>Description:</label>
      <p className="description-text">{resource.description}</p>

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

        {auth && (
          <button type="button" onClick={handleReport} disabled={reported}>
            {reported ? "Reported" : "Report broken link"}
          </button>
        )}
      </div>

      <p>
        <label>Date Posted:&nbsp;</label>
        <span>{new Date(resource.createdAt).toLocaleString()}</span>
      </p>

      <p>
        <label>Submitted By:</label>
        <span>{resource.submittedBy?.displayName}</span>
        <span>{resource.submittedBy?.role}</span>
      </p>

      <p className="resource-id">{resource.id}</p>
    </div>
  );
}
