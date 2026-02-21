"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { examSchema, type ExamFormValues } from "@/lib/validations/exam"
import { createExam, updateExam } from "@/actions/exam-actions"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface ExamFormProps {
  initialData?: ExamFormValues & { id: string }
  onSuccess: () => void
}

export function ExamForm({ initialData, onSuccess }: ExamFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: initialData?.title || "",
      slug: initialData?.slug || "",
      icon_url: initialData?.icon_url || "",
      is_active: initialData?.is_active ?? true,
    },
  })

  async function onSubmit(data: ExamFormValues) {
    setLoading(true)
    try {
      if (initialData) {
        const res = await updateExam(initialData.id, data)
        if (res.error) throw new Error(res.error)
        toast.success("Exam updated successfully")
      } else {
        const res = await createExam(data)
        if (res.error) throw new Error(res.error)
        toast.success("Exam created successfully")
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. UPSC Civil Services" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="e.g. upsc-cse" {...field} />
              </FormControl>
              <FormDescription>URL friendly identifier (lowercase, hyphens).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="icon_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon Name (Ionicons)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. school" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Active
                </FormLabel>
                <FormDescription>
                  This exam will be visible in the mobile app.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Exam"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
