import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

/**
 * Request tracing middleware
 * Adds trace_id and span_id to all requests for distributed tracing
 * Logs can be filtered by trace_id to debug multi-tenant issues
 */
export interface TracedRequest extends Request {
  traceId: string;
  spanId: string;
  logger: any;
  context: {
    traceId: string;
    spanId: string;
    firmId?: string;
    userId?: string;
    userRole?: string;
    timestamp: string;
    endpoint: string;
  };
}

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tracedReq = req as TracedRequest;

  // Use existing trace ID (from client) or create new one
  const traceId = req.headers['x-trace-id'] as string || uuidv4();
  const spanId = uuidv4();

  tracedReq.traceId = traceId;
  tracedReq.spanId = spanId;

  // Attach context for all logs
  tracedReq.context = {
    traceId,
    spanId,
    firmId: (req as any).firmId,
    userId: (req as any).userId,
    userRole: (req as any).userRole,
    timestamp: new Date().toISOString(),
    endpoint: `${req.method} ${req.path}`,
  };

  // Create logger with context
  tracedReq.logger = createLogger(tracedReq.context);

  // Add trace ID to response headers (client can track back to logs)
  res.setHeader('x-trace-id', traceId);
  res.setHeader('x-span-id', spanId);

  // Log request start
  tracedReq.logger.info('Request started', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  // Measure response time
  const startTime = Date.now();

  // Intercept res.send to log response
  const originalSend = res.send;
  res.send = function (data: any) {
    const responseTimeMs = Date.now() - startTime;

    tracedReq.logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTimeMs,
    });

    return originalSend.call(this, data);
  };

  next();
};
