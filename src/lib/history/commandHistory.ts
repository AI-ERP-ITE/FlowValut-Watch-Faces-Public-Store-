export type HistoryCommand<T> = {
  id: string;
  label: string;
  before: T;
  after: T;
  createdAt: number;
};

type HistoryStacks<T> = {
  past: Array<HistoryCommand<T>>;
  future: Array<HistoryCommand<T>>;
};

type UndoRedoResult<T> = {
  template: T | null;
  command: HistoryCommand<T> | null;
  stacks: HistoryStacks<T>;
};

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function pushHistoryCommand<T>(
  past: Array<HistoryCommand<T>>,
  command: HistoryCommand<T>,
  limit = 150,
): HistoryStacks<T> {
  const nextPast = [...past, command];
  const trimmedPast = nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast;
  return {
    past: trimmedPast,
    future: [],
  };
}

export function undoHistory<T>(
  past: Array<HistoryCommand<T>>,
  future: Array<HistoryCommand<T>>,
): UndoRedoResult<T> {
  if (past.length === 0) {
    return {
      template: null,
      command: null,
      stacks: { past, future },
    };
  }

  const command = past[past.length - 1];
  const nextPast = past.slice(0, -1);
  const nextFuture = [command, ...future];

  return {
    template: cloneValue(command.before),
    command,
    stacks: {
      past: nextPast,
      future: nextFuture,
    },
  };
}

export function redoHistory<T>(
  past: Array<HistoryCommand<T>>,
  future: Array<HistoryCommand<T>>,
): UndoRedoResult<T> {
  if (future.length === 0) {
    return {
      template: null,
      command: null,
      stacks: { past, future },
    };
  }

  const [command, ...nextFuture] = future;
  const nextPast = [...past, command];

  return {
    template: cloneValue(command.after),
    command,
    stacks: {
      past: nextPast,
      future: nextFuture,
    },
  };
}
