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
  fallbackXPct: number
  fallbackYPct: number
  offsetX: number
  offsetY: number
  scale: number
  perchRotate: number
}

type SegmentTuning = {
  arcXPct: number
  arcYPct: number
  depth: number
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
    hero: {
      fallbackXPct: 24,
      fallbackYPct: 18,
      offsetX: 44,
      offsetY: -30,
      scale: 0.58,
      perchRotate: -7,
    },
    snapshot: {
      fallbackXPct: 18,
      fallbackYPct: 34,
      offsetX: -54,
      offsetY: -34,
      scale: 0.48,
      perchRotate: 7,
    },
    overview: {
      fallbackXPct: 81,
      fallbackYPct: 41,
      offsetX: 80,
      offsetY: -30,
      scale: 0.46,
      perchRotate: -6,
    },
    "what-it-is": {
      fallbackXPct: 20,
      fallbackYPct: 50,
      offsetX: -58,
      offsetY: -34,
      scale: 0.48,
      perchRotate: 8,
    },
    "how-it-works": {
      fallbackXPct: 82,
      fallbackYPct: 61,
      offsetX: 72,
      offsetY: -38,
      scale: 0.46,
      perchRotate: -8,
    },
    partners: {
      fallbackXPct: 20,
      fallbackYPct: 74,
      offsetX: -56,
      offsetY: -30,
      scale: 0.45,
      perchRotate: 8,
    },
    "request-access": {
      fallbackXPct: 74,
      fallbackYPct: 88,
      offsetX: 68,
      offsetY: -34,
      scale: 0.48,
      perchRotate: -7,
    },
  },
  tablet: {
    hero: {
      fallbackXPct: 24,
      fallbackYPct: 17,
      offsetX: 38,
      offsetY: -26,
      scale: 0.52,
      perchRotate: -7,
    },
    snapshot: {
      fallbackXPct: 22,
      fallbackYPct: 32,
      offsetX: -42,
      offsetY: -26,
      scale: 0.44,
      perchRotate: 7,
    },
    overview: {
      fallbackXPct: 76,
      fallbackYPct: 43,
      offsetX: 58,
      offsetY: -28,
      scale: 0.42,
      perchRotate: -6,
    },
    "what-it-is": {
      fallbackXPct: 24,
      fallbackYPct: 53,
      offsetX: -44,
      offsetY: -28,
      scale: 0.44,
      perchRotate: 8,
    },
    "how-it-works": {
      fallbackXPct: 76,
      fallbackYPct: 64,
      offsetX: 54,
      offsetY: -32,
      scale: 0.42,
      perchRotate: -8,
    },
    partners: {
      fallbackXPct: 24,
      fallbackYPct: 76,
      offsetX: -44,
      offsetY: -28,
      scale: 0.41,
      perchRotate: 7,
    },
    "request-access": {
      fallbackXPct: 72,
      fallbackYPct: 89,
      offsetX: 48,
      offsetY: -30,
      scale: 0.44,
      perchRotate: -6,
    },
  },
  mobile: {
    hero: {
      fallbackXPct: 36,
      fallbackYPct: 12,
      offsetX: 24,
      offsetY: -18,
      scale: 0.46,
      perchRotate: -6,
    },
    snapshot: {
      fallbackXPct: 78,
      fallbackYPct: 28,
      offsetX: 28,
      offsetY: -18,
      scale: 0.38,
      perchRotate: -4,
    },
    overview: {
      fallbackXPct: 18,
      fallbackYPct: 43,
      offsetX: -26,
      offsetY: -18,
      scale: 0.39,
      perchRotate: 6,
    },
    "what-it-is": {
      fallbackXPct: 80,
      fallbackYPct: 56,
      offsetX: 28,
      offsetY: -18,
      scale: 0.4,
      perchRotate: -6,
    },
    "how-it-works": {
      fallbackXPct: 18,
      fallbackYPct: 69,
      offsetX: -26,
      offsetY: -18,
      scale: 0.38,
      perchRotate: 6,
    },
    partners: {
      fallbackXPct: 82,
      fallbackYPct: 81,
      offsetX: 26,
      offsetY: -18,
      scale: 0.39,
      perchRotate: -6,
    },
    "request-access": {
      fallbackXPct: 20,
      fallbackYPct: 92,
      offsetX: -22,
      offsetY: -18,
      scale: 0.4,
      perchRotate: 5,
    },
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
  desktop: { width: 90, height: 71 },
  tablet: { width: 74, height: 58 },
  mobile: { width: 56, height: 44 },
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
    x: (anchor.fallbackXPct / 100) * viewportWidth,
    y: (anchor.fallbackYPct / 100) * viewportHeight,
  }
}

export function resolveAnchorPoint(
  sectionId: HomeSectionId,
  profile: ViewportProfile,
  viewportWidth: number,
  viewportHeight: number,
) {
  const anchor = ANCHORS[profile][sectionId]
  const element = globalThis.document?.querySelector<HTMLElement>(
    `[data-falcon-anchor="${sectionId}"]`,
  )

  if (!element) {
    return viewportPoint(anchor, viewportWidth, viewportHeight)
  }

  const rect = element.getBoundingClientRect()

  return {
    x: rect.left + rect.width / 2 + anchor.offsetX,
    y: rect.top + rect.height / 2 + anchor.offsetY,
  }
}
