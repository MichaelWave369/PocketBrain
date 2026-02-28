import type { ImageMemory } from '../camera/types';
import type { TrustedDevice } from '../sync/types';
import type { AppSettings, ChatMessage, MemorySummary } from '../types';
import type { VoiceNote } from '../voice/types';

const DB_NAME = 'pocketbrain-db';
const DB_VERSION = 3;
const CHAT_STORE = 'chat_messages';
const SUMMARY_STORE = 'memory_summary';
const SETTINGS_STORE = 'settings';
const VOICE_STORE = 'voice_notes';
const BRIDGES_STORE = 'trusted_bridges';
const IMAGE_STORE = 'image_memory';
const DEVICES_STORE = 'trusted_devices';

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      [CHAT_STORE, SUMMARY_STORE, SETTINGS_STORE, VOICE_STORE, BRIDGES_STORE, IMAGE_STORE, DEVICES_STORE].forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
};

export const saveMessage = async (message: ChatMessage): Promise<void> => {
  await withStore(CHAT_STORE, 'readwrite', (store) => store.put(message));
};

export const getMessages = async (): Promise<ChatMessage[]> => {
  const messages = await withStore(CHAT_STORE, 'readonly', (store) => store.getAll());
  return messages.sort((a, b) => a.createdAt - b.createdAt);
};

export const clearMessages = async (): Promise<void> => {
  await withStore(CHAT_STORE, 'readwrite', (store) => store.clear());
};

export const saveSummary = async (summary: MemorySummary): Promise<void> => {
  await withStore(SUMMARY_STORE, 'readwrite', (store) => store.put(summary));
};

export const getSummary = async (): Promise<MemorySummary | null> => {
  const summaries = await withStore(SUMMARY_STORE, 'readonly', (store) => store.getAll());
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
};

export const clearSummaries = async (): Promise<void> => {
  await withStore(SUMMARY_STORE, 'readwrite', (store) => store.clear());
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await withStore(SETTINGS_STORE, 'readwrite', (store) => store.put({ ...settings, id: 'app-settings' }));
};

export const getSettings = async (): Promise<AppSettings | null> => {
  const item = await withStore<{ id: string } & Partial<AppSettings> | undefined>(
    SETTINGS_STORE,
    'readonly',
    (store) => store.get('app-settings')
  );

  if (!item) return null;

  return {
    localOnlyMode: item.localOnlyMode ?? true,
    selectedModel: item.selectedModel ?? 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    useWebWorker: item.useWebWorker ?? true,
    useIndexedDbCache: item.useIndexedDbCache ?? false,
    providerType: item.providerType ?? 'local-webllm',
    bridgeEndpointUrl: item.bridgeEndpointUrl ?? '',
    bridgeModelName: item.bridgeModelName ?? '',
    bridgeApiKey: item.bridgeApiKey ?? '',
    rememberBridgeSettings: item.rememberBridgeSettings ?? true,
    bridgeFallbackToLocal: item.bridgeFallbackToLocal ?? true,
    ttsEnabled: item.ttsEnabled ?? false,
    ttsAutoReadReplies: item.ttsAutoReadReplies ?? false,
    ttsVoiceURI: item.ttsVoiceURI ?? '',
    ttsRate: item.ttsRate ?? 1,
    ttsPitch: item.ttsPitch ?? 1,
    ttsVolume: item.ttsVolume ?? 1,
    confirmBeforeBridgeImageAnalysis: item.confirmBeforeBridgeImageAnalysis ?? true,
    imageCompressionPreference: item.imageCompressionPreference ?? 'original'
  };
};

export const clearBridgeSettings = async (): Promise<void> => {
  const settings = await getSettings();
  if (!settings) return;

  await saveSettings({
    ...settings,
    providerType: 'local-webllm',
    bridgeEndpointUrl: '',
    bridgeModelName: '',
    bridgeApiKey: ''
  });
  await withStore(BRIDGES_STORE, 'readwrite', (store) => store.clear());
};

export const saveVoiceNote = async (note: VoiceNote): Promise<void> => {
  await withStore(VOICE_STORE, 'readwrite', (store) => store.put(note));
};

export const getVoiceNotes = async (): Promise<VoiceNote[]> => {
  const notes = await withStore<VoiceNote[]>(VOICE_STORE, 'readonly', (store) => store.getAll());
  return notes.sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteVoiceNote = async (id: string): Promise<void> => {
  await withStore(VOICE_STORE, 'readwrite', (store) => store.delete(id));
};

export const clearVoiceNotes = async (): Promise<void> => {
  await withStore(VOICE_STORE, 'readwrite', (store) => store.clear());
};

export const saveImageMemory = async (image: ImageMemory): Promise<void> => {
  await withStore(IMAGE_STORE, 'readwrite', (store) => store.put(image));
};

export const getImageMemories = async (): Promise<ImageMemory[]> => {
  const entries = await withStore<ImageMemory[]>(IMAGE_STORE, 'readonly', (store) => store.getAll());
  return entries.sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteImageMemory = async (id: string): Promise<void> => {
  await withStore(IMAGE_STORE, 'readwrite', (store) => store.delete(id));
};

export const clearImageMemories = async (): Promise<void> => {
  await withStore(IMAGE_STORE, 'readwrite', (store) => store.clear());
};

export const saveTrustedBridgeEndpoint = async (endpoint: string): Promise<void> => {
  await withStore(BRIDGES_STORE, 'readwrite', (store) => store.put({ id: endpoint, endpoint, updatedAt: Date.now() }));
};

export const getTrustedBridgeEndpoints = async (): Promise<string[]> => {
  const entries = await withStore<Array<{ endpoint?: string; id?: string; updatedAt?: number }>>(
    BRIDGES_STORE,
    'readonly',
    (store) => store.getAll()
  );

  return entries
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .map((entry) => entry.endpoint ?? entry.id)
    .filter((endpoint): endpoint is string => Boolean(endpoint));
};

export const replaceTrustedBridgeEndpoints = async (endpoints: string[]): Promise<void> => {
  await withStore(BRIDGES_STORE, 'readwrite', (store) => store.clear());
  await Promise.all(endpoints.map((endpoint) => saveTrustedBridgeEndpoint(endpoint)));
};

export const saveTrustedDevice = async (device: TrustedDevice): Promise<void> => {
  await withStore(DEVICES_STORE, 'readwrite', (store) => store.put(device));
};

export const getTrustedDevices = async (): Promise<TrustedDevice[]> => {
  const devices = await withStore<TrustedDevice[]>(DEVICES_STORE, 'readonly', (store) => store.getAll());
  return devices.sort((a, b) => (b.lastSyncAt ?? 0) - (a.lastSyncAt ?? 0));
};

export const deleteTrustedDevice = async (id: string): Promise<void> => {
  await withStore(DEVICES_STORE, 'readwrite', (store) => store.delete(id));
};

export const exportMemory = async (): Promise<string> => {
  const [messages, summary, settings, voiceNotes, trustedBridgeEndpoints, imageMemories, trustedDevices] = await Promise.all([
    getMessages(),
    getSummary(),
    getSettings(),
    getVoiceNotes(),
    getTrustedBridgeEndpoints(),
    getImageMemories(),
    getTrustedDevices()
  ]);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      messages,
      summary,
      settings,
      voiceNotes,
      trustedBridgeEndpoints,
      imageMemories,
      trustedDevices
    },
    null,
    2
  );
};

export const importMemory = async (raw: string): Promise<void> => {
  const parsed = JSON.parse(raw) as {
    messages?: ChatMessage[];
    summary?: MemorySummary;
    settings?: AppSettings;
    voiceNotes?: VoiceNote[];
    trustedBridgeEndpoints?: string[];
    imageMemories?: ImageMemory[];
    trustedDevices?: TrustedDevice[];
  };

  await clearAllLocalData();

  if (parsed.messages?.length) await Promise.all(parsed.messages.map((message) => saveMessage(message)));
  if (parsed.summary) await saveSummary(parsed.summary);
  if (parsed.settings) await saveSettings(parsed.settings);
  if (parsed.voiceNotes?.length) await Promise.all(parsed.voiceNotes.map((note) => saveVoiceNote(note)));
  if (parsed.imageMemories?.length) await Promise.all(parsed.imageMemories.map((image) => saveImageMemory(image)));
  if (parsed.trustedBridgeEndpoints?.length) await replaceTrustedBridgeEndpoints(parsed.trustedBridgeEndpoints);
  if (parsed.trustedDevices?.length) await Promise.all(parsed.trustedDevices.map((device) => saveTrustedDevice(device)));
};

export const clearAllLocalData = async (): Promise<void> => {
  await Promise.all([
    clearMessages(),
    clearSummaries(),
    clearVoiceNotes(),
    clearImageMemories(),
    withStore(BRIDGES_STORE, 'readwrite', (store) => store.clear()),
    withStore(DEVICES_STORE, 'readwrite', (store) => store.clear())
  ]);
};
