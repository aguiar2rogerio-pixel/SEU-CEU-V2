export function firstName(name: string, fallback = "Você"): string {
  return name.trim().split(/\s+/)[0] || fallback;
}

export function formatDegrees(value: number): string {
  return `${value.toFixed(1)}°`;
}

export function formatDegreesMinutes(degree: number, minute: number): string {
  return `${Math.floor(degree)}°${String(minute).padStart(2, "0")}′`;
}
