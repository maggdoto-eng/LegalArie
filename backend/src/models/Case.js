/**
 * Case Model
 * Handles all case-related database operations with soft delete support
 */

const BaseModel = require('./BaseModel');

class CaseModel extends BaseModel {
  constructor(db) {
    super('cases', db);
  }

  /**
   * Get case by ID with related tasks
   * @param {number} id - Case ID
   * @param {boolean} includeDeleted - Include soft-deleted records
   */
  async getCaseWithTasks(id, includeDeleted = false) {
    const caseRecord = await this.findById(id, includeDeleted);
    if (!caseRecord) {
      return null;
    }

    // Get related tasks
    let taskQuery = `SELECT * FROM tasks WHERE case_id = $1`;
    if (!includeDeleted) {
      taskQuery += ` AND deleted_at IS NULL`;
    }
    taskQuery += ` ORDER BY created_at DESC`;

    const taskResult = await this.db.query(taskQuery, [id]);

    return {
      ...caseRecord,
      tasks: taskResult.rows,
    };
  }

  /**
   * Get case statistics
   * @param {object} options - Filter options
   */
  async getStats(options = {}) {
    const { lawyerId = null, clientId = null } = options;

    let query = `
      SELECT 
        COUNT(*) as total_cases,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_cases,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cases,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_cases
      FROM cases
      WHERE deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (lawyerId) {
      query += ` AND lawyer_id = $${paramIndex}`;
      params.push(lawyerId);
      paramIndex++;
    }

    if (clientId) {
      query += ` AND client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Soft delete case and cascade to related tasks
   * @param {number} id - Case ID
   * @param {number} userId - User ID (for audit)
   */
  async softDeleteWithCascade(id, userId = null) {
    // Start transaction
    await this.db.query('BEGIN');

    try {
      // Soft delete the case
      await this.softDelete(id, userId);

      // Soft delete all related tasks
      const tasksQuery = `
        UPDATE tasks 
        SET deleted_at = NOW()
        WHERE case_id = $1 AND deleted_at IS NULL
      `;
      await this.db.query(tasksQuery, [id]);

      // Commit transaction
      await this.db.query('COMMIT');

      return true;
    } catch (error) {
      // Rollback on error
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Restore case and optionally cascade to related tasks
   * @param {number} id - Case ID
   * @param {number} userId - User ID (for audit)
   * @param {boolean} restoreChildren - Restore related soft-deleted tasks
   */
  async restoreWithCascade(id, userId = null, restoreChildren = true) {
    // Start transaction
    await this.db.query('BEGIN');

    try {
      // Restore the case
      await this.restore(id, userId);

      // Optionally restore related tasks
      if (restoreChildren) {
        const tasksQuery = `
          UPDATE tasks 
          SET deleted_at = NULL
          WHERE case_id = $1 AND deleted_at IS NOT NULL
        `;
        await this.db.query(tasksQuery, [id]);
      }

      // Commit transaction
      await this.db.query('COMMIT');

      return true;
    } catch (error) {
      // Rollback on error
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Find cases by status with pagination
   * @param {string} status - Case status (open, active, closed)
   * @param {object} options - Pagination options
   */
  async findByStatus(status, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const where = `status = $1 AND deleted_at IS NULL`;
    const query = `
      SELECT * FROM cases
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [status, limit, offset]);
    return result.rows;
  }

  /**
   * Search cases by title or description
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   */
  async search(searchTerm, options = {}) {
    const { limit = 20 } = options;
    const query = `
      SELECT * FROM cases
      WHERE deleted_at IS NULL
      AND (
        title ILIKE $1
        OR description ILIKE $1
        OR id::text = $2
      )
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [
      `%${searchTerm}%`,
      searchTerm,
      limit,
    ]);
    return result.rows;
  }
}

module.exports = CaseModel;
