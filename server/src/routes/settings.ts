import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

const profileSchema = z.object({
  name: z.string().max(50).nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Мінімум 6 символів"),
});

const deleteSchema = z.object({
  password: z.string().min(1),
});

router.patch("/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Невірні дані" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name: parsed.data.name },
    select: {
      id: true,
      email: true,
      name: true,
      onboardingCompleted: true,
      createdAt: true,
    },
  });

  res.json({ user });
});

router.patch("/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Невірні дані" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: "Користувача не знайдено" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Невірний поточний пароль" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  res.json({ success: true });
});

router.delete("/account", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = deleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Введіть пароль" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) {
    res.status(404).json({ error: "Користувача не знайдено" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Невірний пароль" });
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

router.post("/onboarding/complete", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { onboardingCompleted: true },
    select: {
      id: true,
      email: true,
      name: true,
      onboardingCompleted: true,
      createdAt: true,
    },
  });

  res.json({ user });
});

export default router;