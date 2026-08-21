"use client";

import { useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { listResources, listTrendingResources } from "@/lib/api";
import { AuthState, Resource } from "@/lib/types";
import { useReactionHistory } from "@/lib/useReactionHistory";
import ResourceCard from "./ResourceCard";
import TagFilter from "./TagFilter";

interface FeedProps {
  auth: AuthState | null;
  socket: Socket | null;
}

export function matchesResourceSearch(
  resource: { title?: string; description?: string },
  query: string,
): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const targetText =
    `${resource.title ?? ""} ${resource.description ?? ""}`.toLowerCase();
  return terms.every((term) => targetText.includes(term));
}

export default function Feed({ auth, socket }: FeedProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { history: reactionHistory, recordReaction } = useReactionHistory(
    auth?.user.id ?? null,
  );

  useEffect(() => {
    if (!auth) setMineOnly(false);
  }, [auth]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listResources({
      q: debouncedQuery || undefined,
      tag: tagFilter || undefined,
      submittedBy: mineOnly && auth ? auth.user.id : undefined,
      days: days,
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
  }, [debouncedQuery, tagFilter, mineOnly, auth, days]);

  useEffect(() => {
    if (!socket) return;

    function handleCreated(resource: Resource) {
      if (days !== null) return;

      const matchesMineOnlyFilter =
        !mineOnly || (auth && resource?.submittedBy?.id === auth.user.id);

      const matchesTagFilter =
        !tagFilter || (resource.tags && resource.tags.includes(tagFilter));
      const matchesSearchFilter = matchesResourceSearch(
        resource,
        debouncedQuery,
      );

      if (matchesMineOnlyFilter && matchesTagFilter && matchesSearchFilter) {
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
  }, [socket, auth, mineOnly, tagFilter, debouncedQuery, days]);

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
        <TagFilter tags={tags} value={tagFilter} onChange={setTagFilter} />
        <input
          type="search"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select
          value={days ?? ""}
          onChange={(e) =>
            setDays(e.target.value === "" ? null : Number(e.target.value))
          }
        >
          <option value="">All time</option>
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
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
