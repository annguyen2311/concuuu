export function cleanEnv(value) {
  const text = String(value || '').trim();
  if (!text || text === '""' || text === "''") return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

export function getApiBaseUrl() {
  return cleanEnv(import.meta.env.VITE_API_URL);
}
