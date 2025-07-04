// utils/color.ts

export interface RgbaColor { r: number, g: number, b: number, a: number }

export function parseRgba(rgbaString: string): RgbaColor | null {
  const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!match)
    return null
  return {
    r: Number.parseInt(match[1]!, 10),
    g: Number.parseInt(match[2]!, 10),
    b: Number.parseInt(match[3]!, 10),
    a: match[4] !== undefined ? Number.parseFloat(match[4]) : 1,
  }
}

export function interpolateColor(startColor: RgbaColor, endColor: RgbaColor, factor: number): string {
  const t = Math.max(0, Math.min(1, factor))
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * t)
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * t)
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * t)
  const a = startColor.a + (endColor.a - startColor.a) * t
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`
}
