import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { bootstrapModel, type WebLlmEngine } from './model/webllmService';
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
import type { AppSettings, ChatMessage, MemorySummary, ModelStatus } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  localOnlyMode: true,
  selectedModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
};

export const App = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelEngine, setModelEngine] = useState<WebLlmEngine | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const [storedMessages, storedSummary, storedSettings] = await Promise.all([
        getMessages(),
        getSummary(),
        getSettings()
      ]);

      setMessages(storedMessages);
      setSummary(storedSummary);
      setSettings(storedSettings ?? DEFAULT_SETTINGS);
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    const initModel = async () => {
      setModelStatus('loading');
      setModelError(null);
      try {
        const engine = await bootstrapModel(settings.selectedModel);
        setModelEngine(engine);
        setModelStatus('ready');
      } catch (error) {
        setModelStatus('error');
        setModelError(error instanceof Error ? error.message : 'Unable to load local model.');
      }
    };

    void initModel();
  }, [settings.selectedModel]);

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

  const sharedProps = useMemo(
    () => ({
      messages,
      summary,
      modelStatus,
      modelError,
      onSend,
      onClear,
      modelEngineReady,
      modelEngine
    }),
    [messages, summary, modelStatus, modelError, modelEngineReady, modelEngine]
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
              onSettingsChange={onSettingsChange}
              onExport={onExport}
              onImport={onImport}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
