import { Router } from "express";
import multer from "multer";
import { extractCrmRecords } from "../services/aiMapper.js";
import { parseCsv } from "../utils/csv.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

export const importRouter = Router();

importRouter.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required." });

    const rows = parseCsv(req.file.buffer);
    const result = await extractCrmRecords(rows);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import CSV.";
    return res.status(400).json({ message });
  }
});
