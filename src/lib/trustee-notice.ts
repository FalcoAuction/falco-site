/** Effective sale hold on a promoted lead. The old reaper's cancellation was inferred. */
export function trusteeNoticeHold(metadata: unknown): "stale_notice" | "cancelled" | "reinstated" | "ran" | null {
  const pm = metadata as { sale_status?: { status?: string; updated_by?: string }; trustee_notice_review?: { reason?: string } } | null
  const flag = pm?.sale_status
  if (flag?.status === "cancelled" && flag.updated_by === "trustee_status_reaper") return "stale_notice"
  if (flag?.status === "cancelled" || flag?.status === "ran" || flag?.status === "reinstated") return flag.status
  if (flag?.status === "postponed") return null
  return pm?.trustee_notice_review?.reason === "stale_notice" ? "stale_notice" : null
}
