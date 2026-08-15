import express, { Request, Response } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { error } from "console";
import rateLimit from "express-rate-limit";

const router = express.Router();

const reactionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many reactions requested, please try again later",
  },
})

const resourceInclude = {
  submittedBy: { select: { id: true, displayName: true, email: true } },
  reactions: {
    include: { user: { select: { id: true, displayName: true, email: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

// GET /api/resources?tag=<tag>&submittedBy=<userId>
router.get("/", async (req: Request, res: Response) => {
  try {
    const { tag, submittedBy } = req.query;

    const resources = await prisma.resource.findMany({
      where: {
        ...(typeof tag === "string" ? { tags: { has: tag.trim().toLowerCase() } } : {}),
        ...(typeof submittedBy === "string" ? { submittedById: submittedBy } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: resourceInclude,
    });

    return res.json({ resources });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// GET /api/resources/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: resourceInclude,
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    return res.json({ resource });
  } catch (err) {
    return res.status(400).json({ error: "Invalid resource id" });
  }
});

// POST /api/resources
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, url, description, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "title is required and cannot be empty" });
    }

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "url is required and cannot be empty" });
    }

    const normalizedUrl = url.trim();

	  if (
		!normalizedUrl.startsWith("http://") &&
		!normalizedUrl.startsWith("https://")
	  ) {
		return res
			.status(400)
			.json({ error: "url must start with http:// or https://" });
	  }

    const normalizedTags: string[] = Array.isArray(tags)
      ? tags.map((tag: string) => tag.trim().toLowerCase()).filter(Boolean)
      : [];

    const resource = await prisma.resource.create({
      data: {
        submittedById: req.user!.id,
        title: title.trim(),
        url: normalizedUrl,
        description: description ? description.trim() : "",
        tags: normalizedTags,
      },
      include: resourceInclude,
    });
    req.app.get("io")?.emit("resource:created", resource);
    return res.status(201).json({ resource });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create resource" });
  }
});

// POST /api/resources/:id/reactions
router.post("/:id/reactions", requireAuth, reactionsLimiter, async (req: Request, res: Response) => {
  try {
    const { emoji } = req.body;

    if (!emoji || !emoji.trim()) {
      return res.status(400).json({ error: "emoji is required" });
    }

    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const alreadyReacted = await prisma.reaction.findUnique({
      where: {
        resourceId_userId_emoji: {
          resourceId: resource.id,
          userId: req.user!.id,
          emoji,
        },
      },
    });
    if (alreadyReacted) {
      return res.status(409).json({ error: "You already reacted with that emoji" });
    }

    await prisma.reaction.create({
      data: { emoji, resourceId: resource.id, userId: req.user!.id },
    });

    const updated = await prisma.resource.findUnique({
      where: { id: resource.id },
      include: resourceInclude,
    });
    req.app.get("io")?.emit("resource:updated", updated);
    return res.status(201).json({ resource: updated });
  } catch (err) {
    return res.status(400).json({ error: "Invalid resource id" });
  }
});


// PATCH /api/resources/:id
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (resource.submittedById !== req.user!.id) {
      return res.status(403).json({ error: "You can only edit your own resource" });
    }

    const { title, url, description, tags } = req.body;
    const data: { title?: string; url?: string; description?: string; tags?: string[] } = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: "title cannot be empty" });
      }
      data.title = title.trim();
    }

    if (url !== undefined) {
      const normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        return res.status(400).json({ error: "url must start with http:// or https://" });
      }
      data.url = normalizedUrl;
    }

    if (description !== undefined) {
      data.description = description ? description.trim() : "";
    }

    if (tags !== undefined) {
      data.tags = Array.isArray(tags)
        ? tags.map((tag: string) => tag.trim().toLowerCase()).filter(Boolean)
        : [];
    }

    const updated = await prisma.resource.update({
      where: { id: resource.id },
      data,
      include: resourceInclude,
    });

    req.app.get("io")?.emit("resource:updated", updated);
    return res.json({ resource: updated });
  } catch (err) {
    return res.status(400).json({ error: "Invalid resource id" });
  }
});


// DELETE /api/resources/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const isOwner = resource.submittedById === req.user!.id;
    const isModerator = req.user!.role === "moderator";

    if (!isOwner && !isModerator) {
      return res.status(403).json({ error: "You can only delete your own resources" });
    }

    await prisma.resource.delete({ where: { id: resource.id } });

    return res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete resource" });
  }
});

// DELETE /api/resources/:id/reactions/:reactionId
router.delete("/:id/reactions/:reactionId", requireAuth, async (req: Request, res: Response) => {
  try {
    const reaction = await prisma.reaction.findUnique({ where: { id: req.params.reactionId } });
    if (!reaction || reaction.resourceId !== req.params.id) {
      return res.status(404).json({ error: "Reaction not found" });
    }

    if (reaction.userId !== req.user!.id) {
      return res.status(403).json({ error: "You can only remove your own reactions" });
    }

    await prisma.reaction.delete({ where: { id: reaction.id } });

    const updated = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: resourceInclude,
    });

    if (!updated) {
      return res.status(404).json({ error: "Resource not found" });
    }

    req.app.get("io")?.emit("resource:updated", updated);
    return res.json({ resource: updated });
  } catch (err) {
    return res.status(400).json({ error: "Invalid resource or reaction id" });
  }
});

// POST /api/resources/:id/report
router.post("/:id/report", requireAuth, async (req: Request, res: Response)=>{
  try{

    
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const update = await prisma.resource.update({where : {
      id: resource.id
    },
  data: { reportCount: {increment: 1}},
  include: resourceInclude,
});

return res.status(200).json({ resource: update });

  }catch (err){
 return res.status(400).json({ error: "Invalid resource id" });
  }
})

export default router;
