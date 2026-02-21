import { z } from "zod"

export const testSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  series_id: z.string({ error: "Please select a test series." }),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, {
    message: "Duration must be at least 1 minute.",
  }),
  total_marks: z.number().min(1, {
    message: "Total marks must be at least 1.",
  }),
  pass_marks: z.number().min(0, {
    message: "Pass marks must be non-negative.",
  }),
  is_active: z.boolean().default(true).optional(),
})

export type TestFormValues = z.infer<typeof testSchema>
