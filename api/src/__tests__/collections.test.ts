import request from "supertest";
import { createApp } from "../app";
import { clearTestDB, disconnectTestDB } from "./setup";

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      email,
      password: "password123",
      displayName: email.split("@")[0],
    });

  return { token: res.body.token, user: res.body.user };
}

async function createCollection(token: string, name: string) {
  const res = await request(app)
    .post("/api/collections")
    .set("Authorization", `Bearer ${token}`)
    .send({ name });

  expect(res.status).toBe(201);
  return res.body.collection;
}

async function createResource(token: string, title: string, url: string) {
  const res = await request(app)
    .post("/api/resources")
    .set("Authorization", `Bearer ${token}`)
    .send({ title, url });

  expect(res.status).toBe(201);
  return res.body.resource;
}

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe("POST /api/collections", () => {
  it("creates a collection when authenticated", async () => {
    const { token } = await registerAndLogin("owner@example.com");

    const res = await request(app)
      .post("/api/collections")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Favorites",
        description: "My must-read links",
      });

    expect(res.status).toBe(201);
    expect(res.body.collection).toMatchObject({
      name: "Favorites",
      description: "My must-read links",
    });
  });

  it("rejects duplicate collection names for the same user", async () => {
    const { token } = await registerAndLogin("duplicate@example.com");

    await request(app)
      .post("/api/collections")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Favorites",
        description: "First collection",
      });

    const res = await request(app)
      .post("/api/collections")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Favorites",
        description: "Second collection",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      "A collection with this name already exists for this user",
    );
  });
});

describe("GET /api/collections", () => {
  it("returns only the authenticated user's collections", async () => {
    const alice = await registerAndLogin("alice@example.com");
    const bob = await registerAndLogin("bob@example.com");

    await request(app)
      .post("/api/collections")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ name: "Alice favorites" });

    await request(app)
      .post("/api/collections")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ name: "Bob favorites" });

    const res = await request(app)
      .get("/api/collections")
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).toBe(200);
    expect(res.body.collections).toHaveLength(1);
    expect(res.body.collections[0].name).toBe("Alice favorites");
  });
});

describe("GET /api/collections/:id", () => {
  it("returns a collection only when it belongs to the authenticated user", async () => {
    const { token, user } = await registerAndLogin("owner2@example.com");

    const createdRes = await request(app)
      .post("/api/collections")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Shared reads" });

    const res = await request(app)
      .get(`/api/collections/${createdRes.body.collection.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.collection).toMatchObject({
      id: createdRes.body.collection.id,
      name: "Shared reads",
      userId: user.id,
    });
  });

  it("does not expose a collection to another user", async () => {
    const owner = await registerAndLogin("collection-owner@example.com");
    const otherUser = await registerAndLogin("collection-other@example.com");
    const collection = await createCollection(owner.token, "Private reads");

    const res = await request(app)
      .get(`/api/collections/${collection.id}`)
      .set("Authorization", `Bearer ${otherUser.token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Collection not found");
  });
});

describe("POST /api/collections/:id/resources", () => {
  it("adds resources to a collection", async () => {
    const { token } = await registerAndLogin("resource-adder@example.com");
    const collection = await createCollection(token, "Reading list");
    const resource = await createResource(
      token,
      "TypeScript handbook",
      "https://www.typescriptlang.org/docs/",
    );

    const res = await request(app)
      .post(`/api/collections/${collection.id}/resources`)
      .set("Authorization", `Bearer ${token}`)
      .send({ resourceIds: [resource.id] });

    expect(res.status).toBe(200);
    expect(res.body.collection.resources).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: resource.id })]),
    );
  });
});

describe("DELETE /api/collections/:id/resources/:resourceId", () => {
  it("removes a resource from a collection", async () => {
    const { token } = await registerAndLogin("resource-remover@example.com");
    const collection = await createCollection(token, "To revisit");
    const resource = await createResource(
      token,
      "MDN",
      "https://developer.mozilla.org/",
    );

    await request(app)
      .post(`/api/collections/${collection.id}/resources`)
      .set("Authorization", `Bearer ${token}`)
      .send({ resourceIds: resource.id })
      .expect(200);

    const res = await request(app)
      .delete(`/api/collections/${collection.id}/resources/${resource.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.collection.resources).toEqual([]);
  });
});

describe("PATCH /api/collections/:id", () => {
  it("updates a collection owned by the authenticated user", async () => {
    const { token } = await registerAndLogin("collection-editor@example.com");
    const collection = await createCollection(token, "Old name");

    const res = await request(app)
      .patch(`/api/collections/${collection.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New name", description: "Updated description" });

    expect(res.status).toBe(200);
    expect(res.body.collection).toMatchObject({
      name: "New name",
      description: "Updated description",
    });
  });

  it("returns 409 when renaming to a duplicate name", async () => {
    const { token } = await registerAndLogin("duplicate-rename@example.com");
    await createCollection(token, "Existing name");
    const collection = await createCollection(token, "Name to replace");

    const res = await request(app)
      .patch(`/api/collections/${collection.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Existing name" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      "A collection with this name already exists for this user",
    );
  });

  it("does not allow another user to update a collection", async () => {
    const owner = await registerAndLogin("patch-owner@example.com");
    const otherUser = await registerAndLogin("patch-other@example.com");
    const collection = await createCollection(owner.token, "Protected name");

    const res = await request(app)
      .patch(`/api/collections/${collection.id}`)
      .set("Authorization", `Bearer ${otherUser.token}`)
      .send({ name: "Hijacked name" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Collection not found");
  });
});

describe("DELETE /api/collections/:id", () => {
  it("deletes a collection owned by the authenticated user", async () => {
    const { token } = await registerAndLogin("collection-deleter@example.com");
    const collection = await createCollection(token, "Disposable collection");

    const res = await request(app)
      .delete(`/api/collections/${collection.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Collection deleted successfully");

    const getRes = await request(app)
      .get(`/api/collections/${collection.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });
});
