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
// GET TIME ENTRIES FOR A LAWYER
// ============================================

/**
 * GET /api/time-entries
 * Get time entries for authenticated lawyer
 * Query params: caseId, startDate, endDate, page, limit
 */
router.get('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;
    const offset = ((Number(page) - 1) * Number(limit)).toString();

    let query = `
      SELECT 
        te.id,
        te.case_id,
        te.user_id,
        te.task_id,
        te.hours_worked,
        te.rate_per_hour,
        te.total_amount,
        te.is_billable,
        te.description,
        te.work_date,
        te.created_at,
        c.case_number,
        c.title as case_title,
        t.title as task_title
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.user_id = $1 AND c.firm_id = $2 AND te.deleted_at IS NULL
    `;

    const params: any[] = [userId, firmId];
    let paramCount = 2;

    if (caseId) {
      paramCount++;
      query += ` AND te.case_id = $${paramCount}`;
      params.push(caseId);
    }

    if (startDate) {
      paramCount++;
      query += ` AND te.work_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND te.work_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY te.work_date DESC, te.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total hours and amount
    let statsQuery = `
      SELECT 
        SUM(hours_worked) as total_hours,
        SUM(CASE WHEN is_billable = true THEN total_amount ELSE 0 END) as billable_amount
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE te.user_id = $1 AND c.firm_id = $2 AND te.deleted_at IS NULL
    `;

    const statsParams: any[] = [userId, firmId];

    const statsResult = await pool.query(statsQuery, statsParams);

    return res.status(200).json({
      success: true,
      data: {
        timeEntries: result.rows,
        stats: {
          totalHours: parseFloat(statsResult.rows[0].total_hours) || 0,
          billableAmount: parseFloat(statsResult.rows[0].billable_amount) || 0,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
      },
      error: null,
    });
  } catch (error) {
    console.error('Get time entries error:', error);
    next(error);
  }
});

// ============================================
// GET TIME ENTRY BY ID
// ============================================

/**
 * GET /api/time-entries/:entryId
 * Get single time entry
 */
router.get('/:entryId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entryId } = req.params;
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;

    const query = `
      SELECT 
        te.*,
        c.case_number,
        c.title as case_title,
        t.title as task_title
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.id = $1 AND te.user_id = $2 AND c.firm_id = $3 AND te.deleted_at IS NULL
    `;

    const result = await pool.query(query, [entryId, userId, firmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Time entry not found',
          status: 404,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { timeEntry: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Get time entry error:', error);
    next(error);
  }
});

// ============================================
// CREATE TIME ENTRY
// ============================================

/**
 * POST /api/time-entries
 * Log hours worked
 */
router.post('/', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, taskId, hoursWorked, ratePerHour, isBillable, description, workDate } = req.body;
    const userId = req.user?.userId;

    // Validate required fields
    if (!caseId || !hoursWorked) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_INPUT',
          message: 'Case ID and hours worked are required',
          status: 400,
        },
      });
    }

    const totalAmount = hoursWorked * (ratePerHour || 0);

    const query = `
      INSERT INTO time_entries (
        case_id, user_id, task_id, hours_worked, rate_per_hour, 
        total_amount, is_billable, description, work_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      caseId,
      userId,
      taskId || null,
      hoursWorked,
      ratePerHour || 0,
      totalAmount,
      isBillable !== undefined ? isBillable : true,
      description,
      workDate || new Date().toISOString().split('T')[0],
    ]);

    return res.status(201).json({
      success: true,
      data: { timeEntry: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Create time entry error:', error);
    next(error);
  }
});

// ============================================
// UPDATE TIME ENTRY
// ============================================

/**
 * PUT /api/time-entries/:entryId
 * Update time entry
 */
router.put('/:entryId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entryId } = req.params;
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;
    const { hoursWorked, ratePerHour, isBillable, description } = req.body;

    // Verify entry belongs to user and firm
    const verifyQuery = `
      SELECT te.id FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE te.id = $1 AND te.user_id = $2 AND c.firm_id = $3 AND te.deleted_at IS NULL
    `;

    const verifyResult = await pool.query(verifyQuery, [entryId, userId, firmId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Time entry not found',
          status: 404,
        },
      });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (hoursWorked !== undefined) {
      updates.push(`hours_worked = $${paramCount++}`);
      params.push(hoursWorked);
    }

    if (ratePerHour !== undefined) {
      updates.push(`rate_per_hour = $${paramCount++}`);
      params.push(ratePerHour);
    }

    if (isBillable !== undefined) {
      updates.push(`is_billable = $${paramCount++}`);
      params.push(isBillable);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }

    // Recalculate total_amount if hours or rate changed
    if (hoursWorked !== undefined || ratePerHour !== undefined) {
      updates.push(`total_amount = hours_worked * COALESCE(rate_per_hour, 0)`);
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

    params.push(entryId);

    const query = `
      UPDATE time_entries
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: { timeEntry: result.rows[0] },
      error: null,
    });
  } catch (error) {
    console.error('Update time entry error:', error);
    next(error);
  }
});

// ============================================
// DELETE TIME ENTRY (soft delete)
// ============================================

/**
 * DELETE /api/time-entries/:entryId
 * Soft delete time entry
 */
router.delete('/:entryId', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { entryId } = req.params;
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;

    // Verify entry belongs to user and firm
    const verifyQuery = `
      SELECT te.id FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE te.id = $1 AND te.user_id = $2 AND c.firm_id = $3 AND te.deleted_at IS NULL
    `;

    const verifyResult = await pool.query(verifyQuery, [entryId, userId, firmId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'ENTRY_NOT_FOUND',
          message: 'Time entry not found',
          status: 404,
        },
      });
    }

    const query = `
      UPDATE time_entries
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [entryId]);

    return res.status(200).json({
      success: true,
      data: { message: 'Time entry deleted successfully' },
      error: null,
    });
  } catch (error) {
    console.error('Delete time entry error:', error);
    next(error);
  }
});

// ============================================
// GET BILLABLE HOURS FOR PERIOD
// ============================================

/**
 * GET /api/time-entries/billable/summary
 * Get billable hours summary for a date range
 */
router.get('/billable/summary', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;

    let query = `
      SELECT 
        c.id,
        c.case_number,
        c.title,
        SUM(CASE WHEN te.is_billable = true THEN te.hours_worked ELSE 0 END) as billable_hours,
        SUM(CASE WHEN te.is_billable = true THEN te.total_amount ELSE 0 END) as billable_amount
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE te.user_id = $1 AND c.firm_id = $2 AND te.is_billable = true AND te.deleted_at IS NULL
    `;

    const params: any[] = [userId, firmId];
    let paramCount = 2;

    if (startDate) {
      paramCount++;
      query += ` AND te.work_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND te.work_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` GROUP BY c.id ORDER BY billable_amount DESC`;

    const result = await pool.query(query, params);

    const totals = result.rows.reduce(
      (acc, row) => ({
        totalBillableHours: acc.totalBillableHours + (parseFloat(row.billable_hours) || 0),
        totalBillableAmount: acc.totalBillableAmount + (parseFloat(row.billable_amount) || 0),
      }),
      { totalBillableHours: 0, totalBillableAmount: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        caseBreakdown: result.rows,
        summary: totals,
      },
      error: null,
    });
  } catch (error) {
    console.error('Get billable summary error:', error);
    next(error);
  }
});

export default router;
