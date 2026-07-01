export function formatTimeAgo(date) {
  if (!date) return 'Nenhuma sincronização ainda';
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Sincronizado agora';
  if (mins < 60) return `Sincronizado há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Sincronizado há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Sincronizado há ${days}d`;
}
