import Papa from "papaparse";
import type { RawRecord } from "../types/crm.js";

export function parseCsv(buffer: Buffer): RawRecord[] {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const parsed = Papa.parse<RawRecord>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => String(value ?? "").trim()
  });

  if (parsed.errors.length) {
    const first = parsed.errors[0];
    throw new Error(`CSV parse error on row ${first.row ?? "unknown"}: ${first.message}`);
  }

  return parsed.data.filter((row) => Object.values(row).some(Boolean));
}
