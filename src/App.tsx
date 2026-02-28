import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import {
  bootstrapModel,
  getCuratedModelList,
  getDeviceDiagnostics,
  resetModelEngine,
  type ProgressReport,
  type WebLlmEngine
} from './model/webllmService';
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
import type { AppSettings, ChatMessage, DeviceDiagnostics, MemorySummary, ModelStatus } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  localOnlyMode: true,
  selectedModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  useWebWorker: true,
  useIndexedDbCache: false
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
  const [modelProgressText, setModelProgressText] = useState('Waiting to load model...');
  const [modelProgressPct, setModelProgressPct] = useState<number | null>(null);
  const [modelEngine, setModelEngine] = useState<WebLlmEngine | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([DEFAULT_SETTINGS.selectedModel]);
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics>(DEFAULT_DIAGNOSTICS);
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
    const initModel = async () => {
      setModelStatus('loading');
      setModelError(null);
      setModelProgressText('Initializing model runtime...');
      setModelProgressPct(0);

      try {
        const onProgress = (report: ProgressReport) => {
          if (report.text) {
            setModelProgressText(report.text);
          }
          if (typeof report.progress === 'number') {
            setModelProgressPct(Math.max(0, Math.min(1, report.progress)));
          }
        };

        const engine = await bootstrapModel(settings.selectedModel, onProgress, {
          useWebWorker: settings.useWebWorker,
          useIndexedDbCache: settings.useIndexedDbCache
        });
        setModelEngine(engine);
        setModelStatus('ready');
        setModelProgressText('Model ready');
        setModelProgressPct(1);
      } catch (error) {
        setModelStatus('error');
        setModelError(error instanceof Error ? error.message : 'Unable to load local model.');
      }
    };

    void initModel();
  }, [settings.selectedModel, settings.useWebWorker, settings.useIndexedDbCache, modelReloadCounter]);

  const modelEngineReady = modelStatus === 'ready' || modelStatus === 'generating';

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
    setSettings(next);
    await saveSettings(next);
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
    setModelProgressText('Resetting model...');
    setModelProgressPct(0);
    await resetModelEngine();
    setModelEngine(null);
    setModelReloadCounter((value) => value + 1);
  };

  const sharedProps = useMemo(
    () => ({
      messages,
      summary,
      modelStatus,
      modelError,
      modelProgressText,
      modelProgressPct,
      onSend,
      onClear,
      modelEngineReady,
      modelEngine,
      setModelStatus,
      onResetModel
    }),
    [
      messages,
      summary,
      modelStatus,
      modelError,
      modelProgressText,
      modelProgressPct,
      modelEngineReady,
      modelEngine
    ]
  );

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ChatPage {...sharedProps} />} />
        <Route path="/memory" element={<MemoryPage messages={messages} summary={summary} />} />
        <Route
          path="/settings"
          element={
            <SettingsPage
              settings={settings}
              modelOptions={modelOptions}
              diagnostics={diagnostics}
              onSettingsChange={onSettingsChange}
              onExport={onExport}
              onImport={onImport}
              onResetModel={onResetModel}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
