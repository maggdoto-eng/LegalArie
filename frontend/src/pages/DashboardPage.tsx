import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, DollarSign, AlertCircle } from 'lucide-react';

/**
 * Admin Dashboard - Revenue Attribution & KPI Overview
 * Shows firm performance metrics, case pipeline, lawyer stats
 */

interface KPICard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  client: string;
  lawyer: string;
  status: 'open' | 'active' | 'hearing_scheduled' | 'closed';
  value: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface LawyerStats {
  name: string;
  cases: number;
  revenue: number;
  utilization: number;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [lawyerStats, setLawyerStats] = useState<LawyerStats[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    // Mock data - replace with API calls
    setLawyerStats([
      { name: 'Ahmed Hassan', cases: 12, revenue: 450000, utilization: 85 },
      { name: 'Sarah Khan', cases: 8, revenue: 320000, utilization: 78 },
      { name: 'Ali Malik', cases: 15, revenue: 520000, utilization: 92 },
      { name: 'Fatima Siddiqui', cases: 10, revenue: 380000, utilization: 81 },
    ]);

    setCases([
      {
        id: '1',
        caseNumber: 'CV-2026-001',
        title: 'Smith vs Jones',
        client: 'Acme Corp',
        lawyer: 'Ahmed Hassan',
        status: 'active',
        value: 150000,
        priority: 'high',
      },
      {
        id: '2',
        caseNumber: 'CV-2026-002',
        title: 'Corporate Merger Review',
        client: 'TechStart Ltd',
        lawyer: 'Sarah Khan',
        status: 'open',
        value: 280000,
        priority: 'critical',
      },
      {
        id: '3',
        caseNumber: 'CV-2026-003',
        title: 'Employment Dispute',
        client: 'Manufacturing Co',
        lawyer: 'Ali Malik',
        status: 'hearing_scheduled',
        value: 95000,
        priority: 'medium',
      },
    ]);
  }, [timeRange]);

  const kpiCards: KPICard[] = [
    {
      title: 'Total Revenue',
      value: '₨ 16.8M',
      change: 12.5,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
    },
    {
      title: 'Active Cases',
      value: '45',
      change: 8.2,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Lawyers',
      value: '12',
      change: 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-500',
    },
    {
      title: 'Avg Utilization',
      value: '84%',
      change: 5.3,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-orange-500',
    },
  ];

  const revenueByMonth = [
    { month: 'Jan', revenue: 1200000, target: 1500000 },
    { month: 'Feb', revenue: 1400000, target: 1500000 },
    { month: 'Mar', revenue: 1600000, target: 1500000 },
    { month: 'Apr', revenue: 1800000, target: 1500000 },
  ];

  const caseDistribution = [
    { name: 'Open', value: 15, fill: '#3b82f6' },
    { name: 'Active', value: 20, fill: '#10b981' },
    { name: 'Hearing', value: 7, fill: '#f59e0b' },
    { name: 'Closed', value: 8, fill: '#6b7280' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      hearing_scheduled: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, Firm Owner</p>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((card) => (
            <div key={card.title} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className={`text-sm font-medium mt-2 ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {card.change > 0 ? '↑' : '↓'} {Math.abs(card.change)}% vs last period
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg text-white`}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Trend */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₨${(value / 100000).toFixed(1)}L`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Actual" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Case Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Case Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={caseDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                  {caseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lawyer Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Lawyer Performance</h2>
            <div className="space-y-4">
              {lawyerStats.map((lawyer) => (
                <div key={lawyer.name} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{lawyer.name}</h3>
                    <span className="text-sm font-bold text-blue-600">₨{(lawyer.revenue / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{lawyer.cases} cases</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${lawyer.utilization}%` }} />
                    </div>
                    <span>{lawyer.utilization}% utilization</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Attribution Alert */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Revenue Attribution Feature</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Automatically tracks which lawyer contributed to each case's revenue. Useful for bonus calculations and performance reviews.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Auto-calculates partner contribution</li>
                  <li>✓ Tracks hourly rate × hours logged</li>
                  <li>✓ Generates monthly revenue reports</li>
                  <li>✓ Integrates with compensation module</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Active Cases Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Active Cases</h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              + New Case
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Case Number</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Lawyer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Value</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem) => (
                  <tr key={caseItem.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-blue-600 cursor-pointer hover:underline">{caseItem.caseNumber}</td>
                    <td className="py-3 px-4 text-gray-900">{caseItem.title}</td>
                    <td className="py-3 px-4 text-gray-600">{caseItem.client}</td>
                    <td className="py-3 px-4 text-gray-600">{caseItem.lawyer}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                        {caseItem.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(caseItem.priority)}`}>
                        {caseItem.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">₨{(caseItem.value / 100000).toFixed(1)}L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
