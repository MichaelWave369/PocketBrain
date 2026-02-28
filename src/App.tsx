import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { getCuratedModelList, getDeviceDiagnostics, resetModelEngine, type ProgressReport } from './model/webllmService';
import {
  clearMessages,
  exportMemory,
  getMessages,
  getSettings,
  getSummary,
  importMemory,
  saveMessage,
  saveSettings,
  saveSummary
} from './memory/indexedDb';
import { updateRollingSummary } from './memory/summary';
import { ChatPage } from './pages/ChatPage';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { getProvider, getProviderLabel, getProviderOptions } from './providers/providerRegistry';
import type { ProviderGenerateRequest } from './providers/types';
import type { AppSettings, ChatMessage, DeviceDiagnostics, MemorySummary, ModelStatus } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  localOnlyMode: true,
  selectedModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  useWebWorker: true,
  useIndexedDbCache: false,
  providerType: 'local-webllm',
  bridgeEndpointUrl: '',
  bridgeModelName: '',
  bridgeApiKey: '',
  rememberBridgeSettings: true,
  bridgeFallbackToLocal: true
};

const DEFAULT_DIAGNOSTICS: DeviceDiagnostics = {
  userAgent: navigator.userAgent,
  gpuVendor: 'Detecting...',
  maxStorageBufferBindingSize: 'Detecting...'
};

export const App = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelProgressText, setModelProgressText] = useState('Waiting to load provider...');
  const [modelProgressPct, setModelProgressPct] = useState<number | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([DEFAULT_SETTINGS.selectedModel]);
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics>(DEFAULT_DIAGNOSTICS);
  const [activeProviderLabel, setActiveProviderLabel] = useState('Local');
  const [modelReloadCounter, setModelReloadCounter] = useState(0);

  useEffect(() => {
    const bootstrap = async () => {
      const [storedMessages, storedSummary, storedSettings, availableModels, deviceStats] = await Promise.all([
        getMessages(),
        getSummary(),
        getSettings(),
        getCuratedModelList(),
        getDeviceDiagnostics()
      ]);

      setMessages(storedMessages);
      setSummary(storedSummary);
      setSettings(storedSettings ?? DEFAULT_SETTINGS);
      setModelOptions(availableModels.length ? availableModels : [DEFAULT_SETTINGS.selectedModel]);
      setDiagnostics((prev) => ({ ...prev, ...deviceStats }));
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    const initializeProvider = async () => {
      setModelStatus('loading');
      setModelError(null);
      setModelProgressPct(0);
      setModelProgressText('Initializing provider...');

      const provider = getProvider(settings.providerType);
      setActiveProviderLabel(getProviderLabel(settings.providerType));

      try {
        const providerSettings = {
          type: settings.providerType,
          endpointUrl: settings.bridgeEndpointUrl,
          modelName: settings.providerType === 'local-webllm' ? settings.selectedModel : settings.bridgeModelName,
          apiKey: settings.bridgeApiKey,
          rememberLocally: settings.rememberBridgeSettings,
          fallbackToLocalOnFailure: settings.bridgeFallbackToLocal,
          useWebWorker: settings.useWebWorker,
          useIndexedDbCache: settings.useIndexedDbCache
        };

        const onProgress = (report: ProgressReport) => {
          if (report.text) {
            setModelProgressText(report.text);
          }
          if (typeof report.progress === 'number') {
            setModelProgressPct(Math.max(0, Math.min(1, report.progress)));
          }
        };

        await provider.initialize({ settings: providerSettings, onProgress });
        setModelStatus('ready');
        setModelProgressText(`${provider.label} ready`);
        setModelProgressPct(1);
      } catch (error) {
        if (settings.providerType !== 'local-webllm' && settings.bridgeFallbackToLocal) {
          try {
            const local = getProvider('local-webllm');
            await local.initialize({
              settings: {
                type: 'local-webllm',
                endpointUrl: '',
                modelName: settings.selectedModel,
                apiKey: '',
                rememberLocally: true,
                fallbackToLocalOnFailure: false,
                useWebWorker: settings.useWebWorker,
                useIndexedDbCache: settings.useIndexedDbCache
              },
              onProgress: (report) => {
                if (report.text) {
                  setModelProgressText(`Bridge failed; local fallback: ${report.text}`);
                }
              }
            });
            setActiveProviderLabel('Local (Fallback)');
            setModelStatus('ready');
            setModelError('Bridge unavailable. Using local WebLLM fallback.');
            return;
          } catch {
            // fallthrough to error state
          }
        }

        setModelStatus('error');
        setModelError(error instanceof Error ? error.message : 'Unable to initialize provider.');
      }
    };

    void initializeProvider();
  }, [
    settings.providerType,
    settings.selectedModel,
    settings.bridgeEndpointUrl,
    settings.bridgeModelName,
    settings.bridgeApiKey,
    settings.bridgeFallbackToLocal,
    modelReloadCounter
  ]);

  const onSend = async (userMessage: ChatMessage, assistantMessage: ChatMessage) => {
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    await Promise.all([saveMessage(userMessage), saveMessage(assistantMessage)]);

    const nextSummary = updateRollingSummary(summary, userMessage, assistantMessage);
    setSummary(nextSummary);
    await saveSummary(nextSummary);
  };

  const onClear = async () => {
    await clearMessages();
    setMessages([]);
  };

  const onSettingsChange = async (next: AppSettings) => {
    const sanitized = next.rememberBridgeSettings
      ? next
      : {
          ...next,
          bridgeEndpointUrl: '',
          bridgeModelName: '',
          bridgeApiKey: ''
        };
    setSettings(sanitized);
    await saveSettings(sanitized);
  };

  const onExport = async () => {
    const raw = await exportMemory();
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pocketbrain-memory.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File) => {
    const raw = await file.text();
    await importMemory(raw);
    const [nextMessages, nextSummary, nextSettings] = await Promise.all([getMessages(), getSummary(), getSettings()]);
    setMessages(nextMessages);
    setSummary(nextSummary);
    if (nextSettings) {
      setSettings(nextSettings);
    }
  };

  const onResetModel = async () => {
    setModelStatus('loading');
    setModelProgressText('Resetting provider runtime...');
    setModelProgressPct(0);
    await resetModelEngine();
    setModelReloadCounter((value) => value + 1);
  };

  const onGenerateWithProvider = async (
    request: ProviderGenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    const selectedProvider = getProvider(settings.providerType);
    const canUseSelected = selectedProvider.isReady();
    const provider = canUseSelected ? selectedProvider : getProvider('local-webllm');

    setModelStatus('generating');
    try {
      for await (const chunk of provider.generateStream(request)) {
        onChunk(chunk);
      }
      setModelStatus('ready');
    } catch (error) {
      setModelStatus('error');
      setModelError(error instanceof Error ? error.message : 'Generation failed.');
      throw error;
    }
  };

  const onStopGeneration = async () => {
    const provider = getProvider(settings.providerType);
    await provider.interrupt();
    setModelStatus('ready');
  };

  const onTestBridgeConnection = async (): Promise<{ ok: boolean; message: string }> => {
    const provider = getProvider(settings.providerType);
    if (!provider.testConnection) {
      return { ok: true, message: 'Local mode is always local-first and available after model load.' };
    }
    return provider.testConnection();
  };

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <ChatPage
              messages={messages}
              summary={summary}
              modelStatus={modelStatus}
              modelError={modelError}
              modelProgressText={modelProgressText}
              modelProgressPct={modelProgressPct}
              activeProviderLabel={activeProviderLabel}
              onGenerateWithProvider={onGenerateWithProvider}
              onSend={onSend}
              onStopGeneration={onStopGeneration}
              onClear={onClear}
              onResetModel={onResetModel}
            />
          }
        />
        <Route path="/memory" element={<MemoryPage messages={messages} summary={summary} />} />
        <Route
          path="/settings"
          element={
            <SettingsPage
              settings={settings}
              modelOptions={modelOptions}
              providerOptions={getProviderOptions().map((item) => ({ value: item.value, label: item.label }))}
              diagnostics={diagnostics}
              onSettingsChange={onSettingsChange}
              onExport={onExport}
              onImport={onImport}
              onResetModel={onResetModel}
              onTestBridgeConnection={onTestBridgeConnection}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
