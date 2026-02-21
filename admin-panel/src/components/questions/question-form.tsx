"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface QuestionFormProps {
  initialData?: QuestionFormValues & { id: string }
  tests: { id: string; title: string }[]
  onSuccess: () => void
}

import { useWatch } from "react-hook-form"
import { MobileSimulator } from "./mobile-simulator"

export function QuestionForm({ initialData, tests, onSuccess }: QuestionFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<QuestionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      test_id: initialData?.test_id || "",
      question_text: initialData?.question_text || "",
      marks: initialData?.marks || 1,
      negative_marks: initialData?.negative_marks || 0,
      explanation: initialData?.explanation || "",
      options: initialData?.options || [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    },
  })

  // Watch form values for the simulator
  const watchedValues = useWatch({ control: form.control })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  })

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
      }
      onSuccess()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Form Fields */}
        <div className="lg:col-span-3 space-y-4 pr-1 max-h-[70vh] overflow-y-auto hide-scrollbar">
          <FormField
            control={form.control}
            name="test_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Test</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
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

          <FormField
            control={form.control}
            name="question_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Text</FormLabel>
                <FormControl>
                  <RichTextEditor placeholder="Enter your question here..." value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="marks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marks</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                  <FormLabel>Negative Marks</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.25" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>Options</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ text: "", is_correct: false })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Option
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start space-x-3">
                <FormField
                  control={form.control}
                  name={`options.${index}.is_correct`}
                  render={({ field }) => (
                    <FormItem className="pt-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`options.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextEditor placeholder={`Option ${index + 1}`} value={field.value} onChange={field.onChange} minHeight="60px" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <FormMessage>{form.formState.errors.options?.message}</FormMessage>
            <FormMessage>{form.formState.errors.options?.root?.message}</FormMessage>
          </div>

          <FormField
            control={form.control}
            name="explanation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Explanation (Optional)</FormLabel>
                <FormControl>
                  <RichTextEditor placeholder="Explain the correct answer..." value={field.value || ""} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-start space-x-2 pt-4 pb-8">
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData && initialData.id !== "" ? "Save Changes" : "Create Question"}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: Mobile Simulator */}
        <div className="lg:col-span-2 hidden lg:block sticky top-0">
          <MobileSimulator
            questionText={watchedValues.question_text || ""}
            options={(watchedValues.options as { text: string; is_correct: boolean }[]) || []}
            marks={watchedValues.marks}
            negativeMarks={watchedValues.negative_marks}
          />
        </div>
      </form>
    </Form>
  )
}
