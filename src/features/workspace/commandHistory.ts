const COMMAND_HISTORY_KEY = 'structureco.command-history.v1';
const MAX_COMMAND_HISTORY = 5;

interface CommandHistoryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export const readCommandHistory = (storage: CommandHistoryStorage): string[] => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(COMMAND_HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, MAX_COMMAND_HISTORY);
  } catch {
    return [];
  }
};

export const rememberCommand = (storage: CommandHistoryStorage, commandId: string): string[] => {
  const next = [commandId, ...readCommandHistory(storage).filter((value) => value !== commandId)].slice(0, MAX_COMMAND_HISTORY);
  try {
    storage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Local history is a convenience; a restricted storage must never block a command.
  }
  return next;
};
