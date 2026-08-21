import { AuthState, Resource } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any, message: string) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data && data.error
        ? data.error
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, data, message);
  }

  return data as T;
}

export function register(input: {
  email: string;
  password: string;
  displayName: string;
}) {
  return request<AuthState>("/api/auth/register", {
    method: "POST",
    body: input,
  });
}

export function login(input: { email: string; password: string }) {
  return request<AuthState>("/api/auth/login", { method: "POST", body: input });
}

export function getResource(id: string) {
  return request<{ resource: Resource }>(`/api/resources/${id}`);
}

export function listResources(
  params: {
    tag?: string;
    submittedBy?: string;
    q?: string;
    days?: number | null;
  } = {},
) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  if (params.submittedBy) search.set("submittedBy", params.submittedBy);
  if (params.days !== undefined && params.days !== null && params.days > 0) {
    search.set("days", String(params.days));
  }
  const query = search.toString() ? `?${search.toString()}` : "";
  return request<{ resources: Resource[] }>(`/api/resources${query}`);
}

export function getTagCounts() {
  return request<{ tagCounts: Record<string, number> }>(
    "/api/resources/tag-counts",
  );
}

export function createResource(
  input: {
    title: string;
    url: string;
    description: string;
    tags: string[];
    confirmDuplicate?: boolean;
  },
  token: string,
) {
  {
    return request<{ resource: Resource }>("/api/resources", {
      method: "POST",
      body: input,
      token,
    });
  }
}

export function updateResource(
  resourceId: string,
  input: Partial<{
    title: string;
    url: string;
    description: string;
    tags: string[];
  }>,
  token: string,
) {
  return request<{ resource: Resource }>(`/api/resources/${resourceId}`, {
    method: "PATCH",
    body: input,
    token,
  });
}

export function deleteResource(resourceId: string, token: string) {
  return request<{ message: string }>(`/api/resources/${resourceId}`, {
    method: "DELETE",
    token,
  });
}

export function addReaction(
  input: { resourceId: string; emoji: string },
  token: string,
) {
  return request<{ resource: Resource }>(
    `/api/resources/${input.resourceId}/reactions`,
    {
      method: "POST",
      body: { emoji: input.emoji },
      token,
    },
  );
}

export function reportResource(resourceId: string, token: string) {
  return request<{ resource: Resource }>(
    `/api/resources/${resourceId}/report`,
    {
      method: "POST",
      token,
    },
  );
}

export async function exportResources(
  format: "csv" | "json",
  token: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`${API_URL}/api/resources/export?format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Export failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="(.+)"/);
  const filename =
    match?.[1] || `resources.${format === "csv" ? "csv" : "json"}`;

  return { blob, filename };
}

export function removeReaction(
  input: { resourceId: string; reactionId: string },
  token: string,
) {
  return request<{ resource: Resource }>(
    `/api/resources/${input.resourceId}/reactions/${input.reactionId}`,
    { method: "DELETE", token },
  );
}
