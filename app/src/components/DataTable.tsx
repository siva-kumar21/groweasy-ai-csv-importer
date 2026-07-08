"use client";

type DataTableProps<T extends Record<string, unknown>> = {
  rows: T[];
  emptyText: string;
  maxHeight?: number;
};

export function DataTable<T extends Record<string, unknown>>({ rows, emptyText, maxHeight = 420 }: DataTableProps<T>) {
  const columns = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  if (!rows.length) {
    return <div className="emptyState">{emptyText}</div>;
  }

  return (
    <div className="tableShell" style={{ maxHeight }}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{String(row[column] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
