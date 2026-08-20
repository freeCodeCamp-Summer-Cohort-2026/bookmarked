"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  addResourcesToCollection,
  getCollection,
  listResources,
  removeResourceFromCollection,
} from "@/lib/api";
import { Collection, Resource } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useParams } from "next/navigation";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const { auth, ready } = useAuth();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!auth) return;

    setLoading(true);
    setError(null);
    Promise.all([getCollection(id, auth.token), listResources()])
      .then(([collectionResponse, resourcesResponse]) => {
        if (cancelled) return;
        setCollection(collectionResponse.collection);
        setResources(resourcesResponse.resources);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load collection",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth, id]);

  const availableResources = useMemo(() => {
    const savedIds = new Set(
      collection?.resources?.map((resource) => resource.id),
    );
    return resources.filter((resource) => !savedIds.has(resource.id));
  }, [collection, resources]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !collection || !selectedId || saving) return;

    setSaving(true);
    setError(null);
    try {
      const { collection: updated } = await addResourcesToCollection(
        collection.id,
        [selectedId],
        auth.token,
      );
      setCollection(updated);
      setSelectedId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add resource");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(resourceId: string) {
    if (!auth || !collection || removingId) return;
    setRemovingId(resourceId);
    setError(null);
    try {
      const { collection: updated } = await removeResourceFromCollection(
        collection.id,
        resourceId,
        auth.token,
      );
      setCollection(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove resource",
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (!ready)
    return (
      <main className="container">
        <p className="hint">Loading...</p>
      </main>
    );
  if (!auth) {
    return (
      <main className="container">
        <p className="hint">
          Please sign in on the home page to view this collection.
        </p>
        <Link href="/" className="collection-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to home
        </Link>
      </main>
    );
  }
  if (loading)
    return (
      <main className="container">
        <p className="hint">Loading collection...</p>
      </main>
    );
  if (error && !collection)
    return (
      <main className="container">
        <p className="error">{error}</p>
      </main>
    );
  if (!collection) return null;

  return (
    <main className="container collection-page">
      <Link href="/" className="collection-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to home
      </Link>
      <header className="collection-page-header">
        <div>
          <h1>{collection.name}</h1>
          {collection.description && (
            <p className="tagline">{collection.description}</p>
          )}
        </div>
        <span className="collection-resource-count">
          {collection.resources?.length ?? 0} saved
        </span>
      </header>

      <section>
        <h2>Add a resource</h2>
        <form className="collection-add-form" onSubmit={handleAdd}>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            aria-label="Resource to add"
          >
            <option value="">Select a resource</option>
            {availableResources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.title}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!selectedId || saving}>
            <Plus size={17} aria-hidden="true" />
            {saving ? "Adding..." : "Add resource"}
          </button>
        </form>
        {availableResources.length === 0 && (
          <p className="hint">
            All available resources are already in this collection.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      <section>
        <h2>Saved resources</h2>
        {!collection.resources?.length && (
          <p className="hint">
            This collection is empty. Add a resource above.
          </p>
        )}
        <div className="collection-resource-list">
          {collection.resources?.map((resource) => (
            <article key={resource.id} className="collection-resource-card">
              <div>
                <h3>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {resource.title}
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </h3>
                {resource.description && <p>{resource.description}</p>}
                {resource.tags.length > 0 && (
                  <div className="tags">
                    {resource.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="card-icon-button card-icon-button-danger"
                onClick={() => handleRemove(resource.id)}
                disabled={removingId === resource.id}
                aria-label={`Remove ${resource.title}`}
                title="Remove from collection"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
