import type { Resource } from "@prisma/client";
type ExportableResource = Pick<
  Resource,
  "title" | "url" | "tags" | "createdAt"
>;

function toCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function resourcesToCsv(resources: ExportableResource[]): string {
  const header = ["title", "url", "tags", "created_at"];
  const rows = resources.map((r) => [
    toCsvValue(r.title),
    toCsvValue(r.url),
    toCsvValue(r.tags.join(";")),
    toCsvValue(r.createdAt.toISOString()),
  ]);

  return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
