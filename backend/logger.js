function compactMeta(meta = {}) {
  return Object.fromEntries(
    Object.entries(meta).filter(([, value]) => value !== undefined)
  );
}

function write(level, event, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...compactMeta(meta),
  };

  const serialized = JSON.stringify(entry);
  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

export const logger = {
  info(event, meta = {}) {
    write('info', event, meta);
  },
  warn(event, meta = {}) {
    write('warn', event, meta);
  },
  error(event, meta = {}) {
    write('error', event, meta);
  },
};

export default logger;
