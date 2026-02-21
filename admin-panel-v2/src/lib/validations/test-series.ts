import { z } from "zod"

export const testSeriesSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters.",
  }),
  description: z.string().optional(),
  exam_id: z.string({ message: "Please select an exam category." }),
  price: z.number().min(0, {
    message: "Price must be a positive number.",
  }),
  cover_image_url: z.string().optional(),
  is_active: z.boolean().default(true).optional(),
})

export type TestSeriesFormValues = z.infer<typeof testSeriesSchema>
