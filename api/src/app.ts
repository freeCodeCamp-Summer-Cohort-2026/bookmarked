import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import resourcesRoutes from "./routes/resources";

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Basic rate limit on write-heavy endpoints so one participant's script
  // can't accidentally hammer the shared demo instance.
  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", writeLimiter, authRoutes);
  app.use("/api/resources", resourcesRoutes);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
