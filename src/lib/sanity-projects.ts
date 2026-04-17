export async function fetchSanityProjectsMap(opts: { token: string; log?: (line: string) => void }) {
  const { token, log } = opts;
  if (!token) return {};

  const res = await fetch("https://api.sanity.io/v2021-06-07/projects", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Sanity projects API failed (${res.status})`);
  }

  const payload: unknown = await res.json();
  const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const items = Array.isArray(payload)
    ? payload
    : (obj?.projects as unknown[]) || (obj?.data as unknown[]) || [];
  const map: Record<string, string> = {};
  for (const item of items) {
    const it = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const id = String(it.id || it.projectId || it.project_id || "").trim();
    const name = String(it.displayName || it.name || it.title || "").trim();
    if (id) map[id] = name || id;
  }
  log?.(`[sanity] loaded ${Object.keys(map).length} projects`);
  return map;
}

