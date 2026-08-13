import request from "supertest";
import { createApp } from "../app";
import { clearTestDB, disconnectTestDB } from "./setup";
import { prisma } from "../db";
import { hashPassword } from "../utils/password";

const app = createApp();

async function registerAndLogin(email: string) {
  const res = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
    displayName: email.split("@")[0],
  });
  return { token: res.body.token, user: res.body.user };
}

async function createModeratorAndLogin() {
	const passwordHash = await hashPassword("password123");

	await prisma.user.create({
		data: {
			email: "moderator@example.com",
			displayName: "Moderator",
			passwordHash,
			role: "moderator",
		},
	});

	const res = await request(app).post("/api/auth/login").send({
		email: "moderator@example.com",
		password: "password123",
	});

	return {
		token: res.body.token,
		user: res.body.user,
	};
}

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe("POST /api/resources", () => {
  it("creates a resource when authenticated", async () => {
    const { token } = await registerAndLogin("owner@example.com");

    const res = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "MDN Docs", url: "https://developer.mozilla.org", tags: ["JS", " Beginner "] });

    expect(res.status).toBe(201);
    expect(res.body.resource.title).toBe("MDN Docs");
    // tags should be lowercased and trimmed by the schema setter
    expect(res.body.resource.tags).toEqual(["js", "beginner"]);
  });

  it("rejects a resource with no title", async () => {
    const { token } = await registerAndLogin("owner2@example.com");

    const res = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://example.com" });

    expect(res.status).toBe(400);
  });

  it("rejects a resource with an invalid URL", async () => {
    const { token } = await registerAndLogin("owner3@example.com");

    const res = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Invalid URL", url: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("url must start with http:// or https://");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/resources")
      .send({ title: "No auth", url: "https://example.com" });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/resources", () => {
  it("filters by tag", async () => {
    const { token } = await registerAndLogin("filter@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "CSS Tricks", url: "https://css-tricks.com", tags: ["css"] });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Go Docs", url: "https://go.dev", tags: ["go"] });

    const res = await request(app).get("/api/resources").query({ tag: "css" });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("CSS Tricks");
  });
});

describe("DELETE /api/resources/:id", () => {
	it("allows a member to delete their own resource", async () => {
		const { token } = await registerAndLogin("owner-delete@example.com");

		const createRes = await request(app)
			.post("/api/resources")
			.set("Authorization", `Bearer ${token}`)
			.send({
				title: "My Resource",
				url: "https://example.com",
			});

		const resourceId = createRes.body.resource.id;

		const deleteRes = await request(app)
			.delete(`/api/resources/${resourceId}`)
			.set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
		expect(deleteRes.body.message).toBe("Resource deleted successfully");

		const getRes = await request(app).get(`/api/resources/${resourceId}`);

		expect(getRes.status).toBe(404);
	});

	it("prevents a member from deleting another user's resource", async () => {
		const { token: ownerToken } = await registerAndLogin(
			"resource-owner@example.com",
		);

		const { token: otherToken } = await registerAndLogin(
			"resource-other@example.com",
		);

		const createRes = await request(app)
			.post("/api/resources")
			.set("Authorization", `Bearer ${ownerToken}`)
			.send({
				title: "Someone Else's Resource",
				url: "https://example.com",
			});

		const resourceId = createRes.body.resource.id;

		const deleteRes = await request(app)
			.delete(`/api/resources/${resourceId}`)
			.set("Authorization", `Bearer ${otherToken}`);

		expect(deleteRes.status).toBe(403);
		expect(deleteRes.body.error).toBe(
			"You can only delete your own resources",
		);
  });

  it("allows a moderator to delete another user's resource", async () => {
		const { token: ownerToken } = await registerAndLogin(
			"resource-owner@example.com",
		);

		const { token: moderatorToken } = await createModeratorAndLogin();

		const createRes = await request(app)
			.post("/api/resources")
			.set("Authorization", `Bearer ${ownerToken}`)
			.send({
				title: "Resource owned by a member",
				url: "https://example.com",
			});

		const resourceId = createRes.body.resource.id;

		const deleteRes = await request(app)
			.delete(`/api/resources/${resourceId}`)
			.set("Authorization", `Bearer ${moderatorToken}`);

		expect(deleteRes.status).toBe(200);
		expect(deleteRes.body.message).toBe("Resource deleted successfully");

		const getRes = await request(app).get(`/api/resources/${resourceId}`);

		expect(getRes.status).toBe(404);
  });

	it("rejects unauthenticated resource deletion", async () => {
		const res = await request(app).delete("/api/resources/non-existent-id");

		expect(res.status).toBe(401);
	});

	it("returns 404 when the resource does not exist", async () => {
		const { token } = await registerAndLogin(
			"missing-resource@example.com",
		);

		const res = await request(app)
			.delete("/api/resources/non-existent-id")
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(404);
	});
});

describe("DELETE /api/resources/:id/reactions/:reactionId", () => {
  it("allows a user to remove their own reaction", async () => {
    const { token } = await registerAndLogin("reactor@example.com");

    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Reactable", url: "https://example.com" });

    const resourceId = createRes.body.resource.id;

    const reactRes = await request(app)
      .post(`/api/resources/${resourceId}/reactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ emoji: "⭐" });

    const reactionId = reactRes.body.resource.reactions[0].id;

    const deleteRes = await request(app)
      .delete(`/api/resources/${resourceId}/reactions/${reactionId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.resource.reactions).toHaveLength(0);
  });

  it("rejects removing someone else's reaction", async () => {
    const { token: ownerToken } = await registerAndLogin("owner3@example.com");
    const { token: otherToken } = await registerAndLogin("other@example.com");

    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Contested", url: "https://example.com" });

    const resourceId = createRes.body.resource.id;

    const reactRes = await request(app)
      .post(`/api/resources/${resourceId}/reactions`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ emoji: "⭐" });

    const reactionId = reactRes.body.resource.reactions[0].id;

    const deleteRes = await request(app)
      .delete(`/api/resources/${resourceId}/reactions/${reactionId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(deleteRes.status).toBe(403);
  });
});

describe("POST /api/resources/:id/report", ()=> {
  it("it allows a user to flag a broken url", async ()=> {
    const { token } = await registerAndLogin("reporter@example.com");

    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Reportable", url: "https://example.com" });

    const resourceId = createRes.body.resource.id;

    const res=await request(app)
      .post(`/api/resources/${resourceId}/report`)
      .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.resource.reportCount).toBe(1)
      
  })
})