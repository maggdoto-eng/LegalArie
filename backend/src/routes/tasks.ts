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
// GET ALL TASKS (with filtering)
// ============================================

/**
 * GET /api/tasks
 * Get all tasks for a firm or a specific case
 * Query params: caseId, status, priority, assignedToUserId, page, limit
 */
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, status, priority, assignedToUserId, page = 1, limit = 20 } = req.query;
    const firmId = req.user?.firmId;
    const offset = ((Number(page) - 1) * Number(limit)).toString();

    let query = `
      SELECT 
        t.id,
        t.case_id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.completed_at,
        c.case_number,
        c.title as case_title,
        u.full_name as assigned_to_name,
        cb.full_name as created_by_name
      FROM tasks t
      JOIN cases c ON t.case_id = c.id
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      JOIN users cb ON t.created_by_id = cb.id
      WHERE c.firm_id = $1 AND t.deleted_at IS NULL
    `;

    const params: any[] = [firmId];
    let paramCount = 1;

    // Add filters
    if (caseId) {
      paramCount++;
      query += ` AND t.case_id = $${paramCount}`;
      params.push(caseId);
    }

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    if (assignedToUserId) {
      paramCount++;
      query += ` AND t.assigned_to_user_id = $${paramCount}`;
      params.push(assignedToUserId);
    }

    query += ` ORDER BY t.due_date ASC, t.priority DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM tasks t
      JOIN cases c ON t.case_id = c.id
      WHERE c.firm_id = $1 AND t.deleted_at IS NULL
    `;
    const countParams: any[] = [firmId];

    if (caseId) countQuery += ` AND t.case_id = $2`;
    if (status) countQuery += ` AND t.status = ${caseId ? '$3' : '$2'}`;

    const countResult = await pool.query(
      countQuery,
      caseId ? [firmId, caseId] : [firmId]
    );

    return res.status(200).json({
      success: true,
      data: {
        tasks: result.rows,
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
    console.error('Get tasks error:', error);
    next(error);
  }
});

// ============================================
// GET SINGLE TASK
// ============================================

/**
 * GET /api/tasks/:taskId
 * Get task details
 */
router.get('/:taskId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const firmId = req.user?.firmId;

    const query = `
      SELECT 
        t.*,
        c.case_number,
        c.title as case_title,
        u.full_name as assigned_to_name,
        cb.full_name as created_by_name
      FROM tasks t
      JOIN cases c ON t.case_id = c.id
      LEFT JOIN users u ON t.assigned_to_user_id = u.id
      JOIN users cb ON t.created_by_id = cb.id
      WHERE t.id = $1 AND c.firm_id = $2 AND t.deleted_at IS NULL
    `;

    const result = await pool.query(query, [taskId, firmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
          status: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { task: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Get task error:', error);
    next(error);
  }
});

// ============================================
// CREATE TASK
// ============================================

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, title, description, assignedToUserId, priority, dueDate } = req.body;
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;

    // Validate required fields
    if (!caseId || !title) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Case ID and title are required',
          status: 400,
        },
      });
    }

    const query = `
      INSERT INTO tasks (case_id, title, description, assigned_to_user_id, priority, due_date, created_by_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      caseId,
      title,
      description,
      assignedToUserId,
      priority || 'medium',
      dueDate,
      userId,
    ]);

    return res.status(201).json({
      success: true,
      data: { task: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Create task error:', error);
    next(error);
  }
});

// ============================================
// UPDATE TASK
// ============================================

/**
 * PUT /api/tasks/:taskId
 * Update task status, priority, assignment
 */
router.put('/:taskId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const firmId = req.user?.firmId;
    const { status, priority, assignedToUserId, dueDate, description } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);

      // If status is 'completed', set completed_at
      if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`completed_at = NULL`);
      }
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      params.push(priority);
    }

    if (assignedToUserId !== undefined) {
      updates.push(`assigned_to_user_id = $${paramCount++}`);
      params.push(assignedToUserId);
    }

    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      params.push(dueDate);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
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

    params.push(taskId, firmId);

    // Verify task belongs to a case in the firm
    const verifyQuery = `
      SELECT t.id FROM tasks t
      JOIN cases c ON t.case_id = c.id
      WHERE t.id = $1 AND c.firm_id = $2 AND t.deleted_at IS NULL
    `;

    const verifyResult = await pool.query(verifyQuery, [taskId, firmId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
          status: 404,
        },
      });
    }

    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount - 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: { task: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Update task error:', error);
    next(error);
  }
});

// ============================================
// DELETE TASK (soft delete)
// ============================================

/**
 * DELETE /api/tasks/:taskId
 * Soft delete a task
 */
router.delete('/:taskId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const firmId = req.user?.firmId;

    // Verify task belongs to a case in the firm
    const verifyQuery = `
      SELECT t.id FROM tasks t
      JOIN cases c ON t.case_id = c.id
      WHERE t.id = $1 AND c.firm_id = $2 AND t.deleted_at IS NULL
    `;

    const verifyResult = await pool.query(verifyQuery, [taskId, firmId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Task not found',
          status: 404,
        },
      });
    }

    const query = `
      UPDATE tasks
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [taskId]);

    return res.status(200).json({
      success: true,
      data: { message: 'Task deleted successfully' },
      error: null,
    });
  } catch (error) {
    console.error('Delete task error:', error);
    next(error);
  }
});

export default router;
