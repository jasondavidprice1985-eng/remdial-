import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Too many requests, please try again later' },
});

/** Strict limiter for login — 5 attempts per minute per IP */
export const loginLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Too many login attempts. Please wait a minute and try again.' },
});
