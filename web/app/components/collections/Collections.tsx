"use client";

import { FormEvent, useEffect, useState } from "react";
import { FolderPlus, Trash2, X } from "lucide-react";
import {
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "@/lib/api";
import { AuthState, Collection } from "@/lib/types";
import { Modal } from "../Modal";
import CollectionCard from "./CollectionCard";

interface CollectionsProps {
  auth: AuthState | null;
}

export default function Collections({ auth }: CollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<Collection | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!auth) {
      setCollections([]);
      return;
    }

    setLoading(true);
    setError(null);
    listCollections(auth.token)
      .then(({ collections: fetched }) => {
        if (!cancelled) setCollections(fetched);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load collections",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth]);

  function openEdit(collection: Collection) {
    setError(null);
    setEditing(collection);
    setName(collection.name);
    setDescription(collection.description ?? "");
  }

  function closeEditor() {
    if (isSaving) return;
    setEditing(null);
    setName("");
    setDescription("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || isSaving) return;

    setError(null);
    setIsSaving(true);
    try {
      if (editing) {
        const { collection } = await updateCollection(
          editing.id,
          { name, description },
          auth.token,
        );
        setCollections((current) =>
          current.map((item) =>
            item.id === collection.id ? { ...item, ...collection } : item,
          ),
        );
      } else {
        const { collection } = await createCollection(
          { name, description },
          auth.token,
        );
        setCollections((current) => [
          { ...collection, _count: { resources: 0 } },
          ...current,
        ]);
      }
      setEditing(null);
      setName("");
      setDescription("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save collection",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!auth || !deleting || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteCollection(deleting.id, auth.token);
      setCollections((current) =>
        current.filter((item) => item.id !== deleting.id),
      );
      setDeleting(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete collection",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (!auth) {
    return (
      <p className="hint">
        Sign in to create collections and save resources in them.
      </p>
    );
  }

  return (
    <div className="collections">
      <form className="collection-form" onSubmit={handleSubmit}>
        <div className="collection-form-heading">
          <FolderPlus size={19} aria-hidden="true" />
          <h3>Create a collection</h3>
        </div>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Collection name"
          aria-label="Collection name"
          maxLength={100}
          required
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A short description (optional)"
          aria-label="Collection description"
          maxLength={500}
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Creating..." : "Create collection"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p className="hint">Loading your collections...</p>}
      {!loading && collections.length === 0 && (
        <p className="hint">
          No collections yet. Create one to start saving resources.
        </p>
      )}
      <div className="collection-list">
        {collections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        ))}
      </div>

      {editing && (
        <Modal title="Edit collection" onClose={closeEditor}>
          <form className="collection-modal-form" onSubmit={handleSubmit}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Collection name"
              maxLength={100}
              required
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label="Collection description"
              maxLength={500}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="modal-secondary"
                onClick={closeEditor}
                disabled={isSaving}
              >
                <span>Cancel</span>
                <X size={17} aria-hidden="true" />
              </button>
              <button
                type="submit"
                className="modal-primary"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Delete collection"
          onClose={() => !isDeleting && setDeleting(null)}
          onConfirm={confirmDelete}
        >
          <p className="modal-message">
            Delete <strong>{deleting.name}</strong>? The resources themselves
            will not be deleted.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-secondary"
              onClick={() => setDeleting(null)}
              disabled={isDeleting}
            >
              <span>Cancel</span>
              <X size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="modal-danger"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              <span>{isDeleting ? "Deleting..." : "Delete collection"}</span>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
