export function buildPlannerPrompt(
  courseName: string,
  topics: string[],
  examDate: string,
  daysUntilExam: number,
  weakTopics: string[]
): string {
  return `You are a study planning expert. Create an optimal study schedule for a student.

## Context
- **Course:** ${courseName}
- **Topics to cover:** ${topics.join(", ")}
- **Exam date:** ${examDate}
- **Days until exam:** ${daysUntilExam}
- **Weak areas (need more time):** ${weakTopics.length > 0 ? weakTopics.join(", ") : "None identified yet"}

## Planning Rules

1. ${daysUntilExam <= 3 ? "CRAM MODE: Focus on high-yield topics and key concepts only" : "Use spaced repetition — review topics multiple times with increasing intervals"}
2. Allocate more time to weak areas
3. Include breaks and review sessions
4. Mix subjects to avoid fatigue
5. Schedule harder topics earlier in the day
6. Include practice problems, not just reading
7. Plan review sessions before the exam

## Output Format

Return a valid JSON object:
\`\`\`json
{
  "plan_type": "${daysUntilExam <= 3 ? "cram" : "regular"}",
  "days": [
    {
      "date": "2026-03-20",
      "topics": ["Topic 1", "Topic 2"],
      "tasks": [
        "Review chapter 3 key concepts (45 min)",
        "Practice problems set 3 (30 min)",
        "Quick review of weak areas (15 min)"
      ],
      "estimated_hours": 3,
      "is_review": false
    }
  ]
}
\`\`\`

Return ONLY the JSON object, no other text.`;
}
