import { Request, Response, NextFunction } from 'express';

/**
 * Middleware: Log all actions to audit_logs table
 * (Implementation with actual DB calls in Phase 1)
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Capture request details
  const auditData = {
    userId: req.userId || null,
    method: req.method,
    endpoint: req.path,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
  };

  // Log to console during development
  console.log(`[AUDIT] ${auditData.method} ${auditData.endpoint} by ${auditData.userId || 'anonymous'}`);

  // TODO: Implement actual DB logging in Phase 1
  // await auditLog.create(auditData);

  next();
};

/**
 * Middleware: Log specific resource changes
 * (e.g., case created, status updated, document uploaded)
 */
export const logResourceChange = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValue: any = null,
  newValue: any = null
) => {
  const auditEntry = {
    userId,
    action,
    resourceType,
    resourceId,
    oldValue,
    newValue,
    timestamp: new Date(),
  };

  console.log(`[RESOURCE CHANGE] ${action} on ${resourceType}:${resourceId}`);

  // TODO: Insert into audit_logs table in Phase 1
  // await db.query(
  //   'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value) VALUES ($1, $2, $3, $4, $5, $6)',
  //   [userId, action, resourceType, resourceId, oldValue, newValue]
  // );
};
