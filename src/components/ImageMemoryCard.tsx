import { useMemo } from 'react';
import type { ImageMemory } from '../camera/types';

interface ImageMemoryCardProps {
  image: ImageMemory;
  onUpdate: (next: ImageMemory) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAttachToChat: (id: string) => void;
}

export const ImageMemoryCard = ({ image, onUpdate, onDelete, onAttachToChat }: ImageMemoryCardProps) => {
  const src = useMemo(() => URL.createObjectURL(image.blob), [image.blob]);

  return (
    <article className="card">
      <img src={src} alt={image.caption || 'Memory capture'} className="memory-image" />
      <input
        placeholder="Caption"
        value={image.caption ?? ''}
        onChange={(event) => void onUpdate({ ...image, caption: event.target.value })}
      />
      <textarea
        placeholder="Notes"
        value={image.notes ?? ''}
        onChange={(event) => void onUpdate({ ...image, notes: event.target.value })}
        rows={2}
      />
      <label className="settings-row">
        <span>Pin to long-term memory</span>
        <input
          type="checkbox"
          checked={Boolean(image.pinned)}
          onChange={(event) => void onUpdate({ ...image, pinned: event.target.checked })}
        />
      </label>
      <div className="settings-actions">
        <button className="ghost" onClick={() => onAttachToChat(image.id)}>Attach to chat</button>
        <button className="ghost danger" onClick={() => void onDelete(image.id)}>Delete</button>
      </div>
    </article>
  );
};
