export type AmountUnit = "auto" | "cents" | "dollars";

export type InvoicePayload = unknown;

export type DetailRow = {
  projectId: string;
  projectName: string;
  projectLabel: string;
  month: string;
  amount: number;
  source: "line_item" | "invoice";
};

export type SummaryRow = {
  projectId: string;
  projectName: string;
  projectLabel: string;
  month: string;
  totalAmount: number;
  rowCount: number;
};

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return !!v && typeof v === "object";
}

function pick(obj: unknown, keys: string[], defaultValue: unknown = undefined) {
  if (!isObj(obj)) return defaultValue;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return defaultValue;
}

function toMonth(value: unknown) {
  if (!value) return "unknown-month";
  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return "unknown-month";
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function normalizeAmount(value: unknown, amountUnit: AmountUnit) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  if (amountUnit === "cents") return Number.isInteger(n) ? n / 100 : n;
  if (amountUnit === "dollars") return n;
  if (Number.isInteger(n) && Math.abs(n) >= 1000) return n / 100;
  return n;
}

function getProjectFromMetadata(metadata: unknown) {
  if (!isObj(metadata)) return undefined;
  return pick(metadata, [
    "subscription_name",
    "project",
    "project_id",
    "projectId",
    "sanity_project",
    "sanity_project_id",
  ]);
}

function splitProjectLabel(label: unknown) {
  const text = String(label || "").trim();
  const match = text.match(/^(.*)\(([^()]+)\)\s*$/);
  if (!match) return { projectName: text || "unknown-project", projectId: "" };
  return { projectName: match[1].trim(), projectId: match[2].trim() };
}

export function extractInvoices(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!isObj(payload)) return [];
  const maybe = pick(payload, ["data", "invoices", "results", "items"], []);
  return Array.isArray(maybe) ? maybe : [];
}

export function extractInvoiceRows(invoice: unknown, amountUnit: AmountUnit): DetailRow[] {
  const invoiceMonth = toMonth(
    pick(invoice, [
      "invoice_date",
      "issued_at",
      "created_at",
      "period_start",
      "invoice_period_start_date",
      "start_date",
    ])
  );

  const invoiceProject =
    pick(invoice, ["subscription_name", "project", "project_id", "projectId"]) ||
    getProjectFromMetadata(isObj(invoice) ? invoice["metadata"] : undefined) ||
    getProjectFromMetadata(isObj(invoice) && isObj(invoice["customer"]) ? (invoice["customer"] as Obj)["metadata"] : undefined) ||
    pick(isObj(invoice) ? invoice["customer"] : undefined, ["external_customer_id", "id"]) ||
    "unknown-project";

  const invoiceProjectParts = splitProjectLabel(invoiceProject);

  const lineItems = pick(invoice, ["line_items", "lineItems"], []);
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    const rows: DetailRow[] = [];
    for (const line of lineItems) {
      const lineProject =
        pick(line, ["subscription_name", "project", "project_id", "projectId"]) ||
        getProjectFromMetadata(isObj(line) ? line["metadata"] : undefined) ||
        invoiceProject;
      const parts = splitProjectLabel(lineProject);
      const amount = normalizeAmount(
        pick(line, ["amount", "total", "subtotal", "invoice_amount", "cost"], 0),
        amountUnit
      );
      rows.push({
        projectId: parts.projectId || String(lineProject || "unknown-project"),
        projectName: parts.projectName || String(lineProject || "unknown-project"),
        projectLabel: String(lineProject || "unknown-project"),
        month: invoiceMonth,
        amount,
        source: "line_item",
      });
    }
    return rows;
  }

  const invoiceAmount = normalizeAmount(
    pick(invoice, ["amount_due", "total", "subtotal", "amount", "invoice_total"], 0),
    amountUnit
  );

  return [
    {
      projectId: invoiceProjectParts.projectId || String(invoiceProject),
      projectName: invoiceProjectParts.projectName || String(invoiceProject),
      projectLabel: String(invoiceProject),
      month: invoiceMonth,
      amount: invoiceAmount,
      source: "invoice",
    },
  ];
}

export function aggregateByProjectMonth(rows: DetailRow[]): SummaryRow[] {
  const map = new Map<string, SummaryRow>();
  for (const row of rows) {
    const key = `${row.projectId}__${row.month}`;
    const current = map.get(key) || {
      projectId: row.projectId,
      projectName: row.projectName,
      projectLabel: row.projectLabel,
      month: row.month,
      totalAmount: 0,
      rowCount: 0,
    };
    current.totalAmount += row.amount;
    current.rowCount += 1;
    map.set(key, current);
  }
  return Array.from(map.values()).map((r) => ({
    ...r,
    totalAmount: Number(r.totalAmount.toFixed(2)),
  }));
}

export function buildPivotByProjectId(summaryRows: SummaryRow[]) {
  const months = Array.from(new Set(summaryRows.map((r) => r.month))).sort();
  const byProjectId = new Map<
    string,
    { projectId: string; projectName: string; monthCosts: Record<string, number>; total: number }
  >();

  for (const row of summaryRows) {
    const key = row.projectId || "unknown-project";
    const current = byProjectId.get(key) || {
      projectId: key,
      projectName: row.projectName || key,
      monthCosts: {},
      total: 0,
    };
    current.monthCosts[row.month] = (current.monthCosts[row.month] || 0) + (row.totalAmount || 0);
    current.total += row.totalAmount || 0;
    byProjectId.set(key, current);
  }

  const outRows: Record<string, string>[] = [];
  for (const project of byProjectId.values()) {
    const out: Record<string, string> = {
      projectId: project.projectId,
      projectName: project.projectName,
    };
    for (const month of months) out[month] = (project.monthCosts[month] || 0).toFixed(2);
    out.total = project.total.toFixed(2);
    outRows.push(out);
  }
  outRows.sort((a, b) => String(a.projectId).localeCompare(String(b.projectId)));
  return outRows;
}

export function applySanityProjectMap(
  rows: Array<{ projectId: string; projectName: string }>,
  map: Record<string, string>
) {
  for (const row of rows) {
    const mapped = map[row.projectId];
    if (mapped) row.projectName = mapped;
  }
}

