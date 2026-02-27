import { requireAdminRole } from "@/lib/auth/admin"
import { getPerformanceAnalytics, getActivityHeatmap } from "@/actions/advanced-actions"
import { PerformanceClient } from "./PerformanceClient"

export default async function PerformancePage() {
  await requireAdminRole(["super_admin", "moderator"])
  const [analytics, heatmap] = await Promise.all([
    getPerformanceAnalytics(),
    getActivityHeatmap(),
  ])
  return <PerformanceClient analytics={analytics} heatmap={heatmap} />
}
