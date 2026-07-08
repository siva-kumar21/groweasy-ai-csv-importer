"use client";

import Papa from "papaparse";
import { AlertCircle, CheckCircle2, Loader2, Moon, RefreshCw, Sun } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { FileDropzone } from "../components/FileDropzone";
import type { CsvRow, ImportResult } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<CsvRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);

  const previewColumns = useMemo(() => new Set(previewRows.flatMap((row) => Object.keys(row))).size, [previewRows]);

  function reset() {
    setFile(null);
    setPreviewRows([]);
    setResult(null);
    setError("");
  }

  function handleFile(selected: File) {
    setFile(selected);
    setResult(null);
    setError("");

    Papa.parse<CsvRow>(selected, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      transform: (value) => String(value ?? "").trim(),
      complete: (parsed) => {
        if (parsed.errors.length) {
          setPreviewRows([]);
          setError(parsed.errors[0]?.message || "Could not read this CSV.");
          return;
        }
        setPreviewRows(parsed.data.filter((row) => Object.values(row).some(Boolean)));
      },
      error: (parseError) => setError(parseError.message)
    });
  }

  async function confirmImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/import`, { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Import failed.");
      setResult(payload);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <div className="topbar">
        <div>
          <p className="eyebrow">GrowEasy CRM</p>
          <h1>AI CSV Importer</h1>
        </div>
        <button className="iconButton" type="button" onClick={() => setDark((value) => !value)} title="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="workspace">
        <aside className="panel sidePanel">
          <FileDropzone file={file} onFile={handleFile} />
          <div className="statsGrid">
            <div>
              <span>Rows</span>
              <strong>{previewRows.length}</strong>
            </div>
            <div>
              <span>Columns</span>
              <strong>{previewColumns}</strong>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="secondaryButton" onClick={reset} disabled={!file || loading}>
              <RefreshCw size={16} />
              Reset
            </button>
            <button type="button" className="primaryButton" onClick={confirmImport} disabled={!file || !previewRows.length || loading}>
              {loading ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
              {loading ? "Processing" : "Confirm Import"}
            </button>
          </div>
          {loading && (
            <div className="progress">
              <div />
            </div>
          )}
          {error && (
            <div className="notice error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {result?.warnings.map((warning) => (
            <div className="notice" key={warning}>
              <AlertCircle size={18} />
              <span>{warning}</span>
            </div>
          ))}
        </aside>

        <section className="contentStack">
          <section className="panel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2>Preview uploaded rows</h2>
              </div>
              <span>{previewRows.length ? `${previewRows.length} rows` : "Waiting for CSV"}</span>
            </div>
            <DataTable rows={previewRows.slice(0, 200)} emptyText="Upload a CSV to preview records before AI processing." />
          </section>

          {result && (
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <p className="eyebrow">Step 4</p>
                  <h2>Parsed CRM records</h2>
                </div>
                <div className="resultPills">
                  <span>{result.totalImported} imported</span>
                  <span>{result.totalSkipped} skipped</span>
                </div>
              </div>
              <DataTable rows={result.records as unknown as Record<string, unknown>[]} emptyText="No CRM records were imported." />
              {result.skipped.length > 0 && (
                <div className="skippedBlock">
                  <h3>Skipped records</h3>
                  <DataTable
                    rows={result.skipped.map((item) => ({
                      rowNumber: item.rowNumber,
                      reason: item.reason,
                      original: JSON.stringify(item.original)
                    }))}
                    emptyText="No skipped rows."
                    maxHeight={220}
                  />
                </div>
              )}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
