/**
 * Base Database Model Class
 * Provides common CRUD operations with soft delete support
 */

class BaseModel {
  constructor(tableName, db) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Find all active records (soft delete aware)
   * @param {object} options - Query options
   *   - includeDeleted: Include soft-deleted records
   *   - where: Additional WHERE conditions
   *   - orderBy: ORDER BY clause
   *   - limit: LIMIT clause
   *   - offset: OFFSET clause
   */
  async findAll(options = {}) {
    const {
      includeDeleted = false,
      where = '',
      orderBy = 'created_at DESC',
      limit = null,
      offset = null,
    } = options;

    let query = `SELECT * FROM ${this.tableName}`;

    // Add soft delete filter
    const whereConditions = [];
    if (!includeDeleted) {
      whereConditions.push('deleted_at IS NULL');
    }
    if (where) {
      whereConditions.push(`(${where})`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` ORDER BY ${orderBy}`;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Find single record by ID (soft delete aware)
   * @param {number} id - Record ID
   * @param {boolean} includeDeleted - Include soft-deleted records
   */
  async findById(id, includeDeleted = false) {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find records by condition
   * @param {object} options - Query options
   *   - where: WHERE clause condition
   *   - values: Query values for parameterized queries
   *   - includeDeleted: Include soft-deleted records
   */
  async findWhere(options = {}) {
    const { where, values = [], includeDeleted = false } = options;

    let query = `SELECT * FROM ${this.tableName} WHERE ${where}`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    const result = await this.db.query(query, values);
    return result.rows;
  }

  /**
   * Count records
   * @param {object} options - Query options
   *   - where: WHERE clause condition
   *   - includeDeleted: Include soft-deleted records
   */
  async count(options = {}) {
    const { where = '', includeDeleted = false } = options;

    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    const conditions = [];
    if (!includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }
    if (where) {
      conditions.push(`(${where})`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.query(query);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Create a new record
   * @param {object} data - Record data
   */
  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   * @param {number} id - Record ID
   * @param {object} data - Data to update
   */
  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${columns.length + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await this.db.query(query, [...values, id]);
    return result.rows[0] || null;
  }

  /**
   * Soft delete a record (mark as deleted)
   * @param {number} id - Record ID
   * @param {number} userId - User ID (for audit)
   */
  async softDelete(id, userId = null) {
    // Get the record first (for audit logging)
    const record = await this.findById(id, false);
    if (!record) {
      throw new Error(`Record not found in ${this.tableName}`);
    }

    // Mark as deleted
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [id]);

    // TODO: Log to audit_log table
    // await this.logAudit('DELETE', id, userId, record);

    return result.rows[0];
  }

  /**
   * Restore a soft-deleted record
   * @param {number} id - Record ID
   * @param {number} userId - User ID (for audit)
   */
  async restore(id, userId = null) {
    // Get the deleted record first (for audit logging)
    const record = await this.findById(id, true);
    if (!record) {
      throw new Error(`Record not found in ${this.tableName}`);
    }

    if (!record.deleted_at) {
      throw new Error(`Record is not deleted. Cannot restore.`);
    }

    // Clear deleted_at
    const query = `
      UPDATE ${this.tableName}
      SET deleted_at = NULL
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [id]);

    // TODO: Log to audit_log table
    // await this.logAudit('RESTORE', id, userId, record);

    return result.rows[0];
  }

  /**
   * Permanently delete a record (hard delete)
   * @param {number} id - Record ID
   * @param {number} userId - User ID (for audit)
   */
  async permanentDelete(id, userId = null) {
    // Get the record first (for audit logging)
    const record = await this.findById(id, true);
    if (!record) {
      throw new Error(`Record not found in ${this.tableName}`);
    }

    // TODO: Log to audit_log table before deletion
    // await this.logAudit('PERMANENT_DELETE', id, userId, record);

    // Delete the record
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await this.db.query(query, [id]);

    return true;
  }

  /**
   * Check if a record is soft-deleted
   * @param {number} id - Record ID
   */
  async isDeleted(id) {
    const query = `SELECT deleted_at FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null; // Record doesn't exist
    }

    return result.rows[0].deleted_at !== null;
  }

  /**
   * Get deletion timestamp for a record
   * @param {number} id - Record ID
   */
  async getDeletedAt(id) {
    const query = `SELECT deleted_at FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].deleted_at;
  }
}

module.exports = BaseModel;
