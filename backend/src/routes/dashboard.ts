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
// GET DASHBOARD METRICS (FOR FIRM OWNERS)
// ============================================

/**
 * GET /api/dashboard/metrics
 * Get KPI metrics for the admin dashboard
 */
router.get('/metrics', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const firmId = req.user?.firmId;

    // Check if user is admin/partner
    if (!['admin', 'partner'].includes(req.user?.role || '')) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'Only firm admins can access dashboard metrics',
          status: 403,
        },
      });
    }

    // 1. Total Revenue (from time entries)
    const revenueQuery = `
      SELECT 
        SUM(CASE WHEN te.is_billable = true THEN te.total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN te.is_billable = true AND te.created_at >= NOW() - INTERVAL '1 month' 
          THEN te.total_amount ELSE 0 END) as monthly_revenue
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE c.firm_id = $1 AND te.deleted_at IS NULL
    `;

    const revenueResult = await pool.query(revenueQuery, [firmId]);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
    const monthlyRevenue = parseFloat(revenueResult.rows[0].monthly_revenue) || 0;

    // 2. Active Cases Count
    const casesQuery = `
      SELECT 
        COUNT(*) as active_cases,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_cases,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as in_progress_cases,
        SUM(CASE WHEN status = 'hearing_scheduled' THEN 1 ELSE 0 END) as hearing_cases
      FROM cases
      WHERE firm_id = $1 AND deleted_at IS NULL AND status != 'closed'
    `;

    const casesResult = await pool.query(casesQuery, [firmId]);
    const activeCases = parseInt(casesResult.rows[0].active_cases) || 0;

    // 3. Lawyer Count and Utilization
    const lawyersQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as total_lawyers,
        ROUND(AVG(CASE 
          WHEN monthly_hours > 0 THEN (monthly_hours / 160.0) * 100 
          ELSE 0 
        END)::numeric, 1) as avg_utilization
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as monthly_hours
        FROM time_entries
        WHERE created_at >= NOW() - INTERVAL '1 month' AND deleted_at IS NULL
        GROUP BY user_id
      ) te ON u.id = te.user_id
      WHERE u.firm_id = $1 AND u.deleted_at IS NULL AND u.role IN ('lawyer', 'partner')
    `;

    const lawyersResult = await pool.query(lawyersQuery, [firmId]);
    const totalLawyers = parseInt(lawyersResult.rows[0].total_lawyers) || 0;
    const avgUtilization = parseFloat(lawyersResult.rows[0].avg_utilization) || 0;

    // 4. Revenue Trend (Last 6 months)
    const trendQuery = `
      SELECT 
        DATE_TRUNC('month', te.created_at)::DATE as month,
        SUM(CASE WHEN te.is_billable = true THEN te.total_amount ELSE 0 END) as amount
      FROM time_entries te
      JOIN cases c ON te.case_id = c.id
      WHERE c.firm_id = $1 AND te.deleted_at IS NULL 
        AND te.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', te.created_at)
      ORDER BY month ASC
    `;

    const trendResult = await pool.query(trendQuery, [firmId]);

    // 5. Case Distribution
    const distributionQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM cases
      WHERE firm_id = $1 AND deleted_at IS NULL
      GROUP BY status
    `;

    const distributionResult = await pool.query(distributionQuery, [firmId]);

    // 6. Lawyer Performance
    const performanceQuery = `
      SELECT 
        u.id,
        u.full_name,
        COUNT(DISTINCT c.id) as active_cases,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN te.hours_worked ELSE 0 END), 0) as billable_hours,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN te.total_amount ELSE 0 END), 0) as revenue,
        ROUND((COALESCE(SUM(CASE WHEN te.is_billable = true THEN te.hours_worked ELSE 0 END), 0) / 160.0) * 100, 1) as utilization
      FROM users u
      LEFT JOIN cases c ON u.id = c.assigned_lawyer_id AND c.firm_id = $1 AND c.deleted_at IS NULL AND c.status != 'closed'
      LEFT JOIN time_entries te ON u.id = te.user_id AND te.created_at >= NOW() - INTERVAL '1 month' AND te.deleted_at IS NULL
      WHERE u.firm_id = $1 AND u.deleted_at IS NULL AND u.role IN ('lawyer', 'partner')
      GROUP BY u.id, u.full_name
      ORDER BY revenue DESC
    `;

    const performanceResult = await pool.query(performanceQuery, [firmId]);

    // 7. Top Cases (by revenue)
    const topCasesQuery = `
      SELECT 
        c.id,
        c.case_number,
        c.title,
        cl.name as client_name,
        u.full_name as lawyer_name,
        c.status,
        c.priority,
        COALESCE(SUM(CASE WHEN te.is_billable = true THEN te.total_amount ELSE 0 END), 0) as revenue
      FROM cases c
      JOIN clients cl ON c.client_id = cl.id
      JOIN users u ON c.assigned_lawyer_id = u.id
      LEFT JOIN time_entries te ON c.id = te.case_id AND te.deleted_at IS NULL
      WHERE c.firm_id = $1 AND c.deleted_at IS NULL
      GROUP BY c.id, cl.id, u.id
      ORDER BY revenue DESC
      LIMIT 10
    `;

    const topCasesResult = await pool.query(topCasesQuery, [firmId]);

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalRevenue: totalRevenue.toFixed(2),
          monthlyRevenue: monthlyRevenue.toFixed(2),
          activeCases,
          totalLawyers,
          avgUtilization,
          revenueGrowth: '+12.5%', // Placeholder, calculate from historical data
          caseGrowth: '+8.2%', // Placeholder
        },
        charts: {
          revenueTrend: trendResult.rows.map(row => ({
            month: row.month,
            actual: parseFloat(row.amount).toFixed(2),
            target: (parseFloat(row.amount) * 1.1).toFixed(2), // 10% target growth
          })),
          caseDistribution: distributionResult.rows.map(row => ({
            status: row.status,
            count: parseInt(row.count),
          })),
        },
        lawyerPerformance: performanceResult.rows.map(row => ({
          id: row.id,
          name: row.full_name,
          activeCases: parseInt(row.active_cases) || 0,
          billableHours: parseFloat(row.billable_hours).toFixed(1),
          revenue: parseFloat(row.revenue).toFixed(2),
          utilization: parseFloat(row.utilization) || 0,
        })),
        topCases: topCasesResult.rows.map(row => ({
          id: row.id,
          caseNumber: row.case_number,
          title: row.title,
          clientName: row.client_name,
          lawyerName: row.lawyer_name,
          status: row.status,
          priority: row.priority,
          revenue: parseFloat(row.revenue).toFixed(2),
        })),
      },
      error: null,
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    next(error);
  }
});

// ============================================
// GET LAWYER DASHBOARD METRICS
// ============================================

/**
 * GET /api/dashboard/lawyer
 * Get metrics for individual lawyer dashboard
 */
router.get('/lawyer', verifyToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const firmId = req.user?.firmId;

    // 1. Active Cases for this lawyer
    const casesQuery = `
      SELECT 
        c.id,
        c.case_number,
        c.title,
        cl.name as client_name,
        c.status,
        c.priority,
        c.expected_closure_date
      FROM cases c
      JOIN clients cl ON c.client_id = cl.id
      WHERE c.assigned_lawyer_id = $1 AND c.firm_id = $2 AND c.deleted_at IS NULL AND c.status != 'closed'
      ORDER BY c.priority DESC, c.expected_closure_date ASC
      LIMIT 10
    `;

    const casesResult = await pool.query(casesQuery, [userId, firmId]);

    // 2. Billable Hours Summary
    const hoursQuery = `
      SELECT 
        COUNT(DISTINCT DATE(work_date)) as days_worked,
        SUM(CASE WHEN is_billable = true THEN hours_worked ELSE 0 END) as billable_hours,
        SUM(CASE WHEN is_billable = true THEN total_amount ELSE 0 END) as billable_amount
      FROM time_entries
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 month' AND deleted_at IS NULL
    `;

    const hoursResult = await pool.query(hoursQuery, [userId]);

    // 3. Pending Tasks
    const tasksQuery = `
      SELECT 
        t.id,
        t.title,
        t.priority,
        t.due_date,
        t.status,
        c.case_number,
        c.title as case_title
      FROM tasks t
      JOIN cases c ON t.case_id = c.id
      WHERE t.assigned_to_user_id = $1 AND c.firm_id = $2 AND t.deleted_at IS NULL AND t.status != 'completed'
      ORDER BY t.priority DESC, t.due_date ASC
      LIMIT 10
    `;

    const tasksResult = await pool.query(tasksQuery, [userId, firmId]);

    // 4. Upcoming Hearings
    const hearingsQuery = `
      SELECT 
        c.id,
        c.case_number,
        c.title,
        c.court_name,
        c.judge_name,
        cl.name as client_name
      FROM cases c
      JOIN clients cl ON c.client_id = cl.id
      WHERE c.assigned_lawyer_id = $1 AND c.firm_id = $2 AND c.deleted_at IS NULL AND c.status = 'hearing_scheduled'
      ORDER BY c.expected_closure_date ASC
      LIMIT 5
    `;

    const hearingsResult = await pool.query(hearingsQuery, [userId, firmId]);

    // 5. Time entries for today
    const todayQuery = `
      SELECT 
        SUM(hours_worked) as hours_today
      FROM time_entries
      WHERE user_id = $1 AND DATE(work_date) = CURRENT_DATE AND deleted_at IS NULL
    `;

    const todayResult = await pool.query(todayQuery, [userId]);
    const hoursToday = parseFloat(todayResult.rows[0].hours_today) || 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          activeCases: casesResult.rows.length,
          billableHours: parseFloat(hoursResult.rows[0].billable_hours).toFixed(1) || '0.0',
          billableAmount: parseFloat(hoursResult.rows[0].billable_amount).toFixed(2) || '0.00',
          hoursToday: hoursToday.toFixed(1),
          targetHours: 8.0,
          pendingTasks: tasksResult.rows.filter(t => t.status !== 'completed').length,
        },
        activeCases: casesResult.rows,
        pendingTasks: tasksResult.rows,
        upcomingHearings: hearingsResult.rows,
      },
      error: null,
    });
  } catch (error) {
    console.error('Get lawyer dashboard error:', error);
    next(error);
  }
});

export default router;
