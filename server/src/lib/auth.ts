import jwt from "jsonwebtoken";
import type { Request } from "express";

const COOKIE_NAME = "film_tracker_token";

export interface AuthPayload {
  userId: string;
  email: string;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (typeof cookie === "string") return cookie;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return null;
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export { COOKIE_NAME };