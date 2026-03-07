"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { questionSchema, type QuestionFormValues } from "@/lib/validations/question"
import { createQuestion, updateQuestion } from "@/actions/question-actions"
import { toast } from "sonner"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, CheckCircle2, GripVertical, Sparkles } from "lucide-react"
import { MobileSimulator } from "./mobile-simulator"

interface QuestionFormProps {
  initialData?: QuestionFormValues & { id: string }
  tests: { id: string; title: string }[]
  onSuccess: () => void
}

export function QuestionForm({ initialData, tests, onSuccess }: QuestionFormProps) {
  const [loading, setLoading] = useState(false)
  const MIN_OPTIONS = 2

  // Retrieve sticky defaults and draft from local storage
  const stickyTestId = typeof window !== 'undefined' ? localStorage.getItem('stickyTestId') || "" : ""
  const stickyMarks = typeof window !== 'undefined' ? Number(localStorage.getItem('stickyMarks')) || 1 : 1
  const stickyNegMarks = typeof window !== 'undefined' ? Number(localStorage.getItem('stickyNegMarks')) || 0 : 0

  const savedDraft = typeof window !== 'undefined' ? localStorage.getItem('questionDraft') : null
  let defaultDraftValues = null
  if (savedDraft && (!initialData || initialData.id === "")) {
    try {
      defaultDraftValues = JSON.parse(savedDraft)
    } catch { /* ignore parse errors */ }
  }

  const form = useForm<QuestionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(questionSchema) as any,
    defaultValues: defaultDraftValues || {
      test_id: initialData?.test_id || stickyTestId,
      question_text: initialData?.question_text || "",
      marks: initialData?.marks || stickyMarks,
      negative_marks: initialData?.negative_marks || stickyNegMarks,
      explanation: initialData?.explanation || "",
      options: initialData?.options || [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    },
  })

  // Watch form values for the simulator and auto-save
  const watchedValues = useWatch({ control: form.control })

  // Auto-save draft to localStorage whenever fields change (only for new questions)
  useEffect(() => {
    if (!initialData || initialData.id === "") {
      const timeoutId = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (watchedValues.question_text || watchedValues.explanation || watchedValues.options?.some((o: any) => o?.text)) {
          localStorage.setItem('questionDraft', JSON.stringify(watchedValues))
        }
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [watchedValues, initialData])

  const { fields, append, replace } = useFieldArray({
    control: form.control,
    name: "options",
  })

  const setSingleCorrectOption = (correctIndex: number) => {
    const currentOptions = form.getValues("options")
    const nextOptions = currentOptions.map((opt, idx) => ({
      ...opt,
      is_correct: idx === correctIndex,
    }))

    form.setValue("options", nextOptions, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const handleRemoveOption = (removeIndex: number) => {
    const currentOptions = form.getValues("options")
    if (currentOptions.length <= MIN_OPTIONS) {
      toast.info(`At least ${MIN_OPTIONS} options are required.`)
      return
    }

    const nextOptions = currentOptions.filter((_, idx) => idx !== removeIndex)
    const hasCorrectOption = nextOptions.some((opt) => opt.is_correct)

    if (!hasCorrectOption && nextOptions.length > 0) {
      nextOptions[0] = { ...nextOptions[0], is_correct: true }
    }

    replace(nextOptions)
    form.trigger("options")
  }

  async function onSubmit(data: QuestionFormValues) {
    setLoading(true)
    try {
      if (initialData && initialData.id !== "") {
        const res = await updateQuestion(initialData.id, data)
        if (res.error) throw new Error(res.error)
        toast.success("Question updated successfully")
      } else {
        const res = await createQuestion(data)
        if (res.error) throw new Error(res.error)
        toast.success("Question created successfully")

        // Save sticky defaults
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem('stickyTestId', data.test_id)
            localStorage.setItem('stickyMarks', data.marks.toString())
            localStorage.setItem('stickyNegMarks', data.negative_marks.toString())
            localStorage.removeItem('questionDraft')
          }
        } catch { /* ignore */ }
      }
      onSuccess()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-0">
        {/* LEFT COLUMN: Form Fields */}
        <div className="lg:col-span-3 max-h-[75vh] overflow-y-auto hide-scrollbar pr-6">
          <div className="space-y-6">

            {/* ── Section: Test & Scoring ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-1 rounded-full bg-[#0066CC]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test & Scoring</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="test_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-muted-foreground">Test</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl bg-secondary/30 border-0 text-sm font-medium">
                              <SelectValue placeholder="Select a test" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tests.map((test) => (
                              <SelectItem key={test.id} value={test.id}>
                                {test.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="marks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Marks</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="h-10 rounded-xl bg-secondary/30 border-0 text-sm font-medium text-center" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="negative_marks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-muted-foreground">Negative</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" {...field} onChange={(e) => field.onChange(Number(e.target.value))} className="h-10 rounded-xl bg-secondary/30 border-0 text-sm font-medium text-center" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.06]" />

            {/* ── Section: Question Text ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-1 rounded-full bg-violet-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</span>
              </div>
              <FormField
                control={form.control}
                name="question_text"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor placeholder="Type your question here..." value={field.value} onChange={field.onChange} minHeight="120px" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.06]" />

            {/* ── Section: Options ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answer Options</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => append({ text: "", is_correct: false })}
                  className="h-7 gap-1.5 text-xs font-medium text-[#0066CC] hover:text-[#0066CC] hover:bg-[#0066CC]/5 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => {
                  const isCorrect = watchedValues.options?.[index]?.is_correct
                  return (
                    <div
                      key={field.id}
                      className={`
                        group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                        ${isCorrect
                          ? 'border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] shadow-sm shadow-emerald-500/5'
                          : 'border-black/[0.04] dark:border-white/[0.06] bg-secondary/20 hover:bg-secondary/30'
                        }
                      `}
                    >
                      {/* Drag Handle (visual only) */}
                      <GripVertical className="h-4 w-4 text-muted-foreground/20 shrink-0" />

                      {/* Option Label */}
                      <button
                        type="button"
                        onClick={() => setSingleCorrectOption(index)}
                        className={`
                          shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200
                          ${isCorrect
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                          }
                        `}
                        title={isCorrect ? "Correct answer" : "Mark as correct"}
                      >
                        {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : OPTION_LABELS[index]}
                      </button>

                      {/* Option Text */}
                      <FormField
                        control={form.control}
                        name={`options.${index}.text`}
                        render={({ field }) => (
                          <FormItem className="flex-1 space-y-0">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`Option ${OPTION_LABELS[index]}`}
                                className={`
                                  h-9 rounded-lg border-0 bg-transparent text-sm font-medium placeholder:text-muted-foreground/40
                                  focus-visible:ring-1 focus-visible:ring-[#0066CC]/30
                                  ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : ''}
                                `}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        disabled={fields.length <= MIN_OPTIONS}
                        className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/5 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
              <FormMessage>{form.formState.errors.options?.message}</FormMessage>
              <FormMessage>{form.formState.errors.options?.root?.message}</FormMessage>

              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1.5 pl-1">
                <Sparkles className="h-3 w-3" /> Click the circle to mark the correct answer
              </p>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-black/[0.04] dark:border-white/[0.06]" />

            {/* ── Section: Explanation ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-1 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explanation <span className="font-normal text-muted-foreground/50">(Optional)</span></span>
              </div>
              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor placeholder="Explain why the answer is correct..." value={field.value || ""} onChange={field.onChange} minHeight="100px" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Submit ── */}
            <div className="flex items-center gap-3 pt-2 pb-6">
              <Button type="submit" disabled={loading} className="h-10 px-6 rounded-xl bg-[#0066CC] hover:bg-[#0055AA] text-white font-semibold text-sm shadow-md shadow-[#0066CC]/10">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData && initialData.id !== "" ? "Save Changes" : "Create Question"}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Mobile Simulator */}
        <div className="lg:col-span-2 hidden lg:flex items-start justify-center pl-6 border-l border-black/[0.04] dark:border-white/[0.06]">
          <div className="sticky top-0 pt-2">
            <MobileSimulator
              questionText={watchedValues.question_text || ""}
              options={(watchedValues.options as { text: string; is_correct: boolean }[]) || []}
              marks={watchedValues.marks}
              negativeMarks={watchedValues.negative_marks}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}
