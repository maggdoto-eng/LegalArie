import express, { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { verifyToken } from './auth';

const router = Router();

// Mock database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/legalaarie',
});

interface AuthRequest extends Request {
  user?: {
    userId: string;
    firmId: string;
    email: string;
    role: string;
  };
}

// ============================================
// GET ALL CASES (with filtering)
// ============================================

/**
 * GET /api/cases
 * Get all cases for a firm with optional filters
 * Query params: status, priority, lawyerId, page, limit
 */
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, priority, lawyerId, page = 1, limit = 20 } = req.query;
    const firmId = req.user?.firmId;
    const offset = ((Number(page) - 1) * Number(limit)).toString();

    // Build dynamic query with filters
    let query = `
      SELECT 
        c.id,
        c.case_number,
        c.title,
        c.status,
        c.priority,
        c.case_type,
        c.filing_date,
        c.expected_closure_date,
        c.court_name,
        cl.name as client_name,
        u.full_name as lawyer_name,
        COUNT(m.id) as message_count,
        COUNT(d.id) as document_count
      FROM cases c
      JOIN clients cl ON c.client_id = cl.id
      JOIN users u ON c.assigned_lawyer_id = u.id
      LEFT JOIN messages m ON c.id = m.case_id AND m.deleted_at IS NULL
      LEFT JOIN documents d ON c.id = d.case_id AND d.deleted_at IS NULL
      WHERE c.firm_id = $1 AND c.deleted_at IS NULL
    `;

    const params: any[] = [firmId];
    let paramCount = 1;

    // Add filters
    if (status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND c.priority = $${paramCount}`;
      params.push(priority);
    }

    if (lawyerId) {
      paramCount++;
      query += ` AND c.assigned_lawyer_id = $${paramCount}`;
      params.push(lawyerId);
    }

    query += ` GROUP BY c.id, cl.id, u.id ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${
      paramCount + 2
    }`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cases c
      WHERE c.firm_id = $1 AND c.deleted_at IS NULL
    `;
    const countParams: any[] = [firmId];
    if (status) countQuery += ` AND c.status = $2`;
    if (priority) countQuery += ` AND c.priority = $3`;

    const countResult = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: {
        cases: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit)),
        },
      },
      error: null,
    });
  } catch (error) {
    console.error('Get cases error:', error);
    next(error);
  }
});

// ============================================
// GET SINGLE CASE
// ============================================

/**
 * GET /api/cases/:caseId
 * Get case details
 */
router.get('/:caseId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const firmId = req.user?.firmId;

    const query = `
      SELECT 
        c.*,
        cl.name as client_name,
        cl.email as client_email,
        cl.phone as client_phone,
        u.full_name as lawyer_name,
        u.email as lawyer_email
      FROM cases c
      JOIN clients cl ON c.client_id = cl.id
      JOIN users u ON c.assigned_lawyer_id = u.id
      WHERE c.id = $1 AND c.firm_id = $2 AND c.deleted_at IS NULL
    `;

    const result = await pool.query(query, [caseId, firmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case not found',
          status: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { case: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Get case error:', error);
    next(error);
  }
});

// ============================================
// CREATE CASE
// ============================================

/**
 * POST /api/cases
 * Create a new case
 */
router.post('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseNumber, title, clientId, lawyerId, status, priority, description, courtName } = req.body;
    const firmId = req.user?.firmId;

    // Validate required fields
    if (!caseNumber || !title || !clientId || !lawyerId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing required fields',
          status: 400,
        },
      });
    }

    const query = `
      INSERT INTO cases (firm_id, case_number, title, client_id, assigned_lawyer_id, status, priority, description, court_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      firmId,
      caseNumber,
      title,
      clientId,
      lawyerId,
      status || 'open',
      priority || 'medium',
      description,
      courtName,
    ]);

    return res.status(201).json({
      success: true,
      data: { case: result.rows[0] },
      error: null,
    });
  } catch (error: any) {
    console.error('Create case error:', error);
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'DUPLICATE_CASE',
          message: 'Case number already exists for this firm',
          status: 409,
        },
      });
    }
    next(error);
  }
});

// ============================================
// UPDATE CASE
// ============================================

/**
 * PUT /api/cases/:caseId
 * Update case details
 */
router.put('/:caseId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const firmId = req.user?.firmId;
    const { status, priority, description, expectedClosureDate } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      params.push(priority);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (expectedClosureDate !== undefined) {
      updates.push(`expected_closure_date = $${paramCount++}`);
      params.push(expectedClosureDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'NO_UPDATES',
          message: 'No fields to update',
          status: 400,
        },
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(caseId, firmId);

    const query = `
      UPDATE cases
      SET ${updates.join(', ')}
      WHERE id = $${paramCount + 1} AND firm_id = $${paramCount + 2} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case not found',
          status: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { case: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Update case error:', error);
    next(error);
  }
});

// ============================================
// DELETE CASE (soft delete)
// ============================================

/**
 * DELETE /api/cases/:caseId
 * Soft delete a case
 */
router.delete('/:caseId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const firmId = req.user?.firmId;

    const query = `
      UPDATE cases
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND firm_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [caseId, firmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'CASE_NOT_FOUND',
          message: 'Case not found',
          status: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Case deleted successfully' },
      error: null,
    });
  } catch (error) {
    console.error('Delete case error:', error);
    next(error);
  }
});

export default router;
