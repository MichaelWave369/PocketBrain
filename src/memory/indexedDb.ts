import type { AppSettings, ChatMessage, MemorySummary } from '../types';
import type { VoiceNote } from '../voice/types';

const DB_NAME = 'pocketbrain-db';
const DB_VERSION = 2;
const CHAT_STORE = 'chat_messages';
const SUMMARY_STORE = 'memory_summary';
const SETTINGS_STORE = 'settings';
const VOICE_STORE = 'voice_notes';
const BRIDGES_STORE = 'trusted_bridges';

const openDb = async (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SUMMARY_STORE)) {
        db.createObjectStore(SUMMARY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(VOICE_STORE)) {
        db.createObjectStore(VOICE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BRIDGES_STORE)) {
        db.createObjectStore(BRIDGES_STORE, { keyPath: 'id' });
      }
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
  const item = await withStore<{ id: string } & AppSettings | undefined>(
    SETTINGS_STORE,
    'readonly',
    (store) => store.get('app-settings')
  );

  if (!item) {
    return null;
  }

  const settings = item as AppSettings & { id: string };
  return {
    localOnlyMode: settings.localOnlyMode ?? true,
    selectedModel: settings.selectedModel ?? 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    useWebWorker: settings.useWebWorker ?? true,
    useIndexedDbCache: settings.useIndexedDbCache ?? false,
    providerType: settings.providerType ?? 'local-webllm',
    bridgeEndpointUrl: settings.bridgeEndpointUrl ?? '',
    bridgeModelName: settings.bridgeModelName ?? '',
    bridgeApiKey: settings.bridgeApiKey ?? '',
    rememberBridgeSettings: settings.rememberBridgeSettings ?? true,
    bridgeFallbackToLocal: settings.bridgeFallbackToLocal ?? true
  };
};

export const clearBridgeSettings = async (): Promise<void> => {
  await withStore(SETTINGS_STORE, 'readwrite', (store) => store.delete('app-settings'));
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

export const exportMemory = async (): Promise<string> => {
  const [messages, summary, settings, voiceNotes, trustedBridgeEndpoints] = await Promise.all([
    getMessages(),
    getSummary(),
    getSettings(),
    getVoiceNotes(),
    getTrustedBridgeEndpoints()
  ]);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      messages,
      summary,
      settings,
      voiceNotes,
      trustedBridgeEndpoints
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
  };

  await clearMessages();
  await clearSummaries();
  await clearVoiceNotes();
  await replaceTrustedBridgeEndpoints([]);

  if (parsed.messages?.length) {
    await Promise.all(parsed.messages.map((message) => saveMessage(message)));
  }

  if (parsed.summary) {
    await saveSummary(parsed.summary);
  }

  if (parsed.settings) {
    await saveSettings(parsed.settings);
  }

  if (parsed.voiceNotes?.length) {
    await Promise.all(parsed.voiceNotes.map((note) => saveVoiceNote(note)));
  }

  if (parsed.trustedBridgeEndpoints?.length) {
    await replaceTrustedBridgeEndpoints(parsed.trustedBridgeEndpoints);
  }
};

export const clearAllLocalData = async (): Promise<void> => {
  await Promise.all([clearMessages(), clearSummaries(), clearVoiceNotes(), clearBridgeSettings()]);
};
