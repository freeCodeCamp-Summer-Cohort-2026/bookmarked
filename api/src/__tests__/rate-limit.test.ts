import request from "supertest";
import { createApp } from "../app";
import { Application } from "express";

let app: Application;
beforeEach(() => {
  app = createApp();
});

describe("Resource rate limiter 30/minute", () => {
  test("app hits rate limiter when trying to access resources over 30 times in under a minute", async () => {
    // send the 30 hits and make sure they're all successful
    for (let i = 0; i < 30; i++) {
      const res = await request(app).get("/api/resources");
      expect(res.status).toBe(200); // all 30 should give successful 200
    }
    // should have 0 remaining requests at this response (last access before limiter activates)
    const failResponse = await request(app).get("/api/resources");
    expect(failResponse.headers["ratelimit-remaining"]).toBe("0");

    // ping one more time to make sure limiter is hit
    const limResponse = await request(app).get("/api/resources");
    expect(limResponse.status).toBe(429); // this one should fail
    expect(limResponse.body.error).toBe(
      "Too many requests to resources. Please try again later.",
    );
  });
});
