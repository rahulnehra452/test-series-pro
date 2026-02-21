import { z } from "zod"

const optionSchema = z.object({
  id: z.string().optional(), // For editing existing options
  text: z.string().min(1, "Option text is required"),
  is_correct: z.boolean().optional().default(false),
})

export const questionSchema = z.object({
  test_id: z.string({ error: "Please select a test." }),
  question_text: z.string().min(5, "Question text must be at least 5 characters."),
  marks: z.number().min(1, "Marks must be at least 1"),
  negative_marks: z.number().min(0).optional().default(0),
  explanation: z.string().optional(),
  image_url: z.string().optional(),
  options: z.array(optionSchema).min(2, "At least 2 options are required").refine(
    (options) => options.some((opt) => opt.is_correct),
    {
      message: "At least one option must be marked as correct.",
    }
  ),
})

export type QuestionFormValues = z.infer<typeof questionSchema>
