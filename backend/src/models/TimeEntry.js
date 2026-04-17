/**
 * TimeEntry Model
 * Handles all time entry-related database operations with soft delete support
 */

const BaseModel = require('./BaseModel');

class TimeEntryModel extends BaseModel {
  constructor(db) {
    super('time_entries', db);
  }

  /**
   * Get time entries for a task
   * @param {number} taskId - Task ID
   * @param {object} options - Filter options
   */
  async getEntriesByTask(taskId, options = {}) {
    const { includeDeleted = false } = options;

    let query = `SELECT * FROM time_entries WHERE task_id = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY date DESC`;

    const result = await this.db.query(query, [taskId]);
    return result.rows;
  }

  /**
   * Get time entries for a lawyer
   * @param {number} lawyerId - Lawyer ID
   * @param {object} options - Filter options
   */
  async getEntriesByLawyer(lawyerId, options = {}) {
    const {
      includeDeleted = false,
      dateFrom = null,
      dateTo = null,
    } = options;

    let query = `SELECT * FROM time_entries WHERE lawyer_id = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    const params = [lawyerId];
    let paramIndex = 2;

    if (dateFrom) {
      query += ` AND date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY date DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get time entries for a date range
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @param {object} options - Filter options
   */
  async getEntriesByDateRange(dateFrom, dateTo, options = {}) {
    const { includeDeleted = false, lawyerId = null } = options;

    let query = `
      SELECT * FROM time_entries 
      WHERE date >= $1 AND date <= $2
    `;

    const params = [dateFrom, dateTo];
    let paramIndex = 3;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    if (lawyerId) {
      query += ` AND lawyer_id = $${paramIndex}`;
      params.push(lawyerId);
      paramIndex++;
    }

    query += ` ORDER BY date DESC, created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Get time entry statistics
   * @param {object} options - Filter options
   */
  async getStats(options = {}) {
    const { lawyerId = null, dateFrom = null, dateTo = null } = options;

    let query = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(hours) as total_hours,
        AVG(hours) as avg_hours,
        MAX(hours) as max_hours
      FROM time_entries
      WHERE deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (lawyerId) {
      query += ` AND lawyer_id = $${paramIndex}`;
      params.push(lawyerId);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Get billable hours for a lawyer in date range
   * @param {number} lawyerId - Lawyer ID
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   */
  async getBillableHours(lawyerId, dateFrom, dateTo) {
    const query = `
      SELECT 
        SUM(hours) as billable_hours,
        COUNT(*) as entry_count,
        SUM(hours * hourly_rate) as revenue
      FROM time_entries
      WHERE lawyer_id = $1 
      AND date >= $2 
      AND date <= $3
      AND deleted_at IS NULL
      AND billable = true
    `;

    const result = await this.db.query(query, [lawyerId, dateFrom, dateTo]);
    return result.rows[0];
  }

  /**
   * Find time entries by status
   * @param {string} status - Entry status (billable, unbillable, approved)
   * @param {object} options - Filter options
   */
  async findByStatus(status, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM time_entries
      WHERE status = $1 AND deleted_at IS NULL
      ORDER BY date DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [status, limit, offset]);
    return result.rows;
  }

  /**
   * Get unbilled entries for invoice generation
   * @param {object} options - Filter options
   */
  async getUnbilledEntries(options = {}) {
    const { lawyerId = null, limit = 1000 } = options;

    let query = `
      SELECT * FROM time_entries
      WHERE billable = true 
      AND billed = false 
      AND deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    if (lawyerId) {
      query += ` AND lawyer_id = $${paramIndex}`;
      params.push(lawyerId);
      paramIndex++;
    }

    query += ` ORDER BY date ASC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Mark time entries as billed
   * @param {array} entryIds - Array of entry IDs
   */
  async markAsBilled(entryIds) {
    const placeholders = entryIds.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      UPDATE time_entries 
      SET billed = true, updated_at = NOW()
      WHERE id IN (${placeholders})
      RETURNING *
    `;

    const result = await this.db.query(query, entryIds);
    return result.rows;
  }
}

module.exports = TimeEntryModel;
