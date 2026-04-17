import express, { Express, Request, Response, NextlewareError } from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

// Import routes (to be created)
// import authRoutes from './routes/auth.js';
// import userRoutes from './routes/users.js';

// Import middleware
// import { authMiddleware } from './middleware/auth.js';
// import { auditMiddleware } from './middleware/audit.js';
// import { errorHandler } from './middleware/errorHandler.js';

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

// API Routes (to be implemented)
// app.use('/api/auth', authRoutes);
// app.use('/api/users', authMiddleware, userRoutes);

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

// Error handler middleware (to be implemented)
// app.use(errorHandler);

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
