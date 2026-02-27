"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { runQuestionValidation, ValidationReport } from "@/actions/validation-actions"
import { AlertCircle, CheckCircle2, Copy, PlayCircle, Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function ValidationPage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ValidationReport | null>(null)

  const handleRunValidation = async () => {
    setLoading(true)
    try {
      const res = await runQuestionValidation()
      if (res.error) {
        toast.error("Validation failed", { description: res.error })
      } else if (res.report) {
        setReport(res.report)
        if (res.report.issues.length === 0) {
          toast.success("All questions passed validation!")
        } else {
          toast.warning(`Found ${res.report.issues.length} issues in ${res.report.scannedCount} questions.`)
        }
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/questions" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Questions
            </Link>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] dark:text-white">Content Validation</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Scan your entire question bank for broken images, missing options, and duplicate content.
          </p>
        </div>
        <Button onClick={handleRunValidation} disabled={loading} size="lg" className="animate-in fade-in zoom-in group">
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <PlayCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
          )}
          {loading ? "Scanning..." : "Run Validation Suite"}
        </Button>
      </div>

      {!report && !loading && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-4">
              <PlayCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold">No Recent Scans</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Click the button above to scan all questions in your database for common data integrity issues.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="border-dashed bg-muted/20 animate-pulse">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-bold">Scanning Knowledge Base...</h3>
            <p className="text-muted-foreground mt-2">
              Validating images and structure. This might take a few moments.
            </p>
          </CardContent>
        </Card>
      )}

      {report && !loading && report.issues.length === 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-green-800 dark:text-green-400">Perfect Score!</h3>
            <p className="text-green-700/80 dark:text-green-400/80 mt-2">
              Scanned {report.scannedCount} questions. Zero issues found. Your content is pristine.
            </p>
          </CardContent>
        </Card>
      )}

      {report && !loading && report.issues.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Questions Scanned</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{report.scannedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Total Issues</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-red-500">{report.issues.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Critical Errors</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-rose-600">
                  {report.issues.filter(i => i.severity === 'error').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Warnings</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-amber-500">
                  {report.issues.filter(i => i.severity === 'warning').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" /> Validation Report
              </CardTitle>
              <CardDescription>
                Review the items below and update the questions via the Question Bank.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border border-y bg-muted/10">
                {report.issues.map((issue, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-muted/30 transition-colors">
                    <div className="shrink-0 pt-1">
                      {issue.severity === 'error' ? (
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={issue.severity === 'error' ? 'destructive' : 'secondary'} className="uppercase text-[10px] tracking-wider font-bold">
                          {issue.issueType.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                          Test ID: {issue.testId.substring(0, 8)}...
                          <button onClick={() => copyToClipboard(issue.testId)} aria-label={`Copy Test ID ${issue.testId}`} title={`Copy Test ID ${issue.testId}`} className="hover:text-foreground">
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-1">
                          ID: {issue.questionId.substring(0, 8)}...
                          <button onClick={() => copyToClipboard(issue.questionId)} aria-label={`Copy Question ID ${issue.questionId}`} title={`Copy Question ID ${issue.questionId}`} className="hover:text-foreground">
                            <Copy className="w-3 h-3" />
                          </button>
                        </span>
                      </div>
                      <p className="text-sm font-medium">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 border-t text-xs text-muted-foreground flex justify-between">
              <span>Use the Question ID to search in the Question Bank.</span>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}
