import { Pool } from 'pg';

/**
 * Soft delete utilities
 * Ensures deleted data is preserved for compliance/audit
 * 
 * Usage:
 *   await softDelete(db, 'cases', caseId, firmId, userId);
 *   const cases = await getSoftDeleted(db, 'cases', firmId);
 *   const caseData = await getCaseWithoutDeleted(db, 'cases', caseId, firmId);
 */

/**
 * Soft delete a record (set deleted_at timestamp)
 */
export const softDelete = async (
  db: Pool,
  table: string,
  id: string,
  firmId: string,
  deletedByUserId: string,
  reason?: string
): Promise<boolean> => {
  try {
    // Tables that support soft delete
    const supportedTables = [
      'users',
      'clients',
      'cases',
      'tasks',
      'messages',
      'documents',
      'case_team',
    ];

    if (!supportedTables.includes(table)) {
      throw new Error(`Soft delete not supported for table: ${table}`);
    }

    // Update record with deleted_at timestamp
    const result = await db.query(
      `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND firm_id = $2`,
      [id, firmId]
    );

    // Log to audit trail
    await logDeletion(db, {
      table,
      recordId: id,
      firmId,
      deletedByUserId,
      reason,
    });

    return result.rowCount! > 0;
  } catch (error) {
    console.error(`Error soft deleting from ${table}:`, error);
    throw error;
  }
};

/**
 * Restore a soft-deleted record
 */
export const restoreSoftDeleted = async (
  db: Pool,
  table: string,
  id: string,
  firmId: string,
  restoredByUserId: string
): Promise<boolean> => {
  try {
    const result = await db.query(
      `UPDATE ${table} SET deleted_at = NULL WHERE id = $1 AND firm_id = $2 AND deleted_at IS NOT NULL`,
      [id, firmId]
    );

    // Log restoration
    await logDeletion(db, {
      table,
      recordId: id,
      firmId,
      deletedByUserId: restoredByUserId,
      reason: 'RESTORED',
    });

    return result.rowCount! > 0;
  } catch (error) {
    console.error(`Error restoring from ${table}:`, error);
    throw error;
  }
};

/**
 * Query helper: Get only non-deleted records
 */
export const buildNotDeletedWhere = (): string => {
  return 'deleted_at IS NULL';
};

/**
 * Query helper: Get only deleted records (for admin restore)
 */
export const buildDeletedWhere = (): string => {
  return 'deleted_at IS NOT NULL';
};

/**
 * Example queries:
 * 
 * Get active cases for a firm:
 *   SELECT * FROM cases 
 *   WHERE firm_id = $1 AND deleted_at IS NULL
 *   ORDER BY created_at DESC;
 * 
 * Get deleted cases (for restore):
 *   SELECT * FROM cases 
 *   WHERE firm_id = $1 AND deleted_at IS NOT NULL
 *   ORDER BY deleted_at DESC;
 * 
 * Count active cases:
 *   SELECT COUNT(*) FROM cases 
 *   WHERE firm_id = $1 AND deleted_at IS NULL;
 */

/**
 * Permanently delete a record (requires admin privileges)
 * This is rare - only after retention period expires
 */
export const permanentlyDelete = async (
  db: Pool,
  table: string,
  id: string,
  firmId: string,
  adminUserId: string,
  reason: string
): Promise<boolean> => {
  try {
    // Verify admin privileges
    const adminCheck = await db.query(
      'SELECT role FROM users WHERE id = $1 AND role = $2',
      [adminUserId, 'admin']
    );

    if (adminCheck.rowCount === 0) {
      throw new Error('Only admins can permanently delete records');
    }

    // Log permanent deletion before deleting
    await logDeletion(db, {
      table,
      recordId: id,
      firmId,
      deletedByUserId: adminUserId,
      reason: `PERMANENT_DELETE: ${reason}`,
    });

    // Permanently delete
    const result = await db.query(
      `DELETE FROM ${table} WHERE id = $1 AND firm_id = $2`,
      [id, firmId]
    );

    return result.rowCount! > 0;
  } catch (error) {
    console.error(`Error permanently deleting from ${table}:`, error);
    throw error;
  }
};

/**
 * Log deletion action to audit trail
 */
const logDeletion = async (
  db: Pool,
  {
    table,
    recordId,
    firmId,
    deletedByUserId,
    reason,
  }: {
    table: string;
    recordId: string;
    firmId: string;
    deletedByUserId: string;
    reason?: string;
  }
) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, timestamp)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        deletedByUserId,
        reason === 'RESTORED' ? 'RECORD_RESTORED' : 'RECORD_SOFT_DELETED',
        table,
        recordId,
        JSON.stringify({ firm_id: firmId, reason }),
      ]
    );
  } catch (error) {
    console.error('Error logging deletion:', error);
    // Don't throw - logging failure shouldn't fail the delete operation
  }
};

/**
 * Get deletion date for a record
 */
export const getDeletedAt = async (
  db: Pool,
  table: string,
  id: string
): Promise<Date | null> => {
  try {
    const result = await db.query(
      `SELECT deleted_at FROM ${table} WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) return null;
    return result.rows[0].deleted_at || null;
  } catch (error) {
    console.error(`Error getting deleted_at for ${table}:`, error);
    return null;
  }
};

/**
 * Check if record is soft-deleted
 */
export const isSoftDeleted = async (
  db: Pool,
  table: string,
  id: string
): Promise<boolean> => {
  try {
    const result = await db.query(
      `SELECT deleted_at FROM ${table} WHERE id = $1 AND deleted_at IS NOT NULL`,
      [id]
    );
    return result.rowCount! > 0;
  } catch (error) {
    console.error(`Error checking soft delete status for ${table}:`, error);
    return false;
  }
};
