import { useState } from 'react';
import { normalizeImageFromFile } from '../camera/capture';
import { describeImageLocally } from '../camera/imageAnalysis';
import { createImageMemory } from '../camera/imageStore';
import type { ImageMemory } from '../camera/types';
import { CameraCaptureButton } from '../components/CameraCaptureButton';
import { ImageMemoryCard } from '../components/ImageMemoryCard';

interface CapturePageProps {
  images: ImageMemory[];
  onSaveImage: (image: ImageMemory) => Promise<void>;
  onUpdateImage: (image: ImageMemory) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
  onAttachImageToChat: (id: string) => void;
}

export const CapturePage = ({ images, onSaveImage, onUpdateImage, onDeleteImage, onAttachImageToChat }: CapturePageProps) => {
  const [status, setStatus] = useState('');

  const ingest = async (file: File, source: 'camera' | 'upload') => {
    const normalized = await normalizeImageFromFile(file, source);
    const analysisSummary = await describeImageLocally(normalized.blob);
    await onSaveImage(
      createImageMemory({
        ...normalized,
        analysisSummary,
        caption: '',
        notes: ''
      })
    );
    setStatus('Image saved locally. Add notes to make it more searchable.');
  };

  return (
    <section className="panel">
      <h2>Capture</h2>
      <p className="helper-text">Capture from camera or upload from gallery. No auto-upload to bridge services.</p>
      <CameraCaptureButton onCameraFile={(file) => ingest(file, 'camera')} onUploadFile={(file) => ingest(file, 'upload')} />
      {status ? <p className="helper-text">{status}</p> : null}

      <div className="image-grid">
        {images.map((image) => (
          <ImageMemoryCard key={image.id} image={image} onUpdate={onUpdateImage} onDelete={onDeleteImage} onAttachToChat={onAttachImageToChat} />
        ))}
      </div>
    </section>
  );
};
