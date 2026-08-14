"use client";

import { FormEvent, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { ApiError, createResource } from "@/lib/api";
import { AuthState } from "@/lib/types";
import { Modal } from "./Modal";

interface ResourceFormProps {
  auth: AuthState | null;
}

interface ResourceDraft {
  title: string;
  url: string;
  description: string;
  tags: string[];
}

interface PendingDuplicate {
  input: ResourceDraft;
  existingTitle: string;
}

export default function ResourceForm({ auth }: ResourceFormProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] =
    useState<PendingDuplicate | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!auth) {
    return <p className="hint">Log in to share a resource.</p>;
  }

  const token = auth.token;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // NOTE: no loading state here yet while the request is in flight -
    // see the "add a loading state to the resource form" issue.
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const input = { title, url, description, tags };

    try {
      await createResource(input, token);
      setTitle("");
      setUrl("");
      setDescription("");
      setTagsInput("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPendingDuplicate({
          input,
          existingTitle:
            typeof err.data?.duplicate?.title === "string"
              ? err.data.duplicate.title
              : title,
        });
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function cancel() {
    setPendingDuplicate(null);
  }

  async function confirmAnyway() {
    if (!pendingDuplicate || isConfirming) return;

    setIsConfirming(true);
    setError(null);
    try {
      await createResource(
        { ...pendingDuplicate.input, confirmDuplicate: true },
        token,
      );
      setTitle("");
      setUrl("");
      setDescription("");
      setTagsInput("");
      setPendingDuplicate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsConfirming(false);
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
        <Modal
          title="Duplicate resource"
          onClose={cancel}
          onConfirm={confirmAnyway}
        >
          <p className="modal-message">
            A resource titled <strong>{pendingDuplicate.existingTitle}</strong>{" "}
            already uses this URL. Do you want to add your resource anyway?
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancel"
              onClick={cancel}
              disabled={isConfirming}
            >
              <span>Cancel</span>
              <kbd>Esc</kbd>
            </button>
            <button
              type="button"
              className="modal-confirm"
              onClick={confirmAnyway}
              disabled={isConfirming}
            >
              <span>{isConfirming ? "Adding..." : "Add anyway"}</span>
              <CornerDownLeft size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
