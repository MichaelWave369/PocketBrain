interface SyncStatusBadgeProps {
  label: string;
}

export const SyncStatusBadge = ({ label }: SyncStatusBadgeProps) => {
  const isOnline = label !== 'offline';
  return (
    <span
      className="provider-badge sync-badge"
      style={{ borderColor: isOnline ? '#16a34a' : '#334155', color: isOnline ? '#86efac' : '#94a3b8' }}
      title={isOnline ? `Syncing with ${label}` : 'Sync offline — add a trusted device in Settings'}
    >
      {isOnline ? '⇄' : '○'} {label}
    </span>
  );
};
