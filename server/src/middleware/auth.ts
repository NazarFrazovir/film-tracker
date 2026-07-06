import type { NextFunction, Request, Response } from "express";
import { getTokenFromRequest, verifyToken } from "../lib/auth.js";

export interface AuthedRequest extends Request {
  user?: { userId: string; email: string };
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Увійдіть в акаунт" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Сесія закінчилась" });
    return;
  }

  req.user = payload;
  next();
}

export function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = getTokenFromRequest(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}