"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/auth/admin"
import { revalidatePath } from "next/cache"

interface GeneratedQuestion {
  text: string
  options: { text: string; is_correct: boolean }[]
  explanation: string
  difficulty: string
}

// --- The AI generation uses the Supabase Edge Function approach ---
// We call a deployed edge function or use direct API call to generate questions

export async function generateQuestionsWithAI(params: {
  topic: string
  difficulty: string
  count: number
  examContext: string
  language?: string
  questionType?: 'mcq'
}) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])

    // Use the OPENAI_API_KEY or GOOGLE_AI_KEY from env if available
    const apiKey = process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_API_KEY

    if (!apiKey) {
      // Fall back to template-based generation if no API key
      return generateTemplateQuestions(params)
    }

    const isOpenAI = !!process.env.OPENAI_API_KEY

    if (isOpenAI) {
      return await generateWithOpenAI(apiKey, params)
    } else {
      return await generateWithGemini(apiKey, params)
    }
  } catch (err: unknown) {
    return {
      questions: [],
      error: err instanceof Error ? err.message : "AI generation failed",
    }
  }
}

async function generateWithOpenAI(apiKey: string, params: {
  topic: string; difficulty: string; count: number; examContext: string; language?: string
}) {
  const systemPrompt = `You are an expert exam question creator for Indian competitive exams. Generate multiple-choice questions (MCQs) with 4 options each. Return ONLY valid JSON.`

  const userPrompt = `Generate ${params.count} ${params.difficulty}-level MCQ questions about "${params.topic}" for the "${params.examContext}" exam.

${params.language === 'hindi' ? 'Write questions in Hindi (Devanagari script).' : 'Write questions in English.'}

Return a JSON array where each object has:
- "text": the question text
- "options": array of 4 objects with "text" and "is_correct" (boolean, exactly one true)
- "explanation": brief explanation of the correct answer
- "difficulty": "${params.difficulty}"

Return ONLY the JSON array, no markdown or extra text.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error: ${err}`)
  }

  const data = await res.json()
  const content = data.choices[0]?.message?.content || '[]'

  // Parse the JSON from the response
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON')

  const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0])
  return { questions, error: null }
}

async function generateWithGemini(apiKey: string, params: {
  topic: string; difficulty: string; count: number; examContext: string; language?: string
}) {
  const prompt = `You are an expert exam question creator for Indian competitive exams. Generate ${params.count} ${params.difficulty}-level MCQ questions about "${params.topic}" for the "${params.examContext}" exam.

${params.language === 'hindi' ? 'Write questions in Hindi (Devanagari script).' : 'Write questions in English.'}

Return a JSON array where each object has:
- "text": the question text
- "options": array of 4 objects with "text" (string) and "is_correct" (boolean, exactly one true)  
- "explanation": brief explanation of the correct answer
- "difficulty": "${params.difficulty}"

Return ONLY the raw JSON array, no markdown formatting, no code fences, no extra text.`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error: ${err}`)
  }

  const data = await res.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON')

  const questions: GeneratedQuestion[] = JSON.parse(jsonMatch[0])
  return { questions, error: null }
}

// Fallback template-based generation (when no API key is configured)
function generateTemplateQuestions(params: {
  topic: string; difficulty: string; count: number; examContext: string
}) {
  const questions: GeneratedQuestion[] = []
  for (let i = 0; i < params.count; i++) {
    questions.push({
      text: `[${params.examContext}] Question ${i + 1} about ${params.topic} (${params.difficulty})`,
      options: [
        { text: 'Option A', is_correct: true },
        { text: 'Option B', is_correct: false },
        { text: 'Option C', is_correct: false },
        { text: 'Option D', is_correct: false },
      ],
      explanation: `This is a template question about ${params.topic}. Replace with actual content.`,
      difficulty: params.difficulty,
    })
  }
  return {
    questions,
    error: 'No AI API key configured. Template questions generated instead. Add OPENAI_API_KEY or GOOGLE_AI_API_KEY to your .env.local file.',
  }
}

// Save AI-generated questions to a test
export async function saveGeneratedQuestions(testId: string, questions: GeneratedQuestion[]) {
  try {
    await requireAdminRole(["super_admin", "content_manager"])
    const supabase = createAdminClient()

    const rows = questions.map((q, i) => ({
      test_id: testId,
      text: q.text,
      options: q.options,
      correct_answer: q.options.findIndex(o => o.is_correct),
      explanation: q.explanation,
      difficulty: q.difficulty,
      marks: 1,
      negative_marks: 0,
      order_index: i,
    }))

    const { error } = await supabase.from('questions').insert(rows)
    if (error) throw error

    revalidatePath('/dashboard/questions')
    revalidatePath('/dashboard/questions/bulk')
    return { success: true, count: rows.length, error: null }
  } catch (err: unknown) {
    return { success: false, count: 0, error: err instanceof Error ? err.message : "Failed to save questions" }
  }
}
