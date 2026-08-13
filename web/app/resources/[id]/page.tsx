"use client";
import { addReaction, getResource } from "@/lib/api";
import { Resource } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { groupReactions, REACTION_OPTIONS } from "../../components/ResourceCard";
import "./resource-page.css";

export default function Page() {
  const { auth } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reactionGroups = resource
    ? groupReactions(resource.reactions || [])
    : {};

  async function handleReact(emoji: string) {
    if (!auth) return;
    setError(null);
    try {
      const { resource: updated } = await addReaction(
        { resourceId: resource!.id, emoji },
        auth.token,
      );
      setResource(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

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

  if (error) return <p className="error">{error}</p>;
  if (!resource) {
    return (
      <div className="loading">
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div className="container">
      <h1>{resource.title}</h1>
      <h2>
        <a href={resource.url} target="_blank" rel="noreferrer noopener">
          {resource.url}
        </a>
      </h2>

      <div className="tags-container">
        {resource!.tags?.length > 0 && (
          <div className="tags">
            {resource!.tags.map((tag) => (
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

      <label>Description:</label>
      <p className="description-text">{resource.description}</p>

      <p>
        <label>Date Posted:&nbsp;</label>
        <span>{new Date(resource.createdAt).toLocaleString()}</span>
      </p>

      <p>
        <label>Submitted By:</label>
        <span>{resource.submittedBy?.displayName}</span>
      </p>

      <p className="resource-id">{resource.id}</p>
    </div>
  );
}
