"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Collection } from "@/lib/types";

interface CollectionCardProps {
  collection: Collection;
  onEdit: (collection: Collection) => void;
  onDelete: (collection: Collection) => void;
}

export default function CollectionCard({
  collection,
  onEdit,
  onDelete,
}: CollectionCardProps) {
  const resourceCount =
    collection._count?.resources ?? collection.resources?.length ?? 0;

  return (
    <article className="collection-card">
      <div className="collection-card-heading">
        <div>
          <h3>{collection.name}</h3>
          {collection.description && <p>{collection.description}</p>}
        </div>
        <div className="collection-card-actions">
          <button
            type="button"
            className="card-icon-button"
            onClick={() => onEdit(collection)}
            aria-label={`Edit ${collection.name}`}
            title="Edit collection"
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="card-icon-button card-icon-button-danger"
            onClick={() => onDelete(collection)}
            aria-label={`Delete ${collection.name}`}
            title="Delete collection"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <footer className="collection-card-footer">
        <span>
          <BookOpen size={15} aria-hidden="true" />
          {resourceCount} resource{resourceCount === 1 ? "" : "s"}
        </span>
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          Updated {new Date(collection.updatedAt).toLocaleDateString()}
        </span>
        <Link href={`/collections/${collection.id}`}>View collection</Link>
      </footer>
    </article>
  );
}
