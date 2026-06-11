import pino from 'pino';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  // Strip message text from logs in production for privacy
  ...(process.env.NODE_ENV === 'production' ? {
    redact: {
      paths: ['text', 'msg', 'body'],
      censor: '[REDACTED]',
    },
  } : {}),
});
