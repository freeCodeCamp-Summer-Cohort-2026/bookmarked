"use client";

import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { listResources } from "@/lib/api";
import { AuthState, Resource } from "@/lib/types";
import { useReactionHistory } from "@/lib/useReactionHistory";
import ResourceCard from "./ResourceCard";

interface FeedProps {
  auth: AuthState | null;
  socket: Socket | null;
}

export default function Feed({ auth, socket }: FeedProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { history: reactionHistory, recordReaction } = useReactionHistory(
    auth?.user.id ?? null,
  );

  useEffect(() => {
    if (!auth) setMineOnly(false);
  }, [auth]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listResources({
      tag: tagFilter || undefined,
      submittedBy: mineOnly && auth ? auth.user.id : undefined,
    })
      .then(({ resources: fetched }) => {
        if (!cancelled) setResources(fetched);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tagFilter, mineOnly, auth]);

  useEffect(() => {
    if (!socket) return;

    function handleCreated(resource: Resource) {
      const matchesMineOnlyFilter =
        !mineOnly || (auth && resource?.submittedBy?.id === auth.user.id);
      const matchesTagFilter =
        !tagFilter || (resource.tags && resource.tags.includes(tagFilter));

      if (matchesMineOnlyFilter && matchesTagFilter) {
        setResources((prev) => [resource, ...prev]);
      }
    }

    function handleUpdated(updated: Resource) {
      setResources((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
    }

    socket.on("resource:created", handleCreated);
    socket.on("resource:updated", handleUpdated);
    return () => {
      socket.off("resource:created", handleCreated);
      socket.off("resource:updated", handleUpdated);
    };
  }, [socket, auth, mineOnly, tagFilter]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) {
      for (const tag of r.tags || []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [resources]);

  function handleReactionUpdated(updated: Resource) {
    setResources((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  }

  function handleDeleted(resourceId: string) {
    setResources((prev) =>
      prev.filter((resource) => resource.id !== resourceId),
    );
  }

  return (
    <div className="feed">
      <div className="filter-bar">
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        {auth && (
          <label className="mine-toggle">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
            />
            My resources
          </label>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="hint">Getting resources ready...</p>}
      {!loading && resources.length === 0 && (
        <p className="hint">
          {mineOnly
            ? "You haven't submitted any resources yet. Add one now!"
            : "No resources found yet. Be first to create one."}
        </p>
      )}

      <div className="resource-list">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            auth={auth}
            reactionHistory={reactionHistory}
            onReactionSelected={recordReaction}
            onUpdated={handleReactionUpdated}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}
