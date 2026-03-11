export type HomeSectionId =
  | "hero"
  | "snapshot"
  | "overview"
  | "what-it-is"
  | "how-it-works"
  | "partners"
  | "request-access"

export type ViewportProfile = "mobile" | "tablet" | "desktop"

type FalconAnchor = {
  xPct: number
  yPct: number
  scale: number
  perchRotate: number
}

type SegmentTuning = {
  arcXPct: number
  arcYPct: number
  depth: number
}

type TrailSettings = {
  maxDots: number
  sampleMs: number
  lifetimeMs: number
}

export const HOME_SECTION_ORDER: HomeSectionId[] = [
  "hero",
  "snapshot",
  "overview",
  "what-it-is",
  "how-it-works",
  "partners",
  "request-access",
]

const ANCHORS: Record<ViewportProfile, Record<HomeSectionId, FalconAnchor>> = {
  desktop: {
    hero: { xPct: 82, yPct: 20, scale: 1.08, perchRotate: -8 },
    snapshot: { xPct: 18, yPct: 34, scale: 0.86, perchRotate: 8 },
    overview: { xPct: 82, yPct: 41, scale: 0.8, perchRotate: -6 },
    "what-it-is": { xPct: 20, yPct: 50, scale: 0.9, perchRotate: 7 },
    "how-it-works": { xPct: 82, yPct: 60, scale: 0.84, perchRotate: -8 },
    partners: { xPct: 20, yPct: 74, scale: 0.8, perchRotate: 8 },
    "request-access": { xPct: 78, yPct: 88, scale: 0.92, perchRotate: -6 },
  },
  tablet: {
    hero: { xPct: 78, yPct: 18, scale: 0.96, perchRotate: -7 },
    snapshot: { xPct: 22, yPct: 32, scale: 0.8, perchRotate: 8 },
    overview: { xPct: 76, yPct: 42, scale: 0.76, perchRotate: -6 },
    "what-it-is": { xPct: 24, yPct: 52, scale: 0.84, perchRotate: 7 },
    "how-it-works": { xPct: 76, yPct: 63, scale: 0.78, perchRotate: -8 },
    partners: { xPct: 24, yPct: 76, scale: 0.74, perchRotate: 7 },
    "request-access": { xPct: 74, yPct: 89, scale: 0.84, perchRotate: -5 },
  },
  mobile: {
    hero: { xPct: 78, yPct: 14, scale: 0.8, perchRotate: -6 },
    snapshot: { xPct: 78, yPct: 28, scale: 0.7, perchRotate: -3 },
    overview: { xPct: 18, yPct: 43, scale: 0.72, perchRotate: 6 },
    "what-it-is": { xPct: 80, yPct: 56, scale: 0.76, perchRotate: -6 },
    "how-it-works": { xPct: 18, yPct: 69, scale: 0.7, perchRotate: 6 },
    partners: { xPct: 82, yPct: 81, scale: 0.72, perchRotate: -6 },
    "request-access": { xPct: 20, yPct: 92, scale: 0.76, perchRotate: 5 },
  },
}

const SEGMENTS: Record<
  ViewportProfile,
  Partial<Record<`${HomeSectionId}:${HomeSectionId}`, SegmentTuning>>
> = {
  desktop: {
    "hero:snapshot": { arcXPct: -8, arcYPct: -12, depth: 0.12 },
    "snapshot:overview": { arcXPct: 10, arcYPct: -8, depth: 0.08 },
    "overview:what-it-is": { arcXPct: -11, arcYPct: -10, depth: 0.09 },
    "what-it-is:how-it-works": { arcXPct: 11, arcYPct: -10, depth: 0.09 },
    "how-it-works:partners": { arcXPct: -10, arcYPct: -9, depth: 0.08 },
    "partners:request-access": { arcXPct: 10, arcYPct: -12, depth: 0.13 },
  },
  tablet: {
    "hero:snapshot": { arcXPct: -6, arcYPct: -10, depth: 0.1 },
    "snapshot:overview": { arcXPct: 8, arcYPct: -7, depth: 0.08 },
    "overview:what-it-is": { arcXPct: -8, arcYPct: -9, depth: 0.08 },
    "what-it-is:how-it-works": { arcXPct: 8, arcYPct: -9, depth: 0.08 },
    "how-it-works:partners": { arcXPct: -8, arcYPct: -8, depth: 0.07 },
    "partners:request-access": { arcXPct: 8, arcYPct: -10, depth: 0.11 },
  },
  mobile: {
    "hero:snapshot": { arcXPct: -4, arcYPct: -8, depth: 0.06 },
    "snapshot:overview": { arcXPct: -6, arcYPct: -6, depth: 0.05 },
    "overview:what-it-is": { arcXPct: 7, arcYPct: -7, depth: 0.06 },
    "what-it-is:how-it-works": { arcXPct: -7, arcYPct: -7, depth: 0.06 },
    "how-it-works:partners": { arcXPct: 7, arcYPct: -7, depth: 0.05 },
    "partners:request-access": { arcXPct: -7, arcYPct: -8, depth: 0.07 },
  },
}

const BIRD_SIZES: Record<ViewportProfile, { width: number; height: number }> = {
  desktop: { width: 178, height: 140 },
  tablet: { width: 146, height: 116 },
  mobile: { width: 112, height: 88 },
}

const TRAIL: Record<ViewportProfile, TrailSettings> = {
  desktop: { maxDots: 14, sampleMs: 42, lifetimeMs: 520 },
  tablet: { maxDots: 11, sampleMs: 48, lifetimeMs: 460 },
  mobile: { maxDots: 8, sampleMs: 58, lifetimeMs: 380 },
}

export function getViewportProfile(width: number): ViewportProfile {
  if (width < 768) {
    return "mobile"
  }

  if (width < 1280) {
    return "tablet"
  }

  return "desktop"
}

export function getFalconAnchor(
  sectionId: HomeSectionId,
  profile: ViewportProfile,
) {
  return ANCHORS[profile][sectionId]
}

export function getFalconBirdSize(profile: ViewportProfile) {
  return BIRD_SIZES[profile]
}

export function getFalconTrailSettings(profile: ViewportProfile) {
  return TRAIL[profile]
}

export function getSegmentTuning(
  from: HomeSectionId,
  to: HomeSectionId,
  profile: ViewportProfile,
): SegmentTuning {
  return (
    SEGMENTS[profile][`${from}:${to}`] ?? {
      arcXPct: from < to ? 8 : -8,
      arcYPct: -8,
      depth: 0.08,
    }
  )
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

export function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export function quadraticBezier(
  progress: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
) {
  const inverse = 1 - progress

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * progress * control.x +
      progress * progress * end.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * progress * control.y +
      progress * progress * end.y,
  }
}

export function quadraticTangent(
  progress: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
) {
  return {
    x: 2 * (1 - progress) * (control.x - start.x) + 2 * progress * (end.x - control.x),
    y: 2 * (1 - progress) * (control.y - start.y) + 2 * progress * (end.y - control.y),
  }
}

export function viewportPoint(
  anchor: FalconAnchor,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    x: (anchor.xPct / 100) * viewportWidth,
    y: (anchor.yPct / 100) * viewportHeight,
  }
}
