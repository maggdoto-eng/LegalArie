const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Mock demo user for testing
const DEMO_USER = {
  id: 'demo-user-1',
  email: 'owner@legalaarie.com',
  password: 'Demo@123456', // In production, this would be hashed
  fullName: 'Demo Partner',
  role: 'partner',
  firmId: 'demo-firm-1',
};

// Simple login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
      });
    }

    // Check against demo user
    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: DEMO_USER.id, firmId: DEMO_USER.firmId, email: DEMO_USER.email, role: DEMO_USER.role },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: DEMO_USER.id },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: DEMO_USER.id,
            email: DEMO_USER.email,
            fullName: DEMO_USER.fullName,
            role: DEMO_USER.role,
            firmId: DEMO_USER.firmId,
          },
        },
      });
    }

    // Invalid credentials
    res.status(401).json({
      success: false,
      error: 'Invalid email or password',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

// API Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (MUST be last - needs 4 params to be recognized as error handler)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
