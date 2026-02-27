import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { ReportsClient } from "./ReportsClient"

export default async function ReportsPage() {
  await requireAdminRole(["super_admin", "moderator"])
  const supabase = createAdminClient()

  const { data: reports } = await supabase
    .from('reported_questions')
    .select(`
      *,
      questions (
        id,
        text,
        test_id
      )
    `)
    .order('created_at', { ascending: false })

  // Get reporter profiles separately (since join on auth.users isn't direct)
  const reportData = (reports || []).map(r => ({
    id: r.id,
    question_id: r.question_id,
    question_text: r.questions?.text || 'Deleted question',
    reason: r.reason,
    details: r.details,
    status: r.status || 'pending',
    admin_notes: r.admin_notes,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
  }))

  const stats = {
    pending: reportData.filter(r => r.status === 'pending').length,
    reviewed: reportData.filter(r => r.status === 'reviewed').length,
    resolved: reportData.filter(r => r.status === 'resolved').length,
    dismissed: reportData.filter(r => r.status === 'dismissed').length,
    total: reportData.length,
  }

  return (
    <div className="space-y-6">
      <ReportsClient reports={reportData} stats={stats} />
    </div>
  )
}
