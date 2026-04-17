import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, DollarSign, AlertCircle, Loader } from 'lucide-react';
import apiService from '../services/api';

/**
 * Admin Dashboard - Revenue Attribution & KPI Overview
 * Connected to backend APIs
 */

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [lawyerStats, setLawyerStats] = useState<any[]>([]);
  const [topCases, setTopCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const dashboardMetrics = await apiService.getDashboardMetrics();
        if (dashboardMetrics) {
          setMetrics(dashboardMetrics);
          setLawyerStats(dashboardMetrics.lawyerPerformance || []);
          setTopCases(dashboardMetrics.topCases || []);
        } else {
          setError('Failed to load dashboard metrics');
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto p-6 bg-red-50 rounded-lg border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 mt-1">{error || 'No metrics available'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const revenueChartData = metrics.charts?.revenueTrend?.map((item: any) => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short' }),
    actual: parseFloat(item.actual),
    target: parseFloat(item.target),
  })) || [];

  const caseDistributionData = metrics.charts?.caseDistribution?.map((item: any) => ({
    name: item.status.replace('_', ' '),
    value: item.count,
  })) || [];

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `₨${parseFloat(metrics.kpis.totalRevenue).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`,
      change: parseFloat(metrics.kpis.revenueGrowth) || 0,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
    },
    {
      title: 'Active Cases',
      value: metrics.kpis.activeCases,
      change: parseFloat(metrics.kpis.caseGrowth) || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Lawyers',
      value: metrics.kpis.totalLawyers,
      change: 0,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-500',
    },
    {
      title: 'Avg Utilization',
      value: `${metrics.kpis.avgUtilization}%`,
      change: 0,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-orange-500',
    },
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, Firm Owner</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((card) => (
            <div key={card.title} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className={`text-sm font-medium mt-2 ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {card.change > 0 ? '↑' : '↓'} {Math.abs(card.change).toFixed(1)}%
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg text-white`}>{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Trend</h2>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                  <Bar dataKey="target" fill="#e5e7eb" name="Target" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Case Distribution</h2>
            {caseDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={caseDistributionData} cx="50%" cy="50%" dataKey="value">
                    {caseDistributionData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Lawyer Performance & Top Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Lawyer Performance</h2>
            <div className="space-y-4">
              {lawyerStats.length > 0 ? (
                lawyerStats.map((lawyer: any) => (
                  <div key={lawyer.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{lawyer.name}</h3>
                      <span className="text-sm font-bold text-blue-600">₨{parseFloat(lawyer.revenue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{lawyer.activeCases} cases</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(lawyer.utilization, 100)}%` }} />
                      </div>
                      <span>{lawyer.utilization}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No lawyer data available</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Cases</h2>
            <div className="space-y-3">
              {topCases.length > 0 ? (
                topCases.slice(0, 5).map((caseItem: any) => (
                  <div key={caseItem.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{caseItem.caseNumber}</h3>
                        <p className="text-xs text-gray-600">{caseItem.clientName}</p>
                      </div>
                      <span className="text-sm font-bold text-green-600">₨{parseFloat(caseItem.revenue).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(caseItem.status)}`}>
                        {caseItem.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(caseItem.priority)}`}>
                        {caseItem.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No case data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
