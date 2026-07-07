import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  COOKIE_NAME,
  getCookieOptions,
  signToken,
} from "../lib/auth.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email("Невірний email"),
  password: z.string().min(6, "Мінімум 6 символів"),
  name: z.string().min(1).max(50).optional(),
});

router.post("/register", async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email вже зайнятий" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      onboardingCompleted: false,
    },
  });

  const token = signToken({ userId: user.id, email: user.email });
  res.cookie(COOKIE_NAME, token, getCookieOptions());
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: user.onboardingCompleted,
      watchGoal: user.watchGoal,
    },
  });
});

router.post("/login", async (req, res) => {
  const parsed = credentialsSchema.omit({ name: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Невірний email або пароль" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.cookie(COOKIE_NAME, token, getCookieOptions());
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: user.onboardingCompleted,
      watchGoal: user.watchGoal,
    },
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      onboardingCompleted: true,
      watchGoal: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "Користувача не знайдено" });
    return;
  }

  res.json({ user });
});

export default router;