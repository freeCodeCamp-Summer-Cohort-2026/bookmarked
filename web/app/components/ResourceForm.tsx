"use client";

import { FormEvent, useState } from "react";
import { createResource } from "@/lib/api";
import { AuthState, Resource } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { Modal } from "./Modal";

interface ResourceFormProps {
  auth: AuthState | null;
}

export default function ResourceForm({ auth }: ResourceFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<Resource | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!auth) {
    return <p className="hint">Log in to share a resource.</p>;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // NOTE: no loading state here yet while the request is in flight -
    // see the "add a loading state to the resource form" issue.
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const { resource } = await createResource(
        { title, url, description, tags },
        auth!.token,
      );
      setTitle("");
      setUrl("");
      setDescription("");
      setTagsInput("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPendingDuplicate(err.data.duplicate);
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function cancel() {
    setPendingDuplicate(null);
    setIsModalOpen(false);
  }

  async function confirmAnyway() {
    if (!pendingDuplicate) return;
    try {
      const { resource } = await createResource(
        { ...pendingDuplicate, confirmDuplicate: true },
        auth!.token,
      );
      setTitle("");
      setUrl("");
      setDescription("");
      setTagsInput("");
      setPendingDuplicate(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <form className="resource-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
        <input
          type="text"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <div className="description-field">
          <textarea
            placeholder="Why is this worth sharing? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
          <span className="char-count">{description.length}/1000</span>
        </div>
        <input
          type="text"
          placeholder="Tags, comma separated (e.g. javascript, beginner)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
        <button type="submit">Share resource</button>
        {error && <p className="error">{error}</p>}
      </form>
      {pendingDuplicate && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <p>
            A resource titled <strong>{pendingDuplicate.title}</strong> with
            this URL already exists. Add it anyway?
          </p>
          <button onClick={cancel}>Cancel</button>
          <button onClick={confirmAnyway}>Add anyway</button>
        </Modal>
      )}
    </>
  );
}
