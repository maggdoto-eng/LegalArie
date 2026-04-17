/**
 * Task Model
 * Handles all task-related database operations with soft delete support
 */

const BaseModel = require('./BaseModel');

class TaskModel extends BaseModel {
  constructor(db) {
    super('tasks', db);
  }

  /**
   * Get task by ID with related data
   * @param {number} id - Task ID
   * @param {boolean} includeDeleted - Include soft-deleted records
   */
  async getTaskWithDetails(id, includeDeleted = false) {
    const task = await this.findById(id, includeDeleted);
    if (!task) {
      return null;
    }

    // Get related time entries
    let timeEntryQuery = `SELECT * FROM time_entries WHERE task_id = $1`;
    if (!includeDeleted) {
      timeEntryQuery += ` AND deleted_at IS NULL`;
    }
    timeEntryQuery += ` ORDER BY date DESC`;

    const timeEntryResult = await this.db.query(timeEntryQuery, [id]);

    return {
      ...task,
      timeEntries: timeEntryResult.rows,
    };
  }

  /**
   * Get tasks for a case
   * @param {number} caseId - Case ID
   * @param {object} options - Filter options
   */
  async getTasksByCase(caseId, options = {}) {
    const { includeDeleted = false, status = null } = options;

    let query = `SELECT * FROM tasks WHERE case_id = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    if (status) {
      query += ` AND status = $2`;
    }

    query += ` ORDER BY due_date ASC, created_at DESC`;

    const params = [caseId];
    if (status) {
      params.push(status);
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get tasks assigned to a user
   * @param {number} lawyerId - Lawyer ID
   * @param {object} options - Filter options
   */
  async getTasksByAssignee(lawyerId, options = {}) {
    const { includeDeleted = false, status = null } = options;

    let query = `SELECT * FROM tasks WHERE assigned_to = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    if (status) {
      query += ` AND status = $2`;
    }

    query += ` ORDER BY due_date ASC`;

    const params = [lawyerId];
    if (status) {
      params.push(status);
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get overdue tasks
   * @param {object} options - Filter options
   */
  async getOverdueTasks(options = {}) {
    const { includeDeleted = false, lawyerId = null } = options;

    let query = `
      SELECT * FROM tasks 
      WHERE due_date < NOW() 
      AND status != 'closed'
    `;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    if (lawyerId) {
      query += ` AND assigned_to = $1`;
    }

    query += ` ORDER BY due_date ASC`;

    const params = lawyerId ? [lawyerId] : [];
    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get task statistics
   * @param {object} options - Filter options
   */
  async getStats(options = {}) {
    const { caseId = null, lawyerId = null } = options;

    let query = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN due_date < NOW() AND status != 'closed' THEN 1 END) as overdue_tasks
      FROM tasks
      WHERE deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (caseId) {
      query += ` AND case_id = $${paramIndex}`;
      params.push(caseId);
      paramIndex++;
    }

    if (lawyerId) {
      query += ` AND assigned_to = $${paramIndex}`;
      params.push(lawyerId);
      paramIndex++;
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Find tasks by status
   * @param {string} status - Task status
   * @param {object} options - Filter options
   */
  async findByStatus(status, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM tasks
      WHERE status = $1 AND deleted_at IS NULL
      ORDER BY due_date ASC, created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [status, limit, offset]);
    return result.rows;
  }

  /**
   * Search tasks
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   */
  async search(searchTerm, options = {}) {
    const { limit = 20 } = options;
    const query = `
      SELECT * FROM tasks
      WHERE deleted_at IS NULL
      AND (
        title ILIKE $1
        OR description ILIKE $1
      )
      ORDER BY due_date ASC
      LIMIT $2
    `;

    const result = await this.db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }
}

module.exports = TaskModel;
