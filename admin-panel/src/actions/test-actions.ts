"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { parseQuestionOptions } from "@/lib/question-options"
import { testSchema, TestFormValues } from "@/lib/validations/test"
import { revalidatePath } from "next/cache"
import { logAdminAction } from "@/actions/user-actions"

export async function createTest(data: TestFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = testSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

    const { error } = await supabase.from('tests').insert({
      title: data.title,
      series_id: data.series_id,
      description: data.description,
      duration_minutes: data.duration_minutes,
      total_marks: data.total_marks,
      pass_marks: data.pass_marks,
      is_active: data.is_active ?? true,
    })

    if (error) {
      console.error("Supabase Error:", error)
      throw error
    }

    await logAdminAction('test.create', data.title, { title: data.title, series_id: data.series_id })
    revalidatePath('/dashboard/tests')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create test"
    return { error: message }
  }
}

export async function updateTest(id: string, data: TestFormValues) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const result = testSchema.safeParse(data)
    if (!result.success) {
      return { error: "Invalid input data" }
    }

    const { error } = await supabase.from('tests').update({
      title: data.title,
      series_id: data.series_id,
      description: data.description,
      duration_minutes: data.duration_minutes,
      total_marks: data.total_marks,
      pass_marks: data.pass_marks,
      is_active: data.is_active,
    }).eq('id', id)

    if (error) throw error

    await logAdminAction('test.update', id, { title: data.title })
    revalidatePath('/dashboard/tests')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update test"
    return { error: message }
  }
}

export async function deleteTest(id: string) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const { error } = await supabase.from('tests').delete().eq('id', id)

    if (error) throw error

    await logAdminAction('test.delete', id, {})
    revalidatePath('/dashboard/tests')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete test"
    return { error: message }
  }
}

export async function duplicateTest(id: string, includeQuestions: boolean = false) {
  const supabase = createAdminClient()

  try {
    await requireAdminRole(["super_admin", "content_manager"])

    // Fetch the original test
    const { data: original, error: fetchError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError || !original) throw new Error("Test not found")

    // Insert the duplicate
    const { data: newTest, error: insertError } = await supabase
      .from('tests')
      .insert({
        title: `${original.title} (Copy)`,
        series_id: original.series_id,
        description: original.description,
        duration_minutes: original.duration_minutes,
        total_marks: original.total_marks,
        pass_marks: original.pass_marks,
        is_active: false, // Duplicates start as inactive
      })
      .select('id')
      .single()

    if (insertError || !newTest) throw new Error(insertError?.message || "Failed to create duplicate")

    // Optionally copy questions
    if (includeQuestions) {
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', id)

      if (questions && questions.length > 0) {
        const clonedQuestions = questions.map((q) => ({
          test_id: newTest.id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          marks: q.marks,
          negative_marks: q.negative_marks,
          difficulty: q.difficulty,
          question_image_url: q.question_image_url,
          option_images: q.option_images,
          section_id: null, // Sections not copied
        }))
        await supabase.from('questions').insert(clonedQuestions)
      }
    }

    await logAdminAction('test.duplicate', id, { newId: newTest.id, includeQuestions })
    revalidatePath('/dashboard/tests')
    return { success: true, newId: newTest.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to duplicate test"
    return { error: message }
  }
}

interface PreFlightResult {
  passed: boolean
  checks: { label: string; passed: boolean; detail: string }[]
}

export async function preFlightCheck(testId: string): Promise<PreFlightResult> {
  const supabase = createAdminClient()

  const checks: PreFlightResult['checks'] = []

  try {
    await requireAdminRole(["super_admin", "content_manager"])
    // 1. Test exists
    const { data: test } = await supabase.from('tests').select('*').eq('id', testId).single()
    checks.push({
      label: 'Test exists',
      passed: !!test,
      detail: test ? `"${test.title}"` : 'Test not found',
    })
    if (!test) return { passed: false, checks }

    // 2. Has questions
    const { data: questions } = await supabase.from('questions').select('id, text, options, correct_answer').eq('test_id', testId)
    const qCount = questions?.length || 0
    checks.push({
      label: 'Has questions',
      passed: qCount > 0,
      detail: qCount > 0 ? `${qCount} questions found` : 'No questions added yet',
    })

    // 3. All questions have correct answer set
    const missingAnswer = (questions || []).filter(q => q.correct_answer === null || q.correct_answer === undefined || q.correct_answer < 0)
    checks.push({
      label: 'All questions have a correct answer',
      passed: missingAnswer.length === 0,
      detail: missingAnswer.length === 0 ? 'All good' : `${missingAnswer.length} question(s) missing correct answer`,
    })

    // 4. All questions have at least 2 options
    const fewOptions = (questions || []).filter(q => {
      const opts = parseQuestionOptions(q.options)
      return !Array.isArray(opts) || opts.length < 2
    })
    checks.push({
      label: 'All questions have ≥2 options',
      passed: fewOptions.length === 0,
      detail: fewOptions.length === 0 ? 'All good' : `${fewOptions.length} question(s) have fewer than 2 options`,
    })

    // 5. Total marks > 0
    checks.push({
      label: 'Total marks configured',
      passed: Number(test.total_marks) > 0,
      detail: `Total marks: ${test.total_marks || 0}`,
    })

    // 6. Duration set
    checks.push({
      label: 'Duration configured',
      passed: Number(test.duration_minutes) > 0,
      detail: `Duration: ${test.duration_minutes || 0} minutes`,
    })

    // 7. Check sections (if any) have questions
    const { data: sections } = await supabase.from('test_sections').select('id, name').eq('test_id', testId)
    if (sections && sections.length > 0) {
      const sectionNames = sections.map(s => s.name)
      checks.push({
        label: 'Sections configured',
        passed: true,
        detail: `${sections.length} section(s): ${sectionNames.join(', ')}`,
      })
    }

    const passed = checks.every(c => c.passed)
    return { passed, checks }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to run pre-flight check"
    checks.push({
      label: 'Pre-flight check',
      passed: false,
      detail: message,
    })
    return { passed: false, checks }
  }
}
