import type {
  AiGenerateDescriptionInput,
  AiBreakDownEpicInput,
  AiDetectRisksInput,
} from "@arcadiux/shared/validators";

export function buildGenerateDescriptionPrompt(
  input: AiGenerateDescriptionInput,
): string {
  const contextSection = input.context
    ? `\n\nAdditional context:\n${input.context}`
    : "";

  return `You are a senior agile project manager. Generate a clear, well-structured description for the following ${input.issueType}.

Title: "${input.title}"
Issue Type: ${input.issueType}${contextSection}

Requirements:
- Write in markdown format
- For stories: include "As a [role], I want [goal], so that [benefit]" format
- For bugs: include "Steps to Reproduce", "Expected Behavior", "Actual Behavior" sections
- For tasks/subtasks: include a clear description and acceptance criteria
- For epics: include an overview, goals, and success metrics
- Include a "## Acceptance Criteria" section with checkboxes
- Be concise but thorough
- Use professional language

Generate ONLY the description content, no additional commentary.`;
}

export function buildBreakDownEpicPrompt(
  input: AiBreakDownEpicInput,
): string {
  const contextSection = input.projectContext
    ? `\n\nProject Context:\n${input.projectContext}`
    : "";

  return `You are a senior agile project manager. Break down the following epic into smaller user stories and tasks.

Epic Title: "${input.epicTitle}"
Epic Description:
${input.epicDescription}${contextSection}

Requirements:
- Create 3-8 user stories that together fulfill the epic
- Each story should follow the format: "As a [role], I want [goal], so that [benefit]"
- For each story, estimate story points using Fibonacci scale (1, 2, 3, 5, 8, 13)
- Assign a priority: critical, high, medium, or low
- Identify any technical tasks needed (e.g., infrastructure, database changes)
- Flag any dependencies between stories

Return the result as a JSON array with this structure:
[
  {
    "type": "story" | "task",
    "title": "string",
    "description": "string",
    "storyPoints": number,
    "priority": "critical" | "high" | "medium" | "low",
    "dependencies": ["title of dependent story"]
  }
]

Return ONLY the JSON array, no additional text.`;
}

export function buildDetectRisksPrompt(
  input: AiDetectRisksInput,
): string {
  const issueList = input.issues
    .map(
      (issue, i) =>
        `${i + 1}. [${issue.type}] ${issue.title} - Priority: ${issue.priority}, Points: ${issue.storyPoints ?? "unestimated"}, Assigned: ${issue.assigneeId ? "yes" : "no"}`,
    )
    .join("\n");

  return `You are a senior agile coach analyzing a sprint for potential risks and issues.

Sprint Goal: "${input.sprintGoal}"

Sprint Issues:
${issueList}

Analyze the sprint and identify potential risks. Consider:
1. Scope risks (too many points, unestimated items)
2. Dependency risks (blocked items, missing prerequisites)
3. Resource risks (unassigned items, overloaded team members)
4. Priority misalignment (low priority items in sprint, critical items missing)
5. Technical risks (complex items without breakdown)

Return the result as a JSON array with this structure:
[
  {
    "severity": "high" | "medium" | "low",
    "category": "scope" | "dependency" | "resource" | "priority" | "technical",
    "title": "string",
    "description": "string",
    "recommendation": "string"
  }
]

Return ONLY the JSON array, no additional text.`;
}
