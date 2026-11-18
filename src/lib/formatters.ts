export function firstName(name: string, fallback = "Você"): string {
  return name.trim().split(/\s+/)[0] || fallback;
}

export function formatDegrees(value: number): string {
  return `${value.toFixed(1)}°`;
}
