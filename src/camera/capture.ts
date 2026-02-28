export const getImageDimensions = async (blob: Blob): Promise<{ width?: number; height?: number }> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return {};
  }
};

export const normalizeImageFromFile = async (
  file: File,
  source: 'camera' | 'upload'
): Promise<{ blob: Blob; mimeType: string; source: 'camera' | 'upload'; width?: number; height?: number }> => {
  const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' });
  const dims = await getImageDimensions(blob);
  return { blob, mimeType: blob.type, source, ...dims };
};
