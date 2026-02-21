"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface QuestionFormProps {
  initialData?: QuestionFormValues & { id: string }
  tests: { id: string; title: string }[]
  onSuccess: () => void
}

export function QuestionForm({ initialData, tests, onSuccess }: QuestionFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  })

  async function onSubmit(data: QuestionFormValues) {
    setLoading(true)
    try {
      if (initialData) {
        const res = await updateQuestion(initialData.id, data)
        if (res.error) throw new Error(res.error)
        toast.success("Question updated successfully")
      } else {
        const res = await createQuestion(data)
        if (res.error) throw new Error(res.error)
        toast.success("Question created successfully")
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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
                <Textarea placeholder="Enter your question here..." className="min-h-[100px]" {...field} />
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
                  <Input type="number" {...field} />
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
                  <Input type="number" step="0.25" {...field} />
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
                          // Ensure only one is correct if desired, or allow multiple. 
                          // For MCQ usually one. Let's allow flexible for now but UI implies checklist.
                          // ideally we uncheck others if it's single choice.
                          // Implementing naive change for now.
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
                        <Input placeholder={`Option ${index + 1}`} {...field} />
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
                <Textarea placeholder="Explain the correct answer..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Question"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
