import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { hashPassword, comparePassword } from "../utils/password";
import { UserRole } from "@prisma/client";

const router = express.Router();

function signToken(user: {
  id: string;
  email: string;
  role: UserRole;
}): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "7d",
    },
  );
}

function toPublicUser(user: {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res
        .status(400)
        .json({ error: "email, password, and displayName are all required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "password must be at least 8 characters long" });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with that email already exists" });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, displayName, passwordHash },
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to register user" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    return res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to log in" });
  }
});

export default router;
