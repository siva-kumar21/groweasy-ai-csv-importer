import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { importRouter } from "./routes/import.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", importRouter);

app.listen(port, () => {
  console.log(`GrowEasy importer API running on http://localhost:${port}`);
});
