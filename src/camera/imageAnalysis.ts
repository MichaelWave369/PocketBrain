export const describeImageLocally = async (_blob: Blob): Promise<string> => {
  return 'Image captured and stored locally. Add manual notes for searchable memory.';
};

export const describeImageWithBridge = async (): Promise<string> => {
  throw new Error('Bridge image analysis is not implemented yet. Configure future provider describeImage endpoint.');
};
