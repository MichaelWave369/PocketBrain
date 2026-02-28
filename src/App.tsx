import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { fromImageMemoryData, fromVoiceNoteData, toImageMemoryData, toVoiceNoteData, type BackupData, type ImportMode } from './backup/types';
import { getCuratedModelList, getDeviceDiagnostics, resetModelEngine, type ProgressReport } from './model/webllmService';
import {
  clearAllLocalData,
  clearBridgeSettings,
  clearImageMemories,
  clearMessages,
  clearSummaries,
  clearVoiceNotes,
  deleteImageMemory,
  deleteTrustedDevice,
  deleteVoiceNote,
  getImageMemories,
  getMessages,
  getSettings,
  getSummary,
  getTrustedBridgeEndpoints,
  getTrustedDevices,
  getVoiceNotes,
  replaceTrustedBridgeEndpoints,
  saveImageMemory,
  saveMessage,
  saveSettings,
  saveSummary,
  saveTrustedBridgeEndpoint,
  saveTrustedDevice,
  saveVoiceNote
} from './memory/indexedDb';
import { updateRollingSummary } from './memory/summary';
import { CapturePage } from './pages/CapturePage';
import { ChatPage } from './pages/ChatPage';
import { MemoryPage } from './pages/MemoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { FirstRunFlow } from './components/FirstRunFlow';
import { getProvider, getProviderLabel, getProviderOptions } from './providers/providerRegistry';
import type { ProviderGenerateRequest } from './providers/types';
import type { SyncPreferences, TrustedDevice } from './sync/types';
import type { AppSettings, ChatMessage, DeviceDiagnostics, MemorySummary, ModelStatus } from './types';
import type { VoiceNote } from './voice/types';
import type { ImageMemory } from './camera/types';

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
  bridgeFallbackToLocal: true,
  ttsEnabled: false,
  ttsAutoReadReplies: false,
  ttsVoiceURI: '',
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  confirmBeforeBridgeImageAnalysis: true,
  imageCompressionPreference: 'original'
};

const DEFAULT_SYNC_PREFERENCES: SyncPreferences = {
  autoSync: false,
  categories: ['chats', 'summaries', 'pinned', 'bridges', 'settings', 'voice', 'images']
};

const DEFAULT_DIAGNOSTICS: DeviceDiagnostics = {
  userAgent: navigator.userAgent,
  gpuVendor: 'Detecting...',
  maxStorageBufferBindingSize: 'Detecting...'
};

export const App = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [imageMemories, setImageMemories] = useState<ImageMemory[]>([]);
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [trustedBridgeEndpoints, setTrustedBridgeEndpoints] = useState<string[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>(DEFAULT_SYNC_PREFERENCES);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelProgressText, setModelProgressText] = useState('Waiting to load provider...');
  const [modelProgressPct, setModelProgressPct] = useState<number | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([DEFAULT_SETTINGS.selectedModel]);
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics>(DEFAULT_DIAGNOSTICS);
  const [activeProviderLabel, setActiveProviderLabel] = useState('Local');
  const [modelReloadCounter, setModelReloadCounter] = useState(0);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => localStorage.getItem('pocketbrain-onboarding-v1') === 'done');

  const refreshLocalData = async () => {
    const [storedMessages, storedSummary, storedSettings, storedVoiceNotes, bridges, images, devices] = await Promise.all([
      getMessages(),
      getSummary(),
      getSettings(),
      getVoiceNotes(),
      getTrustedBridgeEndpoints(),
      getImageMemories(),
      getTrustedDevices()
    ]);

    setMessages(storedMessages);
    setSummary(storedSummary);
    setSettings(storedSettings ?? DEFAULT_SETTINGS);
    setVoiceNotes(storedVoiceNotes);
    setTrustedBridgeEndpoints(bridges);
    setImageMemories(images);
    setTrustedDevices(devices);
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
        await provider.initialize({
          settings: {
            type: settings.providerType,
            endpointUrl: settings.bridgeEndpointUrl,
            modelName: settings.providerType === 'local-webllm' ? settings.selectedModel : settings.bridgeModelName,
            apiKey: settings.bridgeApiKey,
            rememberLocally: settings.rememberBridgeSettings,
            fallbackToLocalOnFailure: settings.bridgeFallbackToLocal,
            useWebWorker: settings.useWebWorker,
            useIndexedDbCache: settings.useIndexedDbCache
          },
          onProgress: (report: ProgressReport) => {
            if (report.text) setModelProgressText(report.text);
            if (typeof report.progress === 'number') setModelProgressPct(Math.max(0, Math.min(1, report.progress)));
          }
        });
        setModelStatus('ready');
        setModelProgressText(`${provider.label} ready`);
        setModelProgressPct(1);
      } catch (error) {
        setModelStatus('error');
        setModelError(error instanceof Error ? error.message : 'Unable to initialize provider.');
      }
    };

    void initializeProvider();
  }, [settings.providerType, settings.selectedModel, settings.bridgeEndpointUrl, settings.bridgeModelName, settings.bridgeApiKey, settings.useWebWorker, settings.useIndexedDbCache, modelReloadCounter]);

  const onSend = async (userMessage: ChatMessage, assistantMessage: ChatMessage) => {
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    await Promise.all([saveMessage(userMessage), saveMessage(assistantMessage)]);
    const nextSummary = updateRollingSummary(summary, userMessage, assistantMessage);
    setSummary(nextSummary);
    await saveSummary(nextSummary);
  };

  const onGenerateWithProvider = async (request: ProviderGenerateRequest, onChunk: (chunk: string) => void): Promise<void> => {
    const selectedProvider = getProvider(settings.providerType);
    const provider = selectedProvider.isReady() ? selectedProvider : getProvider('local-webllm');

    setModelStatus('generating');
    for await (const chunk of provider.generateStream(request)) {
      onChunk(chunk);
    }
    setModelStatus('ready');
  };

  const onStopGeneration = async () => {
    await getProvider(settings.providerType).interrupt();
    setModelStatus('ready');
  };

  const onTranscribeWithBridge = async (audioBlob: Blob): Promise<string> => {
    const provider = getProvider(settings.providerType);
    if (!provider.transcribeAudio) throw new Error('Bridge transcription not implemented for this provider.');
    return provider.transcribeAudio(audioBlob, { language: navigator.language });
  };

  const onDescribeImageWithBridge = async (imageBlob: Blob): Promise<string> => {
    const provider = getProvider(settings.providerType);
    if (!provider.describeImage) throw new Error('Bridge image analysis unavailable for this provider.');
    return provider.describeImage(imageBlob, { prompt: 'Summarize this image for memory indexing.' });
  };

  const onSaveVoiceNote = async (note: VoiceNote) => {
    await saveVoiceNote(note);
    setVoiceNotes((prev) => [note, ...prev]);
  };

  const onDeleteVoiceNote = async (id: string) => {
    await deleteVoiceNote(id);
    setVoiceNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const onSaveImage = async (image: ImageMemory) => {
    await saveImageMemory(image);
    setImageMemories((prev) => [image, ...prev]);
  };

  const onUpdateImage = async (image: ImageMemory) => {
    await saveImageMemory(image);
    setImageMemories((prev) => prev.map((entry) => (entry.id === image.id ? image : entry)));
  };

  const onDeleteImage = async (id: string) => {
    await deleteImageMemory(id);
    setImageMemories((prev) => prev.filter((image) => image.id !== id));
  };

  const onAttachImageToChat = (id: string) => {
    const image = imageMemories.find((entry) => entry.id === id);
    if (!image) return;
    const note = image.caption || image.notes || image.analysisSummary || 'image memory';
    const userMessage: ChatMessage = {
      id: `img-${id}-${Date.now()}`,
      role: 'user',
      content: `[Attached image memory] ${note}`,
      createdAt: Date.now()
    };
    setMessages((prev) => [...prev, userMessage]);
    void saveMessage(userMessage);
  };

  const onSettingsChange = async (next: AppSettings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const onResetModel = async () => {
    setModelStatus('loading');
    setModelProgressText('Resetting provider runtime...');
    setModelProgressPct(0);
    await resetModelEngine();
    setModelReloadCounter((value) => value + 1);
  };

  const onTestBridgeConnection = async (): Promise<{ ok: boolean; message: string }> => {
    const provider = getProvider(settings.providerType);
    if (!provider.testConnection) return { ok: true, message: 'Local mode available after model load.' };
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

  const onExportData = async (options: { includeVoiceBlobs: boolean; includeImageBlobs: boolean; metadataOnly: boolean }): Promise<BackupData> => ({
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion: '0.5.0',
    messages,
    summary,
    settings,
    trustedBridgeEndpoints,
    trustedDevices,
    syncPreferences,
    voiceNotes: await Promise.all(voiceNotes.map((note) => toVoiceNoteData(note, options.includeVoiceBlobs && !options.metadataOnly))),
    imageMemories: await Promise.all(imageMemories.map((image) => toImageMemoryData(image, options.includeImageBlobs && !options.metadataOnly)))
  });

  const onImportData = async (data: BackupData, mode: ImportMode) => {
    if (mode === 'replace') {
      await clearAllLocalData();
    }

    await Promise.all(data.messages.map((message) => saveMessage(message)));
    if (data.summary) await saveSummary(data.summary);
    if (data.settings) await saveSettings(data.settings);
    await Promise.all(data.voiceNotes.map((entry) => saveVoiceNote(fromVoiceNoteData(entry))));
    await Promise.all(data.imageMemories.map((entry) => saveImageMemory(fromImageMemoryData(entry))));

    if (mode === 'replace') {
      await replaceTrustedBridgeEndpoints(data.trustedBridgeEndpoints);
      await Promise.all(data.trustedDevices.map((device) => saveTrustedDevice(device)));
    } else {
      await replaceTrustedBridgeEndpoints([...new Set([...trustedBridgeEndpoints, ...data.trustedBridgeEndpoints])]);
      await Promise.all([...trustedDevices, ...data.trustedDevices].map((device) => saveTrustedDevice(device)));
    }

    setSyncPreferences(data.syncPreferences ?? DEFAULT_SYNC_PREFERENCES);
    await refreshLocalData();
  };

  const onClearData = async (scope: 'chats' | 'summaries' | 'voice' | 'images' | 'bridges' | 'all') => {
    if (scope === 'chats') await clearMessages();
    if (scope === 'summaries') await clearSummaries();
    if (scope === 'voice') await clearVoiceNotes();
    if (scope === 'images') await clearImageMemories();
    if (scope === 'bridges') await clearBridgeSettings();
    if (scope === 'all') await clearAllLocalData();
    await refreshLocalData();
  };

  const onTrustDevice = async (device: TrustedDevice) => {
    await saveTrustedDevice(device);
    setTrustedDevices(await getTrustedDevices());
  };

  const onRevokeDevice = async (deviceId: string) => {
    await deleteTrustedDevice(deviceId);
    setTrustedDevices(await getTrustedDevices());
  };

  const onCompleteOnboarding = async (patch: Partial<AppSettings>) => {
    const merged = { ...settings, ...patch };
    setSettings(merged);
    await saveSettings(merged);
    localStorage.setItem('pocketbrain-onboarding-v1', 'done');
    setOnboardingComplete(true);
  };

  const transcriptMemories = voiceNotes.map((note) => note.transcript).filter((text): text is string => Boolean(text));
  const imageMemoryTexts = imageMemories
    .flatMap((memory) => [memory.analysisSummary, memory.caption, memory.notes])
    .map((text) => text?.trim() ?? '')
    .filter((text): text is string => Boolean(text));

  if (!onboardingComplete) {
    return <FirstRunFlow onComplete={onCompleteOnboarding} />;
  }

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
              imageMemories={imageMemories}
              transcriptMemories={transcriptMemories}
              imageMemoryTexts={imageMemoryTexts}
              modelStatus={modelStatus}
              modelError={modelError}
              modelProgressText={modelProgressText}
              modelProgressPct={modelProgressPct}
              activeProviderLabel={activeProviderLabel}
              syncStatusLabel={trustedDevices.length ? 'trusted' : 'offline'}
              bridgeEnabled={settings.providerType !== 'local-webllm'}
              ttsSettings={{
                enabled: settings.ttsEnabled,
                autoReadReplies: settings.ttsAutoReadReplies,
                voiceURI: settings.ttsVoiceURI,
                rate: settings.ttsRate,
                pitch: settings.ttsPitch,
                volume: settings.ttsVolume
              }}
              onGenerateWithProvider={onGenerateWithProvider}
              onSend={onSend}
              onSaveVoiceNote={onSaveVoiceNote}
              onTranscribeWithBridge={onTranscribeWithBridge}
              onStopGeneration={onStopGeneration}
              onClear={async () => {
                await clearMessages();
                setMessages([]);
              }}
              onResetModel={onResetModel}
            />
          }
        />
        <Route
          path="/capture"
          element={<CapturePage images={imageMemories} onSaveImage={onSaveImage} onUpdateImage={onUpdateImage} onDeleteImage={onDeleteImage} onAttachImageToChat={onAttachImageToChat} />}
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
              trustedDevices={trustedDevices}
              syncPreferences={syncPreferences}
              onSyncPreferencesChange={setSyncPreferences}
              onSettingsChange={onSettingsChange}
              onResetModel={onResetModel}
              onTestBridgeConnection={onTestBridgeConnection}
              onApplyPairing={onApplyPairing}
              onExportData={onExportData}
              onImportData={onImportData}
              onClearData={onClearData}
              onTrustDevice={onTrustDevice}
              onRevokeDevice={onRevokeDevice}
              onDescribeImageWithBridge={onDescribeImageWithBridge}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
