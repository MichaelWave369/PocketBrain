import type { ChatMessage, ModelResult } from '../types';

export interface WebLlmEngine {
  chat: {
    completions: {
      create: (request: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
      }) => Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
    };
  };
}

interface WebLlmModule {
  CreateMLCEngine: (
    modelId: string,
    options?: { initProgressCallback?: (report: { text?: string }) => void }
  ) => Promise<WebLlmEngine>;
}

let engine: WebLlmEngine | null = null;

const loadWebLlmModule = async (): Promise<WebLlmModule> =>
  import(
    /* @vite-ignore */ 'https://esm.sh/@mlc-ai/web-llm@0.2.79?target=es2022'
  ) as unknown as Promise<WebLlmModule>;

export const bootstrapModel = async (modelId: string): Promise<WebLlmEngine> => {
  if (engine) {
    return engine;
  }

  const webllm = await loadWebLlmModule();
  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report: { text?: string }) => {
      if (report?.text) {
        console.info(`[WebLLM] ${report.text}`);
      }
    }
  });

  return engine;
};

export const generateReply = async (
  modelEngine: WebLlmEngine,
  systemPrompt: string,
  context: string,
  userInput: string
): Promise<ModelResult> => {
  const messages: ChatMessage[] = [
    {
      id: 'system',
      role: 'system',
      content: systemPrompt,
      createdAt: Date.now()
    },
    {
      id: 'context',
      role: 'system',
      content: `Memory context:\n${context}`,
      createdAt: Date.now()
    },
    {
      id: 'user-input',
      role: 'user',
      content: userInput,
      createdAt: Date.now()
    }
  ];

  const response = await modelEngine.chat.completions.create({
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
    temperature: 0.7
  });

  const text = response.choices?.[0]?.message?.content?.trim() ?? 'I could not generate a response.';

  return { text };
};
