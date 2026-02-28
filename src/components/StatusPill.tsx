import type { ModelStatus } from '../types';

const labelMap: Record<ModelStatus, string> = {
  idle: 'Idle',
  loading: 'Loading model',
  ready: 'Ready',
  generating: 'Generating',
  error: 'Error'
};

export const StatusPill = ({ status }: { status: ModelStatus }) => (
  <span className={`status-pill status-${status}`}>{labelMap[status]}</span>
);
