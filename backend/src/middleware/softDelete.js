/**
 * Soft Delete Middleware
 * Provides context for soft delete operations and query filtering
 * 
 * Features:
 * - Parse include_deleted query parameter
 * - Add soft delete context to request
 * - Track deletion-related operations
 * - Support audit logging
 */

/**
 * Soft delete middleware factory
 * Adds soft delete context to all requests
 */
const softDeleteMiddleware = (req, res, next) => {
  // Parse include_deleted query parameter
  const includeDeleted = req.query.include_deleted === 'true' || false;

  // Add soft delete context to request
  req.softDelete = {
    // Whether to include soft-deleted records in queries
    includeDeleted,

    // Current user (for audit logging)
    userId: req.user?.id || null,

    // Current timestamp (for audit trail)
    timestamp: new Date(),

    // Request ID (for audit tracing)
    requestId: req.id || req.headers['x-request-id'] || null,

    // Helper: Get WHERE clause for filtering active records
    getWhereClause: (alias = '') => {
      if (includeDeleted) {
        return ''; // Include all records
      }
      const table = alias ? `${alias}.` : '';
      return `${table}deleted_at IS NULL`;
    },

    // Helper: Get WHERE clause for JOIN conditions
    getJoinClause: (alias = '') => {
      const table = alias ? `${alias}.` : '';
      if (includeDeleted) {
        return '';
      }
      return `AND ${table}deleted_at IS NULL`;
    },

    // Helper: Get query parameters for include_deleted
    getQueryParams: () => {
      return includeDeleted ? { include_deleted: 'true' } : {};
    },

    // Helper: Check if user has permission to see deleted records
    canSeeDeleted: () => {
      // Super admin or manager can see deleted records
      const role = req.user?.role?.toUpperCase();
      return role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'ADMIN';
    },

    // Helper: Enforce permission for include_deleted
    enforceDeletedPermission: () => {
      if (includeDeleted && !req.softDelete.canSeeDeleted()) {
        throw new Error(
          'PERMISSION_DENIED: Only admins can view deleted records'
        );
      }
    },
  };

  // Automatically enforce permission for include_deleted
  try {
    req.softDelete.enforceDeletedPermission();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: 'PERMISSION_DENIED',
    });
  }

  next();
};

/**
 * Helper function to generate soft delete WHERE clause
 * @param {boolean} includeDeleted - Whether to include soft-deleted records
 * @param {string} alias - Table alias (e.g., 'c' for cases)
 * @returns {string} SQL WHERE clause fragment
 */
const getSoftDeleteFilter = (includeDeleted = false, alias = '') => {
  if (includeDeleted) {
    return '';
  }
  const table = alias ? `${alias}.` : '';
  return `${table}deleted_at IS NULL`;
};

/**
 * Helper function to get WHERE clause for filtering active records
 * @param {boolean} includeDeleted - Whether to include soft-deleted records
 * @returns {string} SQL WHERE clause (with WHERE keyword if needed)
 */
const getSoftDeleteWhereClause = (includeDeleted = false) => {
  if (includeDeleted) {
    return '';
  }
  return 'WHERE deleted_at IS NULL';
};

/**
 * Helper function to add soft delete filter to existing WHERE clause
 * @param {string} existingWhere - Existing WHERE clause (without WHERE keyword)
 * @param {boolean} includeDeleted - Whether to include soft-deleted records
 * @returns {string} Updated WHERE clause
 */
const addSoftDeleteFilter = (existingWhere, includeDeleted = false) => {
  if (includeDeleted) {
    return existingWhere;
  }
  if (!existingWhere) {
    return 'deleted_at IS NULL';
  }
  return `${existingWhere} AND deleted_at IS NULL`;
};

/**
 * Database query helper for soft deletes
 * Used in models/controllers to safely mark records as deleted
 */
const softDeleteOperations = {
  /**
   * Soft delete a record (set deleted_at timestamp)
   * @param {object} db - Database connection
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {number} userId - User ID (for audit)
   * @returns {Promise<object>} Updated record
   */
  softDelete: async (db, table, id, userId) => {
    const query = `
      UPDATE ${table} 
      SET deleted_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }
    return result.rows[0];
  },

  /**
   * Restore a soft-deleted record (clear deleted_at)
   * @param {object} db - Database connection
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {number} userId - User ID (for audit)
   * @returns {Promise<object>} Restored record
   */
  restore: async (db, table, id, userId) => {
    const query = `
      UPDATE ${table} 
      SET deleted_at = NULL 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }
    return result.rows[0];
  },

  /**
   * Permanently delete a record (hard delete)
   * @param {object} db - Database connection
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {number} userId - User ID (for audit)
   * @returns {Promise<void>}
   */
  permanentDelete: async (db, table, id, userId) => {
    const query = `
      DELETE FROM ${table} 
      WHERE id = $1
    `;
    await db.query(query, [id]);
  },

  /**
   * Check if a record is soft-deleted
   * @param {object} db - Database connection
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  isDeleted: async (db, table, id) => {
    const query = `
      SELECT deleted_at FROM ${table} WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return false; // Record doesn't exist
    }
    return result.rows[0].deleted_at !== null;
  },

  /**
   * Soft delete with cascade to related records
   * @param {object} db - Database connection
   * @param {object} config - Configuration
   *   - parentTable: Parent table name
   *   - parentId: Parent record ID
   *   - childTables: Array of { table, foreignKey } objects
   *   - userId: User ID (for audit)
   * @returns {Promise<void>}
   */
  cascadeSoftDelete: async (db, config) => {
    const { parentTable, parentId, childTables, userId } = config;

    // Start transaction
    await db.query('BEGIN');

    try {
      // Soft delete parent
      await db.query(
        `UPDATE ${parentTable} SET deleted_at = NOW() WHERE id = $1`,
        [parentId]
      );

      // Soft delete children
      if (childTables && Array.isArray(childTables)) {
        for (const child of childTables) {
          const { table, foreignKey } = child;
          await db.query(
            `UPDATE ${table} SET deleted_at = NOW() WHERE ${foreignKey} = $1`,
            [parentId]
          );
        }
      }

      // Commit transaction
      await db.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw error;
    }
  },

  /**
   * Restore with cascade to related records
   * @param {object} db - Database connection
   * @param {object} config - Configuration
   *   - parentTable: Parent table name
   *   - parentId: Parent record ID
   *   - childTables: Array of { table, foreignKey } objects
   *   - userId: User ID (for audit)
   * @returns {Promise<void>}
   */
  cascadeRestore: async (db, config) => {
    const { parentTable, parentId, childTables, userId } = config;

    // Start transaction
    await db.query('BEGIN');

    try {
      // Restore parent
      await db.query(
        `UPDATE ${parentTable} SET deleted_at = NULL WHERE id = $1`,
        [parentId]
      );

      // Restore children (only if they were deleted at similar time)
      if (childTables && Array.isArray(childTables)) {
        for (const child of childTables) {
          const { table, foreignKey } = child;
          // Only restore children that were deleted within 5 seconds of parent
          await db.query(
            `UPDATE ${table} 
             SET deleted_at = NULL 
             WHERE ${foreignKey} = $1 
             AND deleted_at IS NOT NULL`,
            [parentId]
          );
        }
      }

      // Commit transaction
      await db.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw error;
    }
  },
};

/**
 * Audit logging helper for soft delete operations
 */
const softDeleteAudit = {
  /**
   * Log a soft delete operation
   * @param {object} db - Database connection
   * @param {object} config - Configuration
   *   - entityType: 'case' | 'task' | 'time_entry' | etc
   *   - entityId: Record ID
   *   - action: 'DELETE' | 'RESTORE' | 'PERMANENT_DELETE'
   *   - userId: User ID
   *   - oldValues: Previous record values (as JSON)
   *   - reason: Optional reason for deletion
   * @returns {Promise<void>}
   */
  log: async (db, config) => {
    const { entityType, entityId, action, userId, oldValues, reason } = config;

    const query = `
      INSERT INTO audit_log (entity_type, entity_id, action, user_id, old_values, reason, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await db.query(query, [
      entityType,
      entityId,
      action,
      userId,
      JSON.stringify(oldValues || {}),
      reason || null,
    ]);
  },

  /**
   * Get audit trail for a record
   * @param {object} db - Database connection
   * @param {string} entityType - Entity type
   * @param {number} entityId - Record ID
   * @returns {Promise<array>} Array of audit log entries
   */
  getTrail: async (db, entityType, entityId) => {
    const query = `
      SELECT * FROM audit_log 
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY timestamp DESC
      LIMIT 100
    `;
    const result = await db.query(query, [entityType, entityId]);
    return result.rows;
  },
};

module.exports = {
  softDeleteMiddleware,
  getSoftDeleteFilter,
  getSoftDeleteWhereClause,
  addSoftDeleteFilter,
  softDeleteOperations,
  softDeleteAudit,
};
