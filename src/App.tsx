import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { fromImageMemoryData, fromVoiceNoteData, toImageMemoryData, toVoiceNoteData, type BackupData, type ImportMode } from './backup/types';
import { STATIC_MODEL_LIST, getCuratedModelList, getDeviceDiagnostics, resetModelEngine, type ProgressReport } from './model/webllmService';
import {
  clearAllLocalData,
  clearBridgeSettings,
  clearImageMemories,
  clearMessages,
  clearSummaries,
  clearVoiceNotes,
  deleteTrustedDevice,
  deleteImageMemory,
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
import { FirstRunFlow } from './components/FirstRunFlow';
import { getProvider, getProviderLabel, getProviderOptions } from './providers/providerRegistry';
import type { ProviderGenerateRequest } from './providers/types';
import type { SyncPreferences, TrustedDevice } from './sync/types';
import type { AppSettings, ChatMessage, DeviceDiagnostics, MemorySummary, ModelStatus } from './types';
import type { VoiceNote } from './voice/types';
import type { ImageMemory } from './camera/types';

// Lazy-loaded page chunks — each page is a separate JS chunk for fast initial load
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const CapturePage = lazy(() => import('./pages/CapturePage').then((m) => ({ default: m.CapturePage })));
const MemoryPage = lazy(() => import('./pages/MemoryPage').then((m) => ({ default: m.MemoryPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

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

const PageFallback = () => (
  <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <p className="helper-text">Loading...</p>
  </div>
);

export const App = () => {
  const navigate = useNavigate();
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
  const [modelProgressText, setModelProgressText] = useState('Local AI ready to load on demand');
  const [modelProgressPct, setModelProgressPct] = useState<number | null>(null);
  // Start with static list — no WebLLM import needed at startup
  const [modelOptions, setModelOptions] = useState<string[]>(STATIC_MODEL_LIST);
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics>(DEFAULT_DIAGNOSTICS);
  const [activeProviderLabel, setActiveProviderLabel] = useState('Local');
  const [modelReloadCounter, setModelReloadCounter] = useState(0);
  // Deferred model load: local WebLLM only initialises when user requests it
  const [modelLoadRequested, setModelLoadRequested] = useState(false);
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
    // Bootstrap: load local IndexedDB data + GPU diagnostics.
    // Model list and WebLLM engine are NOT loaded here — deferred to user request.
    const bootstrap = async () => {
      const deviceStats = await getDeviceDiagnostics();
      await refreshLocalData();
      setDiagnostics((prev) => ({ ...prev, ...deviceStats }));
    };

    void bootstrap();
  }, []);

  // Refresh expanded model list lazily (only when settings page likely needs it)
  const onRefreshModelList = async () => {
    try {
      const availableModels = await getCuratedModelList();
      setModelOptions(availableModels.length ? availableModels : STATIC_MODEL_LIST);
    } catch {
      // Keep static list on failure
    }
  };

  useEffect(() => {
    const initializeProvider = async () => {
      // For local WebLLM: wait for explicit user request to avoid heavy startup
      if (settings.providerType === 'local-webllm' && !modelLoadRequested) {
        setModelStatus('idle');
        setActiveProviderLabel(getProviderLabel('local-webllm'));
        setModelProgressText('Local AI ready — tap "Load AI" to initialize');
        setModelProgressPct(null);
        return;
      }

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
  }, [settings.providerType, settings.selectedModel, settings.bridgeEndpointUrl, settings.bridgeModelName, settings.bridgeApiKey, settings.useWebWorker, settings.useIndexedDbCache, modelReloadCounter, modelLoadRequested]);

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
    setImageMemories((prev) => prev.map((m) => (m.id === image.id ? image : m)));
  };

  const onDeleteImage = async (id: string) => {
    await deleteImageMemory(id);
    setImageMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const onAttachImageToChat = (id: string) => {
    navigate('/?imageId=' + id);
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

  const onRequestModelLoad = () => {
    setModelLoadRequested(true);
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
    appVersion: '0.6.0',
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

  const syncStatusLabel = trustedDevices.length > 0
    ? (trustedDevices.length === 1 ? '1 device' : `${trustedDevices.length} devices`)
    : 'offline';

  if (!onboardingComplete) {
    return <FirstRunFlow onComplete={onCompleteOnboarding} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageFallback />}>
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
                syncStatusLabel={syncStatusLabel}
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
                onRequestModelLoad={onRequestModelLoad}
                onClear={async () => {
                  await clearMessages();
                  setMessages([]);
                }}
                onResetModel={onResetModel}
              />
            </Suspense>
          }
        />
        <Route
          path="/capture"
          element={
            <Suspense fallback={<PageFallback />}>
              <CapturePage images={imageMemories} onSaveImage={onSaveImage} onUpdateImage={onUpdateImage} onDeleteImage={onDeleteImage} onAttachImageToChat={onAttachImageToChat} />
            </Suspense>
          }
        />
        <Route
          path="/memory"
          element={
            <Suspense fallback={<PageFallback />}>
              <MemoryPage
                messages={messages}
                summary={summary}
                voiceNotes={voiceNotes}
                imageMemories={imageMemories}
                onDeleteVoiceNote={onDeleteVoiceNote}
                onDeleteImageMemory={onDeleteImage}
              />
            </Suspense>
          }
        />
        <Route
          path="/settings"
          element={
            <Suspense fallback={<PageFallback />}>
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
                onRefreshModelList={onRefreshModelList}
              />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
