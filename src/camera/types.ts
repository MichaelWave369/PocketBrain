export interface ImageMemory {
  id: string;
  createdAt: number;
  source: 'camera' | 'upload';
  mimeType: string;
  width?: number;
  height?: number;
  blob: Blob;
  caption?: string;
  notes?: string;
  ocrText?: string;
  analysisSummary?: string;
  pinned?: boolean;
  linkedChatId?: string;
}
