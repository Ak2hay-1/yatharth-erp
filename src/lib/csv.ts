/** Build CSV with Excel-friendly BOM and proper escaping. */

export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function csvResponse(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const body = rowsToCsv(headers, rows);
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function exportStamp(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
