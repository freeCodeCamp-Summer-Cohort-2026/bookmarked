import "dotenv/config";
import { createServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { createApp } from "./app";
import { prisma } from "./db";

const PORT = process.env.PORT || 4100;

async function main() {
  await prisma.$connect();
  console.log("Connected to Postgres");

  const app = createApp();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
        sub: string;
        email: string;
      };
      socket.data.user = payload.sub;
      next();
    } catch (err) {
      next(new Error("Invalid token. Unauthorized"));
    }
  });

  app.set("io", io);

  httpServer.listen(PORT, () => {
    console.log(`Bookmarked API listening on port http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
