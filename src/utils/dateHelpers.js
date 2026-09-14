// Parses a date-only string (e.g. "2026-09-01") as LOCAL midnight,
// not UTC midnight — avoids the "day early" bug in negative-UTC-offset timezones.
export function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

// Convenience: parse + format in one call, wherever you're currently
// doing new Date(someDateString).toLocaleDateString(...)
export function formatLocalDate(dateString, options) {
  const date = parseLocalDate(dateString);
  if (!date) return '';
  return date.toLocaleDateString(undefined, options);
}