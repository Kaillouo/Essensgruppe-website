import { Router, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import prisma from '../utils/prisma.util';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.middleware';
import { uploadEventPhoto } from '../middleware/upload.middleware';
import { AuthRequest } from '../types';

const router = Router();

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  date: z.string().datetime().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  budget: z.number().positive().optional().nullable(),
});

const voteSchema = z.object({
  value: z.literal(1).or(z.literal(-1)),
});

const statusSchema = z.object({
  status: z.enum(['PROPOSED', 'IN_PLANNING', 'COMPLETED']),
});

// GET /api/events — list all events (public, optional auth for userVote)
router.get('/', optionalAuth as any, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: [{ status: 'asc' }, { votes: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        eventVotes: {
          where: { userId: req.user?.id ?? 'none' },
          select: { value: true },
        },
        photos: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, imageUrl: true, userId: true, createdAt: true },
        },
      },
    });

    const mapped = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      location: e.location,
      budget: e.budget,
      status: e.status,
      votes: e.votes,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      user: e.user,
      userVote: e.eventVotes[0]?.value ?? 0,
      photos: e.photos,
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events — create event proposal
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        userId: req.user!.id,
        title: data.title,
        description: data.description,
        date: data.date ? new Date(data.date) : null,
        location: data.location ?? null,
        budget: data.budget ?? null,
        status: 'PROPOSED',
        votes: 0,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    res.status(201).json({ ...event, userVote: 0, photos: [] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// POST /api/events/:id/vote — vote on an event proposal
router.post('/:id/vote', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { value } = voteSchema.parse(req.body);
    const userId = req.user!.id;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'PROPOSED') {
      return res.status(400).json({ error: 'Can only vote on proposed events' });
    }

    const existing = await prisma.eventVote.findUnique({
      where: { userId_eventId: { userId, eventId: id } },
    });

    let voteDelta = 0;
    let newUserVote = 0;

    if (existing) {
      if (existing.value === value) {
        // Toggle off
        await prisma.eventVote.delete({ where: { userId_eventId: { userId, eventId: id } } });
        voteDelta = -value;
        newUserVote = 0;
      } else {
        // Switch vote
        await prisma.eventVote.update({
          where: { userId_eventId: { userId, eventId: id } },
          data: { value },
        });
        voteDelta = value * 2;
        newUserVote = value;
      }
    } else {
      await prisma.eventVote.create({ data: { userId, eventId: id, value } });
      voteDelta = value;
      newUserVote = value;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { votes: { increment: voteDelta } },
      select: { votes: true },
    });

    res.json({ votes: updated.votes, userVote: newUserVote });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/events/:id/photos — upload a photo to an event
router.post('/:id/photos', authenticateToken as any, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  uploadEventPhoto(req as any, res as any, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Event not found' });
      }

      // Resize with sharp (max 1200px wide, quality 85)
      const inputPath = req.file.path;
      const outputPath = inputPath; // overwrite in-place
      await sharp(inputPath)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
        .then(buf => fs.writeFileSync(outputPath, buf));

      const imageUrl = `/uploads/events/${req.file.filename}`;

      const photo = await prisma.eventPhoto.create({
        data: {
          eventId: id,
          userId: req.user!.id,
          imageUrl,
        },
        select: { id: true, imageUrl: true, userId: true, createdAt: true },
      });

      res.status(201).json(photo);
    } catch (dbErr) {
      console.error(dbErr);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ error: 'Failed to save photo' });
    }
  });
});

// DELETE /api/events/:id/photos/:photoId — uploader or admin can delete
router.delete('/:id/photos/:photoId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id, photoId } = req.params;

    const photo = await prisma.eventPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.eventId !== id) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const isAdmin = req.user!.role === 'ADMIN';
    if (!isAdmin && photo.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.eventPhoto.delete({ where: { id: photoId } });

    // Remove file from disk
    const filePath = path.join(__dirname, '..', '..', photo.imageUrl);
    try { fs.unlinkSync(filePath); } catch {}

    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// PATCH /api/events/:id/status — admin: move event between statuses
router.patch('/:id/status', requireAdmin as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = statusSchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const updated = await prisma.event.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/events/:id — creator or admin can delete
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const isAdmin = req.user!.role === 'ADMIN';
    if (!isAdmin && event.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.event.delete({ where: { id } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
