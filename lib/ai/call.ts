import { DEFAULT_MODEL, modelPrice, type AiProviderId } from "./providers";

export type Completion = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export async function completeText(input: {
  provider: AiProviderId;
  apiKey: string;
  model?: string;
  system: string;
  user: string;
  maxTokens: number;
  json?: boolean;
}): Promise<Completion> {
  const model = input.model?.trim() || DEFAULT_MODEL[input.provider];
  if (input.provider === "anthropic") return anthropic(input.apiKey, model, input);
  if (input.provider === "google") return google(input.apiKey, model, input);
  return openAiCompatible(input.provider, input.apiKey, model, input);
}

export function estimateTokens(text: string, outputTokens: number) {
  return { inputTokens: Math.ceil(text.length / 4) + 200, outputTokens };
}

function usageOrEstimate(text: string, output: string, reportedIn?: number, reportedOut?: number) {
  return {
    inputTokens: reportedIn && reportedIn > 0 ? reportedIn : Math.ceil(text.length / 4),
    outputTokens: reportedOut && reportedOut > 0 ? reportedOut : Math.ceil(output.length / 4),
  };
}

async function anthropic(apiKey: string, model: string, input: { system: string; user: string; maxTokens: number }): Promise<Completion> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: "user", content: input.user }],
    }),
  });
  const body = await readJson(response);
  const text = Array.isArray(body.content)
    ? body.content.map((part) => (part && typeof part === "object" && "text" in part ? String(part.text ?? "") : "")).join("")
    : "";
  const usage = record(body.usage);
  const tokens = usageOrEstimate(`${input.system}\n${input.user}`, text, number(usage.input_tokens), number(usage.output_tokens));
  return { text, model, ...tokens };
}

async function google(apiKey: string, model: string, input: { system: string; user: string; maxTokens: number; json?: boolean }): Promise<Completion> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: "user", parts: [{ text: input.user }] }],
      generationConfig: {
        maxOutputTokens: input.maxTokens,
        responseMimeType: input.json ? "application/json" : "text/plain",
      },
    }),
  });
  const body = await readJson(response);
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const first = record(candidates[0]);
  const content = record(first.content);
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const text = parts.map((part) => (part && typeof part === "object" && "text" in part ? String(part.text ?? "") : "")).join("");
  const usage = record(body.usageMetadata);
  const tokens = usageOrEstimate(`${input.system}\n${input.user}`, text, number(usage.promptTokenCount), number(usage.candidatesTokenCount));
  return { text, model, ...tokens };
}

async function openAiCompatible(
  provider: AiProviderId,
  apiKey: string,
  model: string,
  input: { system: string; user: string; maxTokens: number; json?: boolean },
): Promise<Completion> {
  const url = provider === "openrouter" ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxTokens,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      response_format: input.json ? { type: "json_object" } : undefined,
    }),
  });
  const body = await readJson(response);
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const message = record(record(choices[0]).message);
  const text = typeof message.content === "string" ? message.content : "";
  const usage = record(body.usage);
  const tokens = usageOrEstimate(`${input.system}\n${input.user}`, text, number(usage.prompt_tokens), number(usage.completion_tokens));
  return { text, model, ...tokens };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error(`provider ${response.status}`);
  const body = (await response.json()) as unknown;
  return record(body);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function number(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function pricedModel(model: string) {
  return modelPrice(model);
}
