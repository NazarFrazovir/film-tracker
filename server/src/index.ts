import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import moviesRoutes from "./routes/movies.js";
import collectionsRoutes from "./routes/collections.js";
import statsRoutes from "./routes/stats.js";
import listsRoutes from "./routes/lists.js";
import tagsRoutes from "./routes/tags.js";
import dataRoutes from "./routes/data.js";
import settingsRoutes from "./routes/settings.js";
import profileRoutes from "./routes/profile.js";
import tvRoutes from "./routes/tv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

function resolveClientUrl(): string {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  return "http://localhost:5173";
}

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientUrl = resolveClientUrl();

if (isProd) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", moviesRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/lists", listsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tv", tvRoutes);

if (isProd) {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(port, () => {
  console.log(
    isProd
      ? `Film Tracker: ${clientUrl}`
      : `Film Tracker API: http://localhost:${port}`,
  );
});