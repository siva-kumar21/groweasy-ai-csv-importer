import { CRM_STATUSES, DATA_SOURCES, type CrmRecord, type DataSource, type RawRecord, type SkippedRecord } from "../types/crm.js";

const FIELD_ALIASES: Record<keyof Omit<CrmRecord, "crm_note" | "crm_status" | "data_source">, string[]> = {
  created_at: ["created", "created at", "date", "lead date", "submission time", "timestamp", "time"],
  name: ["name", "full name", "lead name", "customer", "client", "contact name"],
  email: ["email", "e-mail", "mail", "primary email"],
  country_code: ["country code", "dial code", "isd", "phone code"],
  mobile_without_country_code: ["phone", "mobile", "whatsapp", "contact", "telephone", "number"],
  company: ["company", "organisation", "organization", "business", "firm"],
  city: ["city", "location city", "town"],
  state: ["state", "province", "region"],
  country: ["country", "nation"],
  lead_owner: ["owner", "lead owner", "agent", "assignee", "sales rep"],
  possession_time: ["possession", "possession time", "move in", "handover"],
  description: ["description", "requirement", "message", "query", "interest"]
};

const NOTE_KEYS = ["note", "remark", "comment", "follow", "feedback", "extra", "message"];
const PHONE_KEYS = ["phone", "mobile", "whatsapp", "contact", "telephone", "number", "call"];
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+\d{1,3}[\s-]?)?(?:\d[\s().-]?){7,14}\d/g;

const emptyRecord = (): CrmRecord => ({
  created_at: "",
  name: "",
  email: "",
  country_code: "",
  mobile_without_country_code: "",
  company: "",
  city: "",
  state: "",
  country: "",
  lead_owner: "",
  crm_status: "",
  crm_note: "",
  data_source: "",
  possession_time: "",
  description: ""
});

const normalize = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
const digitsOnly = (value: string) => value.replace(/\D/g, "");

function findByAlias(row: RawRecord, aliases: string[]) {
  const entries = Object.entries(row);
  const direct = entries.find(([key]) => aliases.includes(normalize(key)));
  if (direct?.[1]) return direct[1];
  const fuzzy = entries.find(([key]) => aliases.some((alias) => normalize(key).includes(alias)));
  return fuzzy?.[1] ?? "";
}

function splitPhones(text: string) {
  return [...text.matchAll(PHONE_RE)]
    .map((match) => match[0])
    .map((phone) => phone.trim())
    .filter((phone) => digitsOnly(phone).length >= 8);
}

function normalizePhone(rawPhone: string, row: RawRecord) {
  const explicitCountry = findByAlias(row, FIELD_ALIASES.country_code).match(/\+?\d{1,3}/)?.[0] ?? "";
  const cleaned = rawPhone.trim();
  const hasPlus = cleaned.startsWith("+");
  const digits = digitsOnly(cleaned);

  if (explicitCountry) {
    return {
      country_code: explicitCountry.startsWith("+") ? explicitCountry : `+${explicitCountry}`,
      mobile_without_country_code: digits.replace(new RegExp(`^${digitsOnly(explicitCountry)}`), "")
    };
  }

  if (hasPlus && digits.length > 10) {
    return {
      country_code: `+${digits.slice(0, digits.length - 10)}`,
      mobile_without_country_code: digits.slice(-10)
    };
  }

  return { country_code: "", mobile_without_country_code: digits };
}

function inferStatus(text: string): CrmRecord["crm_status"] {
  const value = normalize(text);
  if (/sale|sold|won|closed|converted|booked/.test(value)) return "SALE_DONE";
  if (/bad|junk|invalid|not interested|wrong|spam|lost/.test(value)) return "BAD_LEAD";
  if (/did not|didn't|no response|unreachable|busy|not connect|call later/.test(value)) return "DID_NOT_CONNECT";
  if (/good|follow|hot|warm|interested|callback|demo|qualified/.test(value)) return "GOOD_LEAD_FOLLOW_UP";
  return "";
}

function inferSource(text: string): DataSource {
  const value = normalize(text);
  return DATA_SOURCES.find((source) => value.includes(source.replace(/_/g, " "))) ?? "";
}

function normalizeDate(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function mapRecordsLocally(rows: RawRecord[]) {
  const records: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  rows.forEach((row, index) => {
    const record = emptyRecord();
    const allText = Object.values(row).join(" ");
    const allEmails = [...allText.matchAll(EMAIL_RE)].map((match) => match[0]);
    const aliasPhone = findByAlias(row, FIELD_ALIASES.mobile_without_country_code);
    const phoneCandidateText = Object.entries(row)
      .filter(([key, value]) => PHONE_KEYS.some((phoneKey) => normalize(key).includes(phoneKey)) || /\+\d{1,3}/.test(value))
      .map(([, value]) => value)
      .join(" ");
    const allPhones = splitPhones([aliasPhone, phoneCandidateText].filter(Boolean).join(" "));

    record.created_at = normalizeDate(findByAlias(row, FIELD_ALIASES.created_at));
    record.name = findByAlias(row, FIELD_ALIASES.name);
    record.email = findByAlias(row, FIELD_ALIASES.email).match(EMAIL_RE)?.[0] ?? allEmails[0] ?? "";
    record.company = findByAlias(row, FIELD_ALIASES.company);
    record.city = findByAlias(row, FIELD_ALIASES.city);
    record.state = findByAlias(row, FIELD_ALIASES.state);
    record.country = findByAlias(row, FIELD_ALIASES.country);
    record.lead_owner = findByAlias(row, FIELD_ALIASES.lead_owner);
    record.possession_time = findByAlias(row, FIELD_ALIASES.possession_time);
    record.description = findByAlias(row, FIELD_ALIASES.description);
    record.crm_status = inferStatus(allText);
    record.data_source = inferSource(allText);

    const primaryPhone = splitPhones(findByAlias(row, FIELD_ALIASES.mobile_without_country_code))[0] || allPhones[0] || "";
    const phone = normalizePhone(primaryPhone, row);
    record.country_code = phone.country_code;
    record.mobile_without_country_code = phone.mobile_without_country_code;

    const noteParts = Object.entries(row)
      .filter(([key, value]) => value && NOTE_KEYS.some((noteKey) => normalize(key).includes(noteKey)))
      .map(([key, value]) => `${key}: ${value}`);

    allEmails.filter((email) => email !== record.email).forEach((email) => noteParts.push(`Extra email: ${email}`));
    allPhones
      .map((phoneValue) => normalizePhone(phoneValue, row).mobile_without_country_code)
      .filter((phoneValue, phoneIndex, list) => phoneValue && phoneValue !== record.mobile_without_country_code && list.indexOf(phoneValue) === phoneIndex)
      .forEach((phoneValue) => noteParts.push(`Extra mobile: ${phoneValue}`));

    record.crm_note = noteParts.join("; ").replace(/\r?\n/g, "\\n");

    if (!record.email && !record.mobile_without_country_code) {
      skipped.push({ rowNumber: index + 2, reason: "Missing email and mobile number", original: row });
      return;
    }

    if (!CRM_STATUSES.includes(record.crm_status as never)) record.crm_status = "";
    records.push(record);
  });

  return {
    records,
    skipped,
    totalImported: records.length,
    totalSkipped: skipped.length,
    warnings: ["Used local heuristic extraction. Add OPENAI_API_KEY for LLM extraction."]
  };
}
