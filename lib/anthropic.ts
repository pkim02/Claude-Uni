import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-sonnet-4-20250514";

export async function streamChat(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  return client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });
}

export async function generateResponse(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export default client;
