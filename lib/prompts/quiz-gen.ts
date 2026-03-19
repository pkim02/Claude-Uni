export function buildQuizPrompt(topic: string, courseContext: string, difficulty?: string): string {
  return `You are an exam question generator for a university course.

Based on the following course materials, generate practice questions about "${topic}".

<course_materials>
${courseContext}
</course_materials>

## Rules

1. Generate exactly 5 questions
2. Mix difficulty levels: ${difficulty ? `focus on ${difficulty}` : "2 easy, 2 medium, 1 hard"}
3. Include both conceptual and applied questions
4. Match the style of actual university exams
5. For multiple choice questions, provide 4 options (A, B, C, D)
6. For each question, prepare a detailed explanation

## Output Format

Return a valid JSON array with this structure:
\`\`\`json
[
  {
    "id": "q1",
    "question": "The question text",
    "type": "multiple_choice",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "Detailed explanation of why this is correct...",
    "difficulty": "easy",
    "topic": "specific concept tested"
  }
]
\`\`\`

Types can be: "multiple_choice", "short_answer", or "true_false".
For true_false, correct_answer should be "True" or "False".
For short_answer, correct_answer should be a concise expected answer.

Return ONLY the JSON array, no other text.`;
}
