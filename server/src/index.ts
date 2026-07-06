import "dotenv/config";
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

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";

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

app.listen(port, () => {
  console.log(`Film Tracker API: http://localhost:${port}`);
});