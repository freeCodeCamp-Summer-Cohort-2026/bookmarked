import { AuthState, Resource } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, { method = "GET", body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
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
    const message = data && data.error ? data.error : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function register(input: { email: string; password: string; displayName: string }) {
  return request<AuthState>("/api/auth/register", { method: "POST", body: input });
}

export function login(input: { email: string; password: string }) {
  return request<AuthState>("/api/auth/login", { method: "POST", body: input });
}

export function listResources(params: { tag?: string; submittedBy?: string } = {}) {
  const search = new URLSearchParams();
  if (params.tag) search.set("tag", params.tag);
  if (params.submittedBy) search.set("submittedBy", params.submittedBy);
  const query = search.toString() ? `?${search.toString()}` : "";
  return request<{ resources: Resource[] }>(`/api/resources${query}`);
}

export function createResource(
  input: { title: string; url: string; description: string; tags: string[] },
  token: string
) {
  return request<{ resource: Resource }>("/api/resources", { method: "POST", body: input, token });
}

export function deleteResource(resourceId: string, token: string) {
  return request<{ message: string }>(`/api/resources/${resourceId}`, { method: "DELETE", token });
}

export function addReaction(input: { resourceId: string; emoji: string }, token: string) {
  return request<{ resource: Resource }>(`/api/resources/${input.resourceId}/reactions`, {
    method: "POST",
    body: { emoji: input.emoji },
    token,
  });
}

export function removeReaction(input: { resourceId: string; reactionId: string }, token: string) {
  return request<{ resource: Resource }>(
    `/api/resources/${input.resourceId}/reactions/${input.reactionId}`,
    { method: "DELETE", token }
  );
}

export function reportResource(resourceId: string, token: string){
  return request<{resource: Resource}>(`/api/resources/${resourceId}/report`, {
    method: "POST",
    token
  })

}