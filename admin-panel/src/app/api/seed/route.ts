import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()

  // Large pool of mock questions
  const MOCK_QUESTIONS_POOL = [
    { text: 'Which of the following Article of the Indian Constitution deals with the Election Commission of India?', options: ['Article 320', 'Article 324', 'Article 328', 'Article 330'], correctAnswer: 1, explanation: 'Article 324 of the Constitution provides that the power of superintendence, direction and control of elections to parliament, state legislatures, the office of president of India and the office of vice-president of India shall be vested in the election commission.', subject: 'Polity', difficulty: 'Medium', type: 'MCQ' },
    { text: 'Who among the following was the first Satyagrahi of the Individual Satyagraha Movement?', options: ['Jawaharlal Nehru', 'Sardar Patel', 'Vinoba Bhave', 'Subhash Chandra Bose'], correctAnswer: 2, explanation: 'The individual Satyagraha was started on 17 October 1940. Vinoba Bhave was the first Satyagrahi and Jawaharlal Nehru was the second.', subject: 'History', difficulty: 'Medium', type: 'MCQ' },
    { text: 'Which of the following is/are the tributary/tributaries of Brahmaputra River?', options: ['Dibang', 'Kameng', 'Lohit', 'All of the above'], correctAnswer: 3, explanation: 'The principal tributaries of the river Brahmaputra joining from right are the Lohit, the Dibang, the Subansiri, the Jiabharali, the Dhansiri, the Manas, the Torsa, the Sankosh and the Teesta.', subject: 'Geography', difficulty: 'Hard', type: 'MCQ' },
    { text: 'In the context of Indian economy, "Open Market Operations" refers to?', options: ['Borrowing by scheduled banks from the RBI', 'Lending by commercial banks to industry', 'Purchase and sale of government securities by the RBI', 'None of the above'], correctAnswer: 2, explanation: 'Open market operations are the sale and purchase of government securities and treasury bills by RBI or the central bank of the country.', subject: 'Economy', difficulty: 'Medium', type: 'MCQ' },
    { text: 'The "Tropic of Cancer" does NOT pass through which of the following Indian states?', options: ['Gujarat', 'Rajasthan', 'Odisha', 'Tripura'], correctAnswer: 2, explanation: 'The Tropic of Cancer passes through eight states in India: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura and Mizoram. It does not pass through Odisha.', subject: 'Geography', difficulty: 'Easy', type: 'MCQ' },
    { text: 'Consider the following statements regarding the Preamble of the Constitution of India:\n1. It is based on the Objective Resolution drafted by Jawaharlal Nehru.\n2. It has been amended only once.\nWhich of the statements given above is/are correct?', options: ['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2'], correctAnswer: 2, explanation: 'The Preamble is based on the Objective Resolution moved by Jawaharlal Nehru in 1946. It has been amended only once by the 42nd Constitutional Amendment Act of 1976.', subject: 'Polity', difficulty: 'Hard', type: 'MCQ' },
    { text: 'Which one of the following is the largest Committee of the Parliament?', options: ['The Committee on Public Accounts', 'The Committee on Estimates', 'The Committee on Public Undertakings', 'The Committee on Petitions'], correctAnswer: 1, explanation: 'The Estimates Committee is the largest committee of the Parliament. It consists of 30 members and all these members are from Lok Sabha.', subject: 'Polity', difficulty: 'Medium', type: 'MCQ' }
  ];

  const { data: tests, error } = await supabase.from('tests').select('*');
  let targetTestId;
  if (!tests || tests.length === 0) {
     const { data: series, error: sErr } = await supabase.from('test_series').select('id');
     let sId;
     if (series && series.length > 0) sId = series[0].id;
     
     const { data: newTest, error: insertTestErr } = await supabase.from('tests').insert({
         title: 'UPSC Mock 1',
         series_id: sId,
         is_active: true,
         total_questions: MOCK_QUESTIONS_POOL.length,
         duration_minutes: 60
     }).select('*').single();
     if (insertTestErr) return NextResponse.json({ error: insertTestErr.message });
     targetTestId = newTest.id;
  } else {
     targetTestId = tests[0].id;
  }

  // Insert questions into the first available test
  const questionsToInsert = MOCK_QUESTIONS_POOL.map(q => ({
    test_id: targetTestId,
    // ensure mapping to database schema correctly
    text: q.text,
    options: JSON.stringify(q.options),
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    subject: q.subject,
    difficulty: q.difficulty,
    type: q.type
  }));

  const { data, error: insertError } = await supabase.from('questions').insert(questionsToInsert).select();
  
  if (insertError) {
    return NextResponse.json({ error: insertError.message });
  }

  return NextResponse.json({ success: true, count: data?.length, test_id: targetTestId });
}
