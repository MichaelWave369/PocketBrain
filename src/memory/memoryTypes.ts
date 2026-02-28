export type MemoryItemType = 'chat_message' | 'summary' | 'voice_note' | 'image_memory';

export interface MemoryIndexItem {
  id: string;
  type: MemoryItemType;
  createdAt: number;
  text: string;
  pinned?: boolean;
}
