import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../db";

const router = Router();

// POST /api/collections
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: req.user!.id,
      },
    });

    return res.status(201).json({ collection });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        error: "A collection with this name already exists for this user",
      });
    }

    console.error(err);
    return res.status(500).json({ error: "Failed to create collection" });
  }
});

// GET /api/collections
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: { select: { resources: true } }, // useful for UI
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({ collections });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch collections" });
  }
});

// GET /api/collections/:id
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const collection = await prisma.collection.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        resources: {
          include: {
            submittedBy: {
              select: { id: true, displayName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }

    return res.json({ collection });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch collection" });
  }
});

// POST /api/collections/:id/resources  ← add resource(s)
router.post(
  "/:id/resources",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { resourceIds } = req.body; // expect string[] or single string

      const ids: string[] = Array.isArray(resourceIds)
        ? resourceIds
        : resourceIds
          ? [resourceIds]
          : [];

      if (ids.length === 0) {
        return res.status(400).json({ error: "resourceIds is required" });
      }

      // Verify ownership
      const collection = await prisma.collection.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });

      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const updated = await prisma.collection.update({
        where: { id: collection.id },
        data: {
          resources: {
            connect: ids.map((id) => ({ id })),
          },
        },
        include: {
          resources: true,
        },
      });

      return res.json({ collection: updated });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Failed to add resources to collection" });
    }
  },
);

// DELETE /api/collections/:id/resources/:resourceId  ← remove one resource
router.delete(
  "/:id/resources/:resourceId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const collection = await prisma.collection.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
      });

      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const updated = await prisma.collection.update({
        where: { id: collection.id },
        data: {
          resources: {
            disconnect: { id: req.params.resourceId },
          },
        },
        include: { resources: true },
      });

      return res.json({ collection: updated });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to remove resource from collection" });
    }
  },
);

// PATCH /api/collections/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const existing = await prisma.collection.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Collection not found" });
    }

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }

    const collection = await prisma.collection.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
  });

    return res.json({ collection });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        error: "A collection with this name already exists for this user",
      });
    }

    return res.status(500).json({ error: "Failed to update collection" });
  }
});

// DELETE /api/collections/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.collection.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Collection not found" });
    }

    await prisma.collection.delete({ where: { id: existing.id } });

    return res.json({ message: "Collection deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete collection" });
  }
});

export default router;
