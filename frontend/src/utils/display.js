export function textOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "--";
}

export function householdLabel(values, separator = "｜", fallback = "--") {
  const parts = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(separator) : fallback;
}

export function normalizeIdTag(value) {
  return String(value ?? "").trim().toUpperCase();
}
