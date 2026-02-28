import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { fromVoiceNoteData, toVoiceNoteData, type BackupData, type ImportMode } from './backup/types';
import { getCuratedModelList, getDeviceDiagnostics, resetModelEngine, type ProgressReport } from './model/webllmService';
import {
  clearAllLocalData,
  clearBridgeSettings,
  clearMessages,
  clearSummaries,
  clearVoiceNotes,
  deleteVoiceNote,
  getMessages,
  getSettings,
  getSummary,
  getTrustedBridgeEndpoints,
  getVoiceNotes,
  replaceTrustedBridgeEndpoints,
  saveMessage,
  saveSettings,
  saveSummary,
  saveTrustedBridgeEndpoint,
  saveVoiceNote
} from './memory/indexedDb';
import { updateRollingSummary } from './memory/summary';
import { ChatPage } from './pages/ChatPage';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { getProvider, getProviderLabel, getProviderOptions } from './providers/providerRegistry';
import type { ProviderGenerateRequest } from './providers/types';
import type { AppSettings, ChatMessage, DeviceDiagnostics, MemorySummary, ModelStatus } from './types';
import type { VoiceNote } from './voice/types';


interface ImageMemory {
  id: string;
  caption?: string;
  notes?: string;
  analysisSummary?: string;
}

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
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [imageMemories] = useState<ImageMemory[]>([]);
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [trustedBridgeEndpoints, setTrustedBridgeEndpoints] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelProgressText, setModelProgressText] = useState('Waiting to load provider...');
  const [modelProgressPct, setModelProgressPct] = useState<number | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([DEFAULT_SETTINGS.selectedModel]);
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics>(DEFAULT_DIAGNOSTICS);
  const [activeProviderLabel, setActiveProviderLabel] = useState('Local');
  const [modelReloadCounter, setModelReloadCounter] = useState(0);

  const refreshLocalData = async () => {
    const [storedMessages, storedSummary, storedSettings, storedVoiceNotes, bridges] = await Promise.all([
      getMessages(),
      getSummary(),
      getSettings(),
      getVoiceNotes(),
      getTrustedBridgeEndpoints()
    ]);

    setMessages(storedMessages);
    setSummary(storedSummary);
    setSettings(storedSettings ?? DEFAULT_SETTINGS);
    setVoiceNotes(storedVoiceNotes);
    setTrustedBridgeEndpoints(bridges);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const [availableModels, deviceStats] = await Promise.all([getCuratedModelList(), getDeviceDiagnostics()]);
      await refreshLocalData();
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
              }
            });
            setActiveProviderLabel('Local (Fallback)');
            setModelStatus('ready');
            setModelError('Bridge unavailable. Using local WebLLM fallback.');
            return;
          } catch {
            // noop
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
    settings.useWebWorker,
    settings.useIndexedDbCache,
    modelReloadCounter
  ]);

  const onSend = async (userMessage: ChatMessage, assistantMessage: ChatMessage) => {
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    await Promise.all([saveMessage(userMessage), saveMessage(assistantMessage)]);

    const nextSummary = updateRollingSummary(summary, userMessage, assistantMessage);
    setSummary(nextSummary);
    await saveSummary(nextSummary);
  };

  const onSaveVoiceNote = async (note: VoiceNote) => {
    await saveVoiceNote(note);
    setVoiceNotes((prev) => [note, ...prev]);
  };

  const onDeleteVoiceNote = async (id: string) => {
    await deleteVoiceNote(id);
    setVoiceNotes((prev) => prev.filter((note) => note.id !== id));
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
      return { ok: true, message: 'Local mode is available after model load.' };
    }

    const result = await provider.testConnection();
    if (result.ok && settings.bridgeEndpointUrl) {
      await saveTrustedBridgeEndpoint(settings.bridgeEndpointUrl);
      setTrustedBridgeEndpoints(await getTrustedBridgeEndpoints());
    }

    return result;
  };

  const onApplyPairing = async (patch: Partial<AppSettings>) => {
    const merged = { ...settings, ...patch };
    setSettings(merged);
    await saveSettings(merged);
  };

  const onExportData = async (): Promise<BackupData> => ({
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion: '0.4.0',
    messages,
    summary,
    settings,
    trustedBridgeEndpoints,
    voiceNotes: await Promise.all(voiceNotes.map((note) => toVoiceNoteData(note)))
  });

  const onImportData = async (data: BackupData, mode: ImportMode) => {
    if (mode === 'replace') {
      await clearAllLocalData();
    }

    await Promise.all(data.messages.map((message) => saveMessage(message)));
    if (data.summary) {
      await saveSummary(data.summary);
    }
    if (data.settings) {
      await saveSettings(data.settings);
    }
    await Promise.all(data.voiceNotes.map((entry) => saveVoiceNote(fromVoiceNoteData(entry))));

    if (mode === 'replace') {
      await replaceTrustedBridgeEndpoints(data.trustedBridgeEndpoints);
    } else {
      const merged = [...new Set([...trustedBridgeEndpoints, ...data.trustedBridgeEndpoints])];
      await replaceTrustedBridgeEndpoints(merged);
    }

    await refreshLocalData();
  };

  const onClearData = async (scope: 'chats' | 'summaries' | 'voice' | 'bridges' | 'all') => {
    if (scope === 'chats') {
      await clearMessages();
    }
    if (scope === 'summaries') {
      await clearSummaries();
    }
    if (scope === 'voice') {
      await clearVoiceNotes();
    }
    if (scope === 'bridges') {
      await clearBridgeSettings();
    }
    if (scope === 'all') {
      await clearAllLocalData();
    }

    await refreshLocalData();
  };

  const onTranscribeWithBridge = async (audioBlob: Blob): Promise<string> => {
    const provider = getProvider(settings.providerType);
    if (!provider.transcribeAudio) {
      throw new Error('Selected provider does not support bridge transcription yet.');
    }
    return provider.transcribeAudio(audioBlob, { language: navigator.language });
  };

  const transcriptMemories = voiceNotes.map((note) => note.transcript).filter((text): text is string => Boolean(text));
  const imageMemoryTexts = imageMemories
    .flatMap((memory) => [memory.analysisSummary, memory.caption, memory.notes])
    .map((text) => text?.trim() ?? '')
    .filter((text): text is string => Boolean(text));

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <ChatPage
              messages={messages}
              summary={summary}
              voiceNotes={voiceNotes}
              transcriptMemories={transcriptMemories}
              imageMemoryTexts={imageMemoryTexts}
              modelStatus={modelStatus}
              modelError={modelError}
              modelProgressText={modelProgressText}
              modelProgressPct={modelProgressPct}
              activeProviderLabel={activeProviderLabel}
              bridgeEnabled={settings.providerType !== 'local-webllm'}
              onGenerateWithProvider={onGenerateWithProvider}
              onSend={onSend}
              onSaveVoiceNote={onSaveVoiceNote}
              onTranscribeWithBridge={onTranscribeWithBridge}
              onStopGeneration={onStopGeneration}
              onClear={onClear}
              onResetModel={onResetModel}
            />
          }
        />
        <Route
          path="/memory"
          element={<MemoryPage messages={messages} summary={summary} voiceNotes={voiceNotes} imageMemories={imageMemoryTexts} onDeleteVoiceNote={onDeleteVoiceNote} />}
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              settings={settings}
              modelOptions={modelOptions}
              providerOptions={getProviderOptions().map((item) => ({ value: item.value, label: item.label }))}
              diagnostics={diagnostics}
              trustedBridgeEndpoints={trustedBridgeEndpoints}
              onSettingsChange={onSettingsChange}
              onResetModel={onResetModel}
              onTestBridgeConnection={onTestBridgeConnection}
              onApplyPairing={onApplyPairing}
              onExportData={onExportData}
              onImportData={onImportData}
              onClearData={onClearData}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
