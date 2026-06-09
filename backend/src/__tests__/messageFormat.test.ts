import { describe, it, expect } from 'vitest';

async function loadModule() {
  return import('../../../shared/messageFormat');
}

describe('formatMessageTime', () => {
  it('returns only time for today', async () => {
    const { formatMessageTime } = await loadModule();
    const today = new Date();
    const result = formatMessageTime(today.toISOString());
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('returns date + time for older messages', async () => {
    const { formatMessageTime } = await loadModule();
    const oldDate = new Date('2025-01-15T14:30:00Z');
    const result = formatMessageTime(oldDate.toISOString());
    expect(result).toContain('·');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('senderLabel', () => {
  it('returns "You" when viewer matches sender', async () => {
    const { senderLabel } = await loadModule();
    expect(senderLabel('manager', 'manager')).toBe('You');
    expect(senderLabel('office', 'office')).toBe('You');
  });

  it('returns "Manager" when office views manager messages', async () => {
    const { senderLabel } = await loadModule();
    expect(senderLabel('manager', 'office')).toBe('Manager');
  });

  it('returns "Admin" when manager views office messages', async () => {
    const { senderLabel } = await loadModule();
    expect(senderLabel('office', 'manager')).toBe('Admin');
  });
});

describe('ownMessageStatus', () => {
  it('returns null for messages from other sender', async () => {
    const { ownMessageStatus } = await loadModule();
    const msg = {
      id: 'msg-1', ticket_id: 't-1', sender: 'manager' as const,
      text: 'hello', audio_path: null, image_path: null,
      is_query: false, read_at: null, created_at: '2026-01-01T00:00:00Z',
    };
    expect(ownMessageStatus(msg, 'office')).toBeNull();
  });

  it('returns "Sent" for unread own messages', async () => {
    const { ownMessageStatus } = await loadModule();
    const msg = {
      id: 'msg-1', ticket_id: 't-1', sender: 'manager' as const,
      text: 'hello', audio_path: null, image_path: null,
      is_query: false, read_at: null, created_at: '2026-01-01T00:00:00Z',
    };
    expect(ownMessageStatus(msg, 'manager')).toBe('Sent');
  });

  it('returns "Read" for read own messages', async () => {
    const { ownMessageStatus } = await loadModule();
    const msg = {
      id: 'msg-1', ticket_id: 't-1', sender: 'office' as const,
      text: 'hello', audio_path: null, image_path: null,
      is_query: false, read_at: '2026-01-01T01:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    };
    expect(ownMessageStatus(msg, 'office')).toBe('Read');
  });
});
