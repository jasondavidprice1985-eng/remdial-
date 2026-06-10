import { pool } from '../db';

/**
 * Log an action to the audit trail.
 * Called from every ticket action route to record who did what and when.
 */
export async function logAudit(
  ticketId: string,
  action: string,
  changedBy: string,
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (ticket_id, action, changed_by, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [ticketId, action, changedBy, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
    );
  } catch (err) {
    // Audit logging should never break the main flow
    console.error('[AUDIT] Failed to log:', err);
  }
}
