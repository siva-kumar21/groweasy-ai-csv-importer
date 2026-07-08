import { z } from "zod";
import { CRM_STATUSES, DATA_SOURCES, type CrmRecord, type ImportResult, type RawRecord, type SkippedRecord } from "../types/crm.js";
import { mapRecordsLocally } from "./localMapper.js";

const crmRecordSchema = z.object({
  created_at: z.string().default(""),
  name: z.string().default(""),
  email: z.string().default(""),
  country_code: z.string().default(""),
  mobile_without_country_code: z.string().default(""),
  company: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default(""),
  lead_owner: z.string().default(""),
  crm_status: z.enum(["", ...CRM_STATUSES]).default(""),
  crm_note: z.string().default(""),
  data_source: z.enum(["", ...DATA_SOURCES]).default(""),
  possession_time: z.string().default(""),
  description: z.string().default("")
});

const aiResponseSchema = z.object({
  records: z.array(crmRecordSchema),
  skipped: z.array(z.object({ rowIndex: z.number(), reason: z.string() })).default([])
});

const BATCH_SIZE = 25;

function sanitize(record: CrmRecord): CrmRecord {
  const created = record.created_at ? new Date(record.created_at) : null;
  return {
    ...record,
    created_at: created && !Number.isNaN(created.getTime()) ? created.toISOString() : "",
    crm_note: record.crm_note.replace(/\r?\n/g, "\\n"),
    description: record.description.replace(/\r?\n/g, "\\n")
  };
}

async function mapBatchWithOpenAI(batch: RawRecord[], offset: number) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "Extract GrowEasy CRM lead records from messy CSV rows.",
          "Return JSON with records and skipped arrays only.",
          `crm_status must be one of: ${CRM_STATUSES.join(", ")} or blank.`,
          `data_source must be one of: ${DATA_SOURCES.join(", ")} or blank.`,
          "Skip rows that contain neither email nor mobile number.",
          "Use the first email/mobile; put extra emails, extra phones, remarks, and useful leftovers into crm_note.",
          "created_at must be parseable by JavaScript new Date(created_at).",
          "Do not introduce raw line breaks inside values; use \\n when needed."
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({ startRowNumber: offset + 2, rows: batch })
      }
    ]
  });

  const content = response.choices[0]?.message.content ?? "{}";
  return aiResponseSchema.parse(JSON.parse(content));
}

export async function extractCrmRecords(rows: RawRecord[]): Promise<ImportResult> {
  if (!process.env.OPENAI_API_KEY) return mapRecordsLocally(rows);

  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  const warnings: string[] = [];

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    try {
      const result = await mapBatchWithOpenAI(batch, offset);
      records.push(...result.records.map(sanitize));
      skipped.push(
        ...result.skipped.map((item) => ({
          rowNumber: offset + item.rowIndex + 2,
          reason: item.reason,
          original: rows[offset + item.rowIndex] ?? {}
        }))
      );
    } catch (error) {
      const fallback = mapRecordsLocally(batch);
      warnings.push(`AI batch ${Math.floor(offset / BATCH_SIZE) + 1} failed; used local extraction fallback.`);
      records.push(...fallback.records);
      skipped.push(...fallback.skipped.map((item) => ({ ...item, rowNumber: item.rowNumber + offset })));
    }
  }

  return { records, skipped, totalImported: records.length, totalSkipped: skipped.length, warnings };
}
