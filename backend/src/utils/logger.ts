import pino from 'pino';

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  // Redact sensitive request-body fields from logs
  ...(process.env.NODE_ENV === 'production' ? {
    redact: {
      paths: ['password', 'current_password', 'new_password'],
      censor: '[REDACTED]',
    },
  } : {}),
});
