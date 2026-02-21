import { z } from "zod"

export const examSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  slug: z.string().min(3, {
    message: "Slug must be at least 3 characters.",
  }).regex(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens.",
  }),
  icon_url: z.string().optional(),
  is_active: z.boolean().default(true).optional(),
})

export type ExamFormValues = z.infer<typeof examSchema>
