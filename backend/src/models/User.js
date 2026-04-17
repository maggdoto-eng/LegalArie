/**
 * User Model
 * Handles all user-related database operations with soft delete support
 */

const BaseModel = require('./BaseModel');

class UserModel extends BaseModel {
  constructor(db) {
    super('users', db);
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {boolean} includeDeleted - Include soft-deleted records
   */
  async findByEmail(email, includeDeleted = false) {
    let query = `SELECT * FROM users WHERE email = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    const result = await this.db.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find users by role
   * @param {string} role - User role (partner, lawyer, paralegal, admin)
   * @param {object} options - Filter options
   */
  async findByRole(role, options = {}) {
    const { includeDeleted = false, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM users WHERE role = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY full_name ASC LIMIT $2 OFFSET $3`;

    const result = await this.db.query(query, [role, limit, offset]);
    return result.rows;
  }

  /**
   * Find users by firm
   * @param {number} firmId - Firm ID
   * @param {object} options - Filter options
   */
  async findByFirm(firmId, options = {}) {
    const { includeDeleted = false } = options;

    let query = `SELECT * FROM users WHERE firm_id = $1`;

    if (!includeDeleted) {
      query += ` AND deleted_at IS NULL`;
    }

    query += ` ORDER BY full_name ASC`;

    const result = await this.db.query(query, [firmId]);
    return result.rows;
  }

  /**
   * Get user statistics
   * @param {object} options - Filter options
   */
  async getStats(options = {}) {
    const { firmId = null } = options;

    let query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'partner' THEN 1 END) as partners,
        COUNT(CASE WHEN role = 'lawyer' THEN 1 END) as lawyers,
        COUNT(CASE WHEN role = 'paralegal' THEN 1 END) as paralegals,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
      FROM users
      WHERE deleted_at IS NULL
    `;

    const params = [];

    if (firmId) {
      query += ` AND firm_id = $1`;
      params.push(firmId);
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   */
  async search(searchTerm, options = {}) {
    const { limit = 20 } = options;

    const query = `
      SELECT * FROM users
      WHERE deleted_at IS NULL
      AND (
        full_name ILIKE $1
        OR email ILIKE $1
      )
      ORDER BY full_name ASC
      LIMIT $2
    `;

    const result = await this.db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  /**
   * Get active users count
   * @param {object} options - Filter options
   */
  async getActiveCount(options = {}) {
    const { firmId = null } = options;

    let query = `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`;

    const params = [];

    if (firmId) {
      query += ` AND firm_id = $1`;
      params.push(firmId);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get recently deleted users
   * @param {object} options - Filter options
   */
  async getRecentlyDeleted(options = {}) {
    const { days = 30, limit = 20 } = options;

    const query = `
      SELECT * FROM users
      WHERE deleted_at IS NOT NULL
      AND deleted_at > NOW() - INTERVAL '${days} days'
      ORDER BY deleted_at DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Deactivate user (soft delete)
   * @param {number} id - User ID
   * @param {number} userId - User ID performing the action
   */
  async deactivate(id, userId = null) {
    // Check if user exists and is not already deleted
    const user = await this.findById(id, false);
    if (!user) {
      throw new Error('User not found or already deactivated');
    }

    // Soft delete the user
    return await this.softDelete(id, userId);
  }

  /**
   * Reactivate user
   * @param {number} id - User ID
   * @param {number} userId - User ID performing the action
   */
  async reactivate(id, userId = null) {
    // Check if user is deleted
    const isDeleted = await this.isDeleted(id);
    if (!isDeleted) {
      throw new Error('User is not deactivated');
    }

    // Restore the user
    return await this.restore(id, userId);
  }

  /**
   * Get user by ID with firm information
   * @param {number} id - User ID
   * @param {boolean} includeDeleted - Include soft-deleted records
   */
  async getUserWithFirm(id, includeDeleted = false) {
    const user = await this.findById(id, includeDeleted);
    if (!user) {
      return null;
    }

    // Get firm info (if firm table exists)
    try {
      const firmQuery = `SELECT * FROM firms WHERE id = $1`;
      const firmResult = await this.db.query(firmQuery, [user.firm_id]);

      return {
        ...user,
        firm: firmResult.rows[0] || null,
      };
    } catch (error) {
      // Firms table might not exist yet
      return user;
    }
  }

  /**
   * Verify user credentials
   * @param {string} email - User email
   * @param {string} password - User password (should be hashed)
   */
  async verifyCredentials(email, password) {
    const user = await this.findByEmail(email, false);

    if (!user) {
      return null; // User not found
    }

    // TODO: Compare hashed password
    // const passwordMatch = await bcrypt.compare(password, user.password);
    // if (!passwordMatch) {
    //   return null;
    // }

    return user;
  }
}

module.exports = UserModel;
