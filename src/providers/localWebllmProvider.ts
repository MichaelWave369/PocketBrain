import {
  bootstrapModel,
  generateReply,
  generateReplyStream,
  getCuratedModelList,
  resetModelEngine,
  stopGeneration,
  type ProgressReport,
  type WebLlmEngine
} from '../model/webllmService';
import type { ChatProvider, ProviderContext, ProviderGenerateRequest } from './types';

const DEFAULT_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export class LocalWebLlmProvider implements ChatProvider {
  id = 'local-webllm' as const;
  label = 'Local';

  private engine: WebLlmEngine | null = null;
  private context: ProviderContext | null = null;

  async initialize(context: ProviderContext): Promise<void> {
    this.context = context;
    const modelId = context.settings.modelName || DEFAULT_MODEL;
    const onProgress = context.onProgress ?? ((report: ProgressReport) => console.info(report.text));
    this.engine = await bootstrapModel(modelId, onProgress, {
      useWebWorker: context.settings.useWebWorker ?? true,
      useIndexedDbCache: context.settings.useIndexedDbCache ?? false
    });
  }

  isReady(): boolean {
    return this.engine !== null;
  }

  async generate(request: ProviderGenerateRequest): Promise<string> {
    if (!this.engine) {
      throw new Error('Local model not initialized.');
    }

    const response = await generateReply(this.engine, request.systemPrompt, request.context, request.userInput);
    return response.text;
  }

  async *generateStream(request: ProviderGenerateRequest): AsyncGenerator<string> {
    if (!this.engine) {
      throw new Error('Local model not initialized.');
    }

    for await (const chunk of generateReplyStream(this.engine, request.systemPrompt, request.context, request.userInput)) {
      yield chunk;
    }
  }

  async interrupt(): Promise<void> {
    if (!this.engine) {
      return;
    }
    await stopGeneration(this.engine);
  }

  async reset(): Promise<void> {
    await resetModelEngine();
    this.engine = null;
    if (this.context) {
      await this.initialize(this.context);
    }
  }

  async getModelList(): Promise<string[]> {
    return getCuratedModelList();
  }

  async describeImage(): Promise<string> {
    throw new Error('Local WebLLM image description is not available in this release. Use a bridge provider to describe images.');
  }

  getEngine(): WebLlmEngine | null {
    return this.engine;
  }
}
