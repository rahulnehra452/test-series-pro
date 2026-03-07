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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { testSeriesSchema, type TestSeriesFormValues } from "@/lib/validations/test-series"
import { createTestSeries, updateTestSeries } from "@/actions/test-series-actions"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface TestSeriesFormProps {
  initialData?: TestSeriesFormValues & { id: string }
  exams: { id: string; title: string }[]
  onSuccess: () => void
}

export function TestSeriesForm({ initialData, exams, onSuccess }: TestSeriesFormProps) {
  const [loading, setLoading] = useState(false)

  const form = useForm<TestSeriesFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(testSeriesSchema) as any,
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      exam_id: initialData?.exam_id || "",
      price: initialData?.price || 0,
      cover_image_url: initialData?.cover_image_url || "",
      is_active: initialData?.is_active ?? true,
    },
  })

  async function onSubmit(data: TestSeriesFormValues) {
    setLoading(true)
    try {
      if (initialData) {
        const res = await updateTestSeries(initialData.id, data)
        if (res.error) throw new Error(res.error)
        toast.success("Test series updated successfully")
      } else {
        const res = await createTestSeries(data)
        if (res.error) throw new Error(res.error)
        toast.success("Test series created successfully")
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
          name="exam_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exam Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title}
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Premium Mock Test Series 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the test series..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Tier</FormLabel>
                <Select onValueChange={(val) => field.onChange(val === 'pro' ? 999 : 0)} defaultValue={field.value > 0 ? "pro" : "free"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select access tier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="free">Free (Open to everyone)</SelectItem>
                    <SelectItem value="pro">PRO (Requires Subscription)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Does this require a subscription?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                <div className="space-y-0.5">
                  <FormLabel>Active</FormLabel>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Save Changes" : "Create Series"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
