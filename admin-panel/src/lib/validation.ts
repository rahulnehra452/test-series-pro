/**
 * Form validation utilities for the admin panel.
 * Use these to validate form fields before submission.
 */

export type ValidationRule = {
  test: (value: string) => boolean
  message: string
}

export type FieldValidation = {
  required?: boolean | string
  minLength?: number
  maxLength?: number
  pattern?: { regex: RegExp; message: string }
  custom?: ValidationRule[]
}

export type ValidationErrors = Record<string, string | undefined>

/**
 * Validate a single field
 */
export function validateField(value: string, rules: FieldValidation): string | undefined {
  if (rules.required) {
    if (!value || !value.trim()) {
      return typeof rules.required === 'string' ? rules.required : 'This field is required'
    }
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    return `Must be at most ${rules.maxLength} characters`
  }

  if (value && rules.pattern && !rules.pattern.regex.test(value)) {
    return rules.pattern.message
  }

  if (value && rules.custom) {
    for (const rule of rules.custom) {
      if (!rule.test(value)) return rule.message
    }
  }

  return undefined
}

/**
 * Validate all fields in a form
 */
export function validateForm(
  values: Record<string, string>,
  schema: Record<string, FieldValidation>
): { valid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {}
  let valid = true

  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field] || '', rules)
    if (error) {
      errors[field] = error
      valid = false
    }
  }

  return { valid, errors }
}

// --- Common validation schemas ---

export const emailValidation: FieldValidation = {
  required: 'Email is required',
  pattern: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Enter a valid email address',
  },
}

export const testTitleValidation: FieldValidation = {
  required: 'Test title is required',
  minLength: 3,
  maxLength: 200,
}

export const questionTextValidation: FieldValidation = {
  required: 'Question text is required',
  minLength: 5,
  maxLength: 2000,
}

export const couponCodeValidation: FieldValidation = {
  required: 'Coupon code is required',
  minLength: 3,
  maxLength: 20,
  pattern: {
    regex: /^[A-Z0-9]+$/,
    message: 'Only uppercase letters and numbers allowed',
  },
}
