interface AiModel {
  id: string;
  name: string;
  contextLength: number;
  maxOutput: number;
}

interface ChatConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

interface AiProvider {
  id: "openrouter" | "codingplan";
  name: string;
  baseUrl: string;
  listModels: (apiKey: string) => Promise<AiModel[]>;
  chatCompletion: (config: ChatConfig) => Promise<string>;
}

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  top_provider?: {
    max_completion_tokens?: number;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const openRouterProvider: AiProvider = {
  id: "openrouter",
  name: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1",

  async listModels(): Promise<AiModel[]> {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) {
      throw new Error(`OpenRouter models fetch failed: ${res.status}`);
    }
    const data: OpenRouterModelsResponse = await res.json();
    return data.data
      .map((m) => ({
        id: m.id,
        name: m.name,
        contextLength: m.context_length ?? 0,
        maxOutput: m.top_provider?.max_completion_tokens ?? 4096,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async chatCompletion(config: ChatConfig): Promise<string> {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-OpenRouter-Title": "SkillForge",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: config.systemPrompt },
          { role: "user", content: config.userMessage },
        ],
        max_tokens: config.maxTokens ?? 8192,
        temperature: config.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} — ${errorText}`);
    }

    const data: ChatCompletionResponse = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenRouter returned empty response");
    }
    return content;
  },
};

const codingPlanProvider: AiProvider = {
  id: "codingplan",
  name: "Alibaba Coding Plan",
  baseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1",

  async listModels(): Promise<AiModel[]> {
    return [
      { id: "glm-4.7", name: "GLM 4.7", contextLength: 202752, maxOutput: 16384 },
      { id: "glm-5", name: "GLM 5", contextLength: 202752, maxOutput: 16384 },
      { id: "kimi-k2.5", name: "Kimi K2.5", contextLength: 262144, maxOutput: 32768 },
      { id: "MiniMax-M2.5", name: "MiniMax M2.5", contextLength: 196608, maxOutput: 24576 },
      { id: "qwen3-coder-next", name: "Qwen3 Coder Next", contextLength: 262144, maxOutput: 65536 },
      { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus", contextLength: 1000000, maxOutput: 65536 },
      { id: "qwen3-max-2026-01-23", name: "Qwen3 Max", contextLength: 262144, maxOutput: 32768 },
      { id: "qwen3.5-plus", name: "Qwen3.5 Plus", contextLength: 1000000, maxOutput: 65536 },
    ].sort((a, b) => a.name.localeCompare(b.name));
  },

  async chatCompletion(config: ChatConfig): Promise<string> {
    const res = await fetch(
      "https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userMessage },
          ],
          max_tokens: config.maxTokens ?? 8192,
          temperature: config.temperature ?? 0.7,
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`CodingPlan API error: ${res.status} — ${errorText}`);
    }

    const data: ChatCompletionResponse = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("CodingPlan returned empty response");
    }
    return content;
  },
};

const PROVIDERS: Record<string, AiProvider> = {
  openrouter: openRouterProvider,
  codingplan: codingPlanProvider,
};

export function getProvider(id: string): AiProvider | undefined {
  return PROVIDERS[id];
}

export type { AiModel, AiProvider, ChatConfig };
