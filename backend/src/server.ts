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

// Dashboard metrics endpoint
app.get('/api/dashboard/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      kpis: {
        totalRevenue: '5000000',
        monthlyRevenue: '425000',
        activeCases: 47,
        totalLawyers: 12,
        avgUtilization: 78,
        revenueGrowth: '12.5',
        caseGrowth: '8.3'
      },
      charts: {
        revenueTrend: [
          { month: '2026-01-01', actual: '385000', target: '400000' },
          { month: '2026-02-01', actual: '405000', target: '400000' },
          { month: '2026-03-01', actual: '425000', target: '420000' }
        ],
        caseDistribution: [
          { status: 'open', count: 15 },
          { status: 'active', count: 22 },
          { status: 'hearing_scheduled', count: 7 },
          { status: 'closed', count: 3 }
        ]
      },
      lawyerPerformance: [
        {
          id: 'lawyer-1',
          name: 'Ahmed Khan',
          activeCases: 8,
          billableHours: '320',
          revenue: '425000',
          utilization: 85
        },
        {
          id: 'lawyer-2',
          name: 'Fatima Ali',
          activeCases: 6,
          billableHours: '280',
          revenue: '375000',
          utilization: 78
        }
      ],
      topCases: [
        {
          id: 'case-1',
          caseNumber: 'CIV-2026-001',
          title: 'Corporate Merger',
          clientName: 'Tech Corp',
          lawyerName: 'Ahmed Khan',
          status: 'active',
          priority: 'high',
          revenue: '125000'
        },
        {
          id: 'case-2',
          caseNumber: 'CIV-2026-002',
          title: 'Property Dispute',
          clientName: 'Real Estate Ltd',
          lawyerName: 'Fatima Ali',
          status: 'hearing_scheduled',
          priority: 'high',
          revenue: '95000'
        }
      ]
    }
  });
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
