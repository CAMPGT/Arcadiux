import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config/index.js";
import type {
  AiGenerateDescriptionInput,
  AiBreakDownEpicInput,
  AiDetectRisksInput,
} from "@arcadiux/shared/validators";
import {
  buildGenerateDescriptionPrompt,
  buildBreakDownEpicPrompt,
  buildDetectRisksPrompt,
} from "./ai.prompts.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!config.ANTHROPIC_API_KEY) {
      throw Object.assign(
        new Error("AI features are not configured. ANTHROPIC_API_KEY is missing."),
        { statusCode: 503 },
      );
    }
    client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return client;
}

async function callClaude(prompt: string, maxTokens: number = 2048): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text from the response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw Object.assign(
      new Error("Unexpected response format from AI"),
      { statusCode: 500 },
    );
  }

  return textBlock.text;
}

export async function generateDescription(
  input: AiGenerateDescriptionInput,
): Promise<{ description: string }> {
  const prompt = buildGenerateDescriptionPrompt(input);
  const description = await callClaude(prompt, 2048);
  return { description };
}

export async function breakDownEpic(
  input: AiBreakDownEpicInput,
): Promise<{
  stories: Array<{
    type: string;
    title: string;
    description: string;
    storyPoints: number;
    priority: string;
    dependencies: string[];
  }>;
}> {
  const prompt = buildBreakDownEpicPrompt(input);
  const rawResponse = await callClaude(prompt, 4096);

  // Parse the JSON response
  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const stories = JSON.parse(jsonStr);

    if (!Array.isArray(stories)) {
      throw new Error("Response is not an array");
    }

    return { stories };
  } catch (err) {
    throw Object.assign(
      new Error("Failed to parse AI response. Please try again."),
      { statusCode: 502 },
    );
  }
}

export async function detectRisks(
  input: AiDetectRisksInput,
): Promise<{
  risks: Array<{
    severity: string;
    category: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
}> {
  const prompt = buildDetectRisksPrompt(input);
  const rawResponse = await callClaude(prompt, 4096);

  // Parse the JSON response
  try {
    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const risks = JSON.parse(jsonStr);

    if (!Array.isArray(risks)) {
      throw new Error("Response is not an array");
    }

    return { risks };
  } catch (err) {
    throw Object.assign(
      new Error("Failed to parse AI response. Please try again."),
      { statusCode: 502 },
    );
  }
}
