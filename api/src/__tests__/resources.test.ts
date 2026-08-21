import request from "supertest";
import { createApp } from "../app";
import { clearTestDB, disconnectTestDB } from "./setup";
import { prisma } from "../db";
import { hashPassword } from "../utils/password";
import { subDays } from "date-fns";

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
      .send({
        title: "MDN Docs",
        url: "https://developer.mozilla.org",
        tags: ["JS", " Beginner "],
      });

    expect(res.status).toBe(201);
    expect(res.body.resource.title).toBe("MDN Docs");
    // tags should be lowercased and trimmed by the schema setter
    expect(res.body.resource.tags).toEqual(["js", "beginner"]);
  });

  it("requires confirmation before creating a duplicate URL", async () => {
    const { token } = await registerAndLogin("duplicate@example.com");
    const url = "https://example.com/shared";

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Existing resource", url });

    const duplicateRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "My new resource",
        url,
        description: "Keep my submitted description",
        tags: ["Original Tag"],
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.duplicate).toMatchObject({
      title: "Existing resource",
      url,
    });

    const confirmedRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "My new resource",
        url,
        description: "Keep my submitted description",
        tags: ["Original Tag"],
        confirmDuplicate: true,
      });

    expect(confirmedRes.status).toBe(201);
    expect(confirmedRes.body.resource).toMatchObject({
      title: "My new resource",
      url,
      description: "Keep my submitted description",
      tags: ["original tag"],
    });
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
  it("returns an empty array when no resources are trending", async () => {
    const res = await request(app).get(`/api/resources`).query({ days: 7 });
    expect(res.status).toBe(200);
    expect(res.body.resources).toEqual([]);
  });

  it("filters by tag", async () => {
    const { token } = await registerAndLogin("filter@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "CSS Tricks",
        url: "https://css-tricks.com",
        tags: ["css"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Go Docs", url: "https://go.dev", tags: ["go"] });

    const res = await request(app).get("/api/resources").query({ tag: "css" });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("CSS Tricks");
  });

  it("trims the search query", async () => {
    const { token } = await registerAndLogin("trim-search@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "React Guide",
        description: "Learn React",
        url: "https://example.com/react",
        tags: ["react"],
      });

    const res = await request(app)
      .get("/api/resources")
      .query({ q: "  React  " });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("React Guide");
  });
  it("returns no resources when search query has no matches", async () => {
    const { token } = await registerAndLogin("no-results@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "React Guide",
        description: "Learn React",
        url: "https://example.com/react",
        tags: ["react"],
      });

    const res = await request(app).get("/api/resources").query({ q: "Python" });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(0);
  });
  it("filters by search query in title", async () => {
    const { token } = await registerAndLogin("search@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "React Hooks Guide",
        description: "Learn useState and useEffect",
        url: "https://example.com/react",
        tags: ["react"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Go Docs", url: "https://go.dev", tags: ["go"] });

    const res = await request(app).get("/api/resources").query({ q: "React" });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("React Hooks Guide");
  });
  it("filters by search query in description", async () => {
    const { token } = await registerAndLogin("description-search@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Frontend Guide",
        description: "A complete guide to React and TypeScript",
        url: "https://example.com/frontend",
        tags: ["frontend"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Go Guide",
        description: "Learn the Go programming language",
        url: "https://example.com/go",
        tags: ["go"],
      });

    const res = await request(app)
      .get("/api/resources")
      .query({ q: "TypeScript" });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("Frontend Guide");
  });
  it("combines search query with tags filter", async () => {
    const { token } = await registerAndLogin("combined-filter@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "React Guide",
        description: "Learn React",
        url: "https://example.com/react",
        tags: ["javascript"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "React CSS Guide",
        description: "Learn React with CSS",
        url: "https://example.com/react-css",
        tags: ["css"],
      });

    const res = await request(app).get("/api/resources").query({
      q: "React",
      tag: "css",
    });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("React CSS Guide");
  });

  it("filters resources from a particular user ONLY", async () => {
    const { token: myToken, user: myUser } = await registerAndLogin("my@example.com");
    const { token: foreignToken } = await registerAndLogin("foreign@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${myToken}`)
      .send({ title: "My Post", url: "https://example.com", tags: ["my"] });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${foreignToken}`)
      .send({ title: "Foreign Post", url: "https://example.com", tags: ["foreign"] });

    const res = await request(app).get(`/api/resources`).query({ submittedBy: myUser.id })
    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].title).toBe("My Post");
  })

  it.each([7, 14, 30])(
    "filters posts based on reactions within a given time window (%i)",
    async (day) => {
      const { token: ownerToken } =
        await registerAndLogin("owner3@example.com");
      const { token: secondOwnerToken } =
        await registerAndLogin("owner2@example.com");
      const { token: thirdOwnerToken } =
        await registerAndLogin("owner1@example.com");
      const { token: firstOtherToken } =
        await registerAndLogin("other@example.com");
      const { token: oldReactionToken } =
        await registerAndLogin("other2@example.com");

      const createRes1 = await request(app)
        .post("/api/resources")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          title: "Docker in a month of lunches",
          url: "https://docker.example.com",
        });

      const createRes2 = await request(app)
        .post("/api/resources")
        .set("Authorization", `Bearer ${secondOwnerToken}`)
        .send({ title: "Learning Go", url: "https://go.example.com" });

      const boringRes = await request(app)
        .post("/api/resources")
        .set("Authorization", `Bearer ${thirdOwnerToken}`)
        .send({ title: "Boring Git", url: "https://git.example.com" });

      const resourceId1 = createRes1.body.resource.id;
      const resourceId2 = createRes2.body.resource.id;

      await request(app)
        .post(`/api/resources/${resourceId1}/reactions`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ emoji: "⭐" });

      await request(app)
        .post(`/api/resources/${resourceId1}/reactions`)
        .set("Authorization", `Bearer ${firstOtherToken}`)
        .send({ emoji: "⭐" });

      await request(app)
        .post(`/api/resources/${resourceId2}/reactions`)
        .set("Authorization", `Bearer ${secondOwnerToken}`)
        .send({ emoji: "👍" });

      const reactRes3 = await request(app)
        .post(`/api/resources/${resourceId1}/reactions`)
        .set("Authorization", `Bearer ${oldReactionToken}`)
        .send({ emoji: "⭐" });

      const backDatedReactionId = reactRes3.body.resource.reactions[0].id;

      const currentDay = new Date();
      const somePastDate = subDays(currentDay, day + 3);

      await prisma.reaction.update({
        where: { id: backDatedReactionId },
        data: { createdAt: somePastDate },
      });

      const res = await request(app).get(`/api/resources?days=${day}`);
      expect(res.status).toBe(200);
      expect(res.body.resources).toHaveLength(2);
      expect(res.body.resources[0].reactions).toHaveLength(2);
      expect(res.body.resources[1].reactions).toHaveLength(1);
      expect(res.body.resources[0].id).toBe(resourceId1);
      expect(res.body.resources[0]);
      expect(res.body.resources[1].id).toBe(resourceId2);
      expect(res.body.resources).not.toContain(boringRes);
    },
  );

  it("combines tag, submittedBy, and days filters together", async () => {
    const { token: myToken, user: myUser } = await registerAndLogin("combo-mine@example.com");
    const { token: foreignToken } = await registerAndLogin("combo-foreign@example.com");

    // my user: two "js"-tagged posts (no reactions) + one "rare"-tagged post (reactions below)
    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${myToken}`)
      .send({ title: "My JS Post 1", url: "https://example.com/mine-1", tags: ["js"] });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${myToken}`)
      .send({ title: "My JS Post 2", url: "https://example.com/mine-2", tags: ["js"] });

    const rareRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${myToken}`)
      .send({ title: "My Rare Post", url: "https://example.com/mine-rare", tags: ["rare"] });

    const rareResourceId = rareRes.body.resource.id;

    // foreign user: one overlapping "js" post + one overlapping "rare" post (with reactions)
    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${foreignToken}`)
      .send({ title: "Foreign JS Post", url: "https://example.com/foreign-js", tags: ["js"] });

    const foreignRareRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${foreignToken}`)
      .send({ title: "Foreign Rare Post", url: "https://example.com/foreign-rare", tags: ["rare"] });

    const foreignRareResourceId = foreignRareRes.body.resource.id;

    // react to my rare post 3 times, then backdate the earliest reaction outside the days window
    await request(app)
      .post(`/api/resources/${rareResourceId}/reactions`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({ emoji: "⭐" });

    await request(app)
      .post(`/api/resources/${rareResourceId}/reactions`)
      .set("Authorization", `Bearer ${foreignToken}`)
      .send({ emoji: "👍" });

    const thirdReactionRes = await request(app)
      .post(`/api/resources/${rareResourceId}/reactions`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({ emoji: "🔥" });

    const earliestReactionId = thirdReactionRes.body.resource.reactions[0].id;
    const outsideWindow = subDays(new Date(), 10);

    await prisma.reaction.update({
      where: { id: earliestReactionId },
      data: { createdAt: outsideWindow },
    });

    // react to the foreign rare post twice, well within the window — should still be excluded by submittedBy
    await request(app)
      .post(`/api/resources/${foreignRareResourceId}/reactions`)
      .set("Authorization", `Bearer ${foreignToken}`)
      .send({ emoji: "⭐" });

    await request(app)
      .post(`/api/resources/${foreignRareResourceId}/reactions`)
      .set("Authorization", `Bearer ${myToken}`)
      .send({ emoji: "👍" });

    const res = await request(app).get("/api/resources").query({
      tag: "rare",
      submittedBy: myUser.id,
      days: 7,
    });

    expect(res.status).toBe(200);
    expect(res.body.resources).toHaveLength(1);
    expect(res.body.resources[0].id).toBe(rareResourceId);
    expect(res.body.resources[0].title).toBe("My Rare Post");
    // 3 reactions posted, 1 backdated outside the window — only 2 should remain
    expect(res.body.resources[0].reactions).toHaveLength(2);
  });
});

describe("GET /api/resources/tag-counts", () => {
  it("returns tag counts sorted by count descending", async () => {
    const { token } = await registerAndLogin("tag-counts@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Resource 1",
        url: "https://example.com/1",
        tags: ["javascript", "react"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Resource 2",
        url: "https://example.com/2",
        tags: ["javascript", "css"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Resource 3",
        url: "https://example.com/3",
        tags: ["javascript", "react"],
      });

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Resource 4",
        url: "https://example.com/4",
        tags: ["css"],
      });

    const res = await request(app).get("/api/resources/tag-counts");

    expect(res.status).toBe(200);

    expect(res.body.tagCounts).toEqual({
      javascript: 3,
      css: 2,
      react: 2,
    });

    expect(Object.keys(res.body.tagCounts)).toEqual([
      "javascript",
      "css",
      "react",
    ]);
  });

  it("returns empty tag counts when there are no resources", async () => {
    const res = await request(app).get("/api/resources/tag-counts");

    expect(res.status).toBe(200);
    expect(res.body.tagCounts).toEqual({});
  });
});

describe("GET /api/resources/leaderboard", () => {
  it("returns an empty list when there are no resources", async () => {
    const res = await request(app).get("/api/resources/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toEqual([]);
  });

  it("ranks contributors by count descending, excluding zero-resource users", async () => {
    const alice = await registerAndLogin("alice@example.com");
    const bob = await registerAndLogin("bob@example.com");
    await registerAndLogin("carol@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "A1", url: "https://a1.example.com" });
    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ title: "A2", url: "https://a2.example.com" });
    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ title: "B1", url: "https://b1.example.com" });

    const res = await request(app).get("/api/resources/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body.leaderboard).toHaveLength(2);
    expect(res.body.leaderboard[0]).toMatchObject({
      user: { id: alice.user.id },
      count: 2,
    });
    expect(res.body.leaderboard[1]).toMatchObject({
      user: { id: bob.user.id },
      count: 1,
    });
  });
});

describe("POST /api/resources/:id/reactions rate limiting", () => {
  it("returns a 429 if too many requests are made", async () => {
    const user = await registerAndLogin("reactor@example.com");

    const resource = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        title: "MDN Docs",
        url: "https://developer.mozilla.org",
        tags: ["JS", " Beginner "],
      });

    const resourceId = resource.body.resource.id;
    const route = `/api/resources/${resourceId}/reactions`;

    const limit = 20;

    // to make sure the throttling works, make a bunch of requests until we get to the limit
    for (let i = 0; i < limit; i++) {
      await request(app)
        .post(route)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ emoji: `emoji-${i}` }) // each emoji is unique and handled in post route handler
        .expect(201);
    }

    // the (limit + 1)th request, should be throttled and return a 429
    const throttleRes = await request(app)
      .post(route)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ emoji: `emoji-${limit}` })
      .expect(429);

    // expect the error message to be something about too many requests
    expect(throttleRes.body.error).toBe(
      "Too many reactions requested, please try again later",
    );
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
    expect(deleteRes.body.error).toBe("You can only delete your own resources");
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
    const { token } = await registerAndLogin("missing-resource@example.com");

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

describe("POST /api/resources/:id/report", () => {
  it("it allows a user to flag a broken url", async () => {
    const { token } = await registerAndLogin("reporter@example.com");

    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Reportable", url: "https://example.com" });

    const resourceId = createRes.body.resource.id;

    const res = await request(app)
      .post(`/api/resources/${resourceId}/report`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.resource.reportCount).toBe(1);
  });
});

describe("GET /api/resources/random", () => {
  it("it gives a user a random resource", async () => {
    const { token } = await registerAndLogin("reporter@example.com");

    await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Reportable", url: "https://example.com" });

    const res = await request(app).get("/api/resources/random");

    expect(res.status).toBe(200);
    expect(res.body.resource).toBeDefined();
    expect(res.body.resource.id).toBeDefined();
    expect(res.body.resource.title).toBeDefined();
    expect(res.body.resource.url).toBeDefined();
  });

  it("empty catalog returns 404", async () => {
    const res = await request(app).get("/api/resources/random");

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/resources/:id", () => {
  it("allows the original submitter to edit their resource", async () => {
    const { token } = await registerAndLogin("editor@example.com");

    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Old Title", url: "https://example.com", tags: ["old"] });

    const resourceId = createRes.body.resource.id;

    const patchRes = await request(app)
      .patch(`/api/resources/${resourceId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New Title", tags: ["new"] });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.resource.title).toBe("New Title");
    expect(patchRes.body.resource.tags).toEqual(["new"]);
    expect(patchRes.body.resource.url).toBe("https://example.com");
  });

  it("rejects edits from a user who isn't the original submitter", async () => {
    const { token: ownerToken } = await registerAndLogin(
      "realowner@example.com",
    );
    const { token: otherToken } = await registerAndLogin(
      "intruder@example.com",
    );

    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Protected", url: "https://example.com" });

    const patchRes = await request(app)
      .patch(`/api/resources/${createRes.body.resource.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hijacked" });

    expect(patchRes.status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    const { token } = await registerAndLogin("owner4@example.com");
    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "NoAuthEdit", url: "https://example.com" });

    const res = await request(app)
      .patch(`/api/resources/${createRes.body.resource.id}`)
      .send({ title: "Should fail" });

    expect(res.status).toBe(401);
  });

  it("rejects an empty title", async () => {
    const { token } = await registerAndLogin("owner5@example.com");
    const createRes = await request(app)
      .post("/api/resources")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Valid", url: "https://example.com" });

    const res = await request(app)
      .patch(`/api/resources/${createRes.body.resource.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  it("404s for a nonexistent resource", async () => {
    const { token } = await registerAndLogin("owner6@example.com");

    const res = await request(app)
      .patch("/api/resources/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ghost" });

    expect(res.status).toBe(404);
  });
});
