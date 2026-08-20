import express, { Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = express.Router()

// PATCH  /api/users/:id/role
router.patch("/:id/role", requireAuth, async (req: Request, res: Response) => {

})
