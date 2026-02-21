import * as z from "zod"

export const adminUserSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  full_name: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  role: z.enum(["super_admin", "content_manager", "moderator", "support_agent"], {
    required_error: "Please select a role.",
  }),
  is_active: z.boolean().default(true).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  // Password is optional for editing, required for creating (handled in action validation if needed or UI)
})

export type AdminUserFormValues = z.infer<typeof adminUserSchema>
