"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle, XCircle, Clock, MessageSquare, Pencil } from "lucide-react"
import { resolveReport } from "@/actions/report-actions"
import { toast } from "sonner"
import { htmlToPlainText } from "@/lib/utils"
import { QuestionDialog } from "@/components/questions/question-dialog"
import { QuestionFormValues } from "@/lib/validations/question"

interface Report {
  id: string
  question_id: string
  question_text: string
  full_question?: QuestionFormValues & { id: string; tests?: { title: string } }
  reason: string
  details: string | null
  status: string
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
}

interface Stats {
  pending: number
  reviewed: number
  resolved: number
  dismissed: number
  total: number
}

interface ReportsClientProps {
  reports: Report[]
  stats: Stats
  tests: { id: string; title: string }[]
}

const statusTabs = [
  { key: 'all', label: 'All', icon: MessageSquare },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'reviewed', label: 'Reviewed', icon: AlertTriangle },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle },
  { key: 'dismissed', label: 'Dismissed', icon: XCircle },
]

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
  reviewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
  dismissed: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

export function ReportsClient({ reports, stats, tests }: ReportsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [editingReport, setEditingReport] = useState<string | null>(null)
  const [adminNotesByReport, setAdminNotesByReport] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const filtered = activeTab === 'all' ? reports : reports.filter(r => r.status === activeTab)

  const toggleExpandedReport = (report: Report) => {
    setExpandedReport((prev) => (prev === report.id ? null : report.id))

    setAdminNotesByReport((prev) => {
      if (report.id in prev) return prev
      return { ...prev, [report.id]: report.admin_notes || "" }
    })
  }

  const handleResolve = (reportId: string, status: 'reviewed' | 'resolved' | 'dismissed') => {
    const notes = (adminNotesByReport[reportId] || "").trim()
    startTransition(async () => {
      const res = await resolveReport(reportId, status, notes)
      if (res.error) toast.error(res.error)
      else {
        toast.success(`Report marked as ${status}`)
        setExpandedReport(null)
        setAdminNotesByReport((prev) => ({ ...prev, [reportId]: "" }))
        router.refresh()
      }
    })
  }

  return (
    <>
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          Reported Questions
        </h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Review questions flagged by students for errors or issues.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusTabs.map(tab => {
          const Icon = tab.icon
          const count = tab.key === 'all' ? stats.total : stats[tab.key as keyof Stats] || 0
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${activeTab === tab.key
                ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm'
                : 'bg-white dark:bg-[#1C1C1E] border-neutral-200 dark:border-neutral-800 hover:shadow-sm'
                }`}
            >
              <Icon className={`w-5 h-5 ${activeTab === tab.key ? 'text-blue-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground font-medium">{tab.label}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="bg-white dark:bg-[#1C1C1E]">
            <CardContent className="py-16 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30 text-green-500" />
              <p className="font-medium">No reports to show</p>
              <p className="text-sm mt-1">
                {activeTab === 'all' ? "No questions have been reported yet." : `No ${activeTab} reports.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(report => (
            <Card key={report.id} className="bg-white dark:bg-[#1C1C1E] hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs ${statusColors[report.status]}`}>
                        {report.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-red-600 dark:text-red-400">Reason: {report.reason}</p>
                    {report.details && <p className="text-sm text-muted-foreground mt-1">{report.details}</p>}
                    <div className="text-sm mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg line-clamp-2 whitespace-pre-wrap">
                      {htmlToPlainText(report.question_text) || "Question unavailable"}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpandedReport(report)}
                  >
                    {expandedReport === report.id ? 'Close' : 'Review'}
                  </Button>
                </div>

                {expandedReport === report.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">

                    {/* Full Question Detail View */}
                    {report.full_question && (
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 border dark:border-neutral-800">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-sm">Question Details</h4>
                          <QuestionDialog
                            initialData={report.full_question}
                            tests={tests}
                            open={editingReport === report.id}
                            onOpenChange={(open) => setEditingReport(open ? report.id : null)}
                            trigger={
                              <Button variant="outline" size="sm" className="h-8 bg-white dark:bg-[#1C1C1E]">
                                <Pencil className="w-3 h-3 mr-2" />
                                Edit Question
                              </Button>
                            }
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="text-sm">
                            <div className="font-medium mb-1">Text:</div>
                            <div className="text-muted-foreground bg-white dark:bg-[#1C1C1E] p-3 rounded-md border dark:border-neutral-800 whitespace-pre-wrap">{htmlToPlainText(report.full_question.question_text)}</div>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium mb-2">Options:</div>
                            <ul className="space-y-2">
                              {report.full_question.options.map((opt, i) => (
                                <li key={i} className={`flex items-start p-3 rounded-md border ${opt.is_correct ? 'bg-green-50/50 border-green-200 text-green-900 dark:bg-green-900/10 dark:border-green-900/30 dark:text-green-300' : 'bg-white dark:bg-[#1C1C1E] dark:border-neutral-800'}`}>
                                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 mr-3 text-xs font-medium">{String.fromCharCode(65 + i)}</span>
                                  <span className="flex-1 mt-[2px]">{opt.text}</span>
                                  {opt.is_correct && <CheckCircle className="w-4 h-4 ml-2 mt-[2px] text-green-500 shrink-0" />}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {report.full_question.explanation && (
                            <div className="text-sm">
                              <div className="font-medium mb-1">Explanation:</div>
                              <div className="text-muted-foreground bg-white dark:bg-[#1C1C1E] p-3 rounded-md border dark:border-neutral-800">{report.full_question.explanation}</div>
                            </div>
                          )}
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <div><span className="font-medium text-foreground">Marks:</span> {report.full_question.marks}</div>
                            {report.full_question.negative_marks > 0 && <div><span className="font-medium text-foreground">Negative:</span> {report.full_question.negative_marks}</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    <Textarea
                      placeholder="Add admin notes (optional)..."
                      value={adminNotesByReport[report.id] || ""}
                      onChange={(e) => setAdminNotesByReport((prev) => ({
                        ...prev,
                        [report.id]: e.target.value,
                      }))}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(report.id, 'reviewed')}
                        disabled={isPending}
                        className="text-blue-600 border-blue-200"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" /> Mark Reviewed
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleResolve(report.id, 'resolved')}
                        disabled={isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolve(report.id, 'dismissed')}
                        disabled={isPending}
                        className="text-neutral-500"
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                )}

                {report.admin_notes && report.status !== 'pending' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-sm">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">Admin Notes:</span> {report.admin_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  )
}
