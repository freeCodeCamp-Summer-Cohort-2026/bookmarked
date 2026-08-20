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
});
