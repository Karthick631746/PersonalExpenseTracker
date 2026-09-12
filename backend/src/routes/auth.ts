import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/index.js';
import { AuthRequest, auth } from '../middleware/auth.js';
import { seedDefaultCategories } from '../utils/categories.js';

const r = Router();

const sign = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

const cookie = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 86_400_000,
};

// Register
r.post('/register', async (req, res) => {
  try {
    const b = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(req.body);

    if (await User.findOne({ email: b.email.toLowerCase() }))
      return res.status(409).json({ message: 'Email already registered' });

    const u = await User.create({
      name: b.name,
      email: b.email,
      passwordHash: await bcrypt.hash(b.password, 12),
    });

    // Seed default categories for new user (non-blocking, errors logged)
    seedDefaultCategories(u._id as any).catch((err) =>
      console.error('Category seed error:', err)
    );

    const token = sign(String(u._id));
    res.cookie('token', token, cookie);
    res.status(201).json({ token, id: u._id, name: u.name, email: u.email, currency: u.currency });
  } catch (e: any) {
    if (e?.name === 'ZodError')
      return res.status(400).json({ message: 'Invalid registration data', errors: e.errors });
    res.status(400).json({ message: 'Registration failed' });
  }
});

// Login
r.post('/login', async (req, res) => {
  const b = z
    .object({ email: z.string().email(), password: z.string() })
    .safeParse(req.body);

  if (!b.success) return res.status(400).json({ message: 'Invalid credentials' });

  const u = await User.findOne({ email: b.data.email.toLowerCase() });
  if (!u || !(await bcrypt.compare(b.data.password, u.passwordHash)))
    return res.status(401).json({ message: 'Invalid login credentials' });

  const token = sign(String(u._id));
  res.cookie('token', token, cookie);
  res.json({ token, id: u._id, name: u.name, email: u.email, currency: u.currency });
});

// Logout
r.post('/logout', (_, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// Get current user
r.get('/me', auth, async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
  const u = await User.findById(req.userId).select('-passwordHash');
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json(u);
});

// Update profile
r.put('/me', auth, async (req: AuthRequest, res) => {
  try {
    const b = z
      .object({
        name: z.string().min(2).optional(),
        currency: z.string().optional(),
      })
      .parse(req.body);

    const u = await User.findByIdAndUpdate(req.userId, b, { new: true }).select('-passwordHash');
    res.json(u);
  } catch (e) {
    res.status(400).json({ message: 'Invalid data' });
  }
});

// Change password
r.put('/me/password', auth, async (req: AuthRequest, res) => {
  try {
    const b = z
      .object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      })
      .parse(req.body);

    const u = await User.findById(req.userId);
    if (!u) return res.status(404).json({ message: 'User not found' });

    if (!(await bcrypt.compare(b.currentPassword, u.passwordHash)))
      return res.status(401).json({ message: 'Current password incorrect' });

    u.passwordHash = await bcrypt.hash(b.newPassword, 12);
    await u.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: 'Invalid data' });
  }
});

// Seed default categories for existing users (idempotent)
r.post('/seed-categories', auth, async (req: AuthRequest, res) => {
  try {
    await seedDefaultCategories(req.userId as any);
    res.json({ ok: true, message: 'Default categories seeded' });
  } catch (e) {
    res.status(500).json({ message: 'Seeding failed' });
  }
});

export default r;
