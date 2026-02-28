import type { ImageMemory } from './types';
import { createId } from '../utils/id';

export const createImageMemory = (input: Omit<ImageMemory, 'id' | 'createdAt'>): ImageMemory => ({
  id: createId(),
  createdAt: Date.now(),
  ...input
});
