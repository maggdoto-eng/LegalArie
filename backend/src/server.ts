import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import casesRoutes from './routes/cases';
import tasksRoutes from './routes/tasks';
import timeEntriesRoutes from './routes/timeEntries';
import dashboardRoutes from './routes/dashboard';

// Import middleware
import { verifyToken } from './routes/auth';

const app: Express = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', verifyToken, casesRoutes);
app.use('/api/tasks', verifyToken, tasksRoutes);
app.use('/api/time-entries', verifyToken, timeEntriesRoutes);
app.use('/api/dashboard', verifyToken, dashboardRoutes);

// Socket.io Real-Time Events (to be implemented)
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Message events (to be implemented)
  // socket.on('send-message', (data) => { ... });
  // socket.on('read-message', (data) => { ... });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      status: 404,
    },
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket listening for real-time events`);
});

export default app;
