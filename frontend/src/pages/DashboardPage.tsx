import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, DollarSign, AlertCircle, Loader, Menu, X } from 'lucide-react';
import apiService from '../services/api';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import KPICard from '../components/KPICard';
import AlertItem from '../components/AlertItem';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
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
      color: 'text-green-600',
    },
    {
      title: 'Active Cases',
      value: metrics.kpis.activeCases,
      change: parseFloat(metrics.kpis.caseGrowth) || 0,
      icon: <FileText className="w-6 h-6" />,
      color: 'text-blue-600',
    },
    {
      title: 'Total Lawyers',
      value: metrics.kpis.totalLawyers,
      change: 0,
      icon: <Users className="w-6 h-6" />,
      color: 'text-purple-600',
    },
    {
      title: 'Avg Utilization',
      value: `${metrics.kpis.avgUtilization}%`,
      change: 0,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-orange-600',
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
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar isOpen={true} />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600 hover:text-gray-900">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-xl font-bold">LegalArie</h1>
        </div>

        {/* Dashboard Header */}
        <DashboardHeader location="Karachi Central" />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {kpiCards.map((card) => (
                <KPICard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  icon={card.icon}
                  color={card.color}
                />
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Revenue Chart */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h2>
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">No data available</p>
                )}
              </div>

              {/* Case Distribution Pie Chart */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Case Distribution</h2>
                {caseDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={caseDistributionData} cx="50%" cy="50%" dataKey="value" outerRadius={80}>
                        {caseDistributionData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">No data available</p>
                )}
              </div>
            </div>

            {/* Alerts & Lawyer Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Alerts Panel */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Alerts</h2>
                <div className="space-y-3">
                  <AlertItem
                    type="critical"
                    title="High Priority Case"
                    location="District Court - South"
                    time="2 hours ago"
                  />
                  <AlertItem
                    type="warning"
                    title="Deadline Approaching"
                    location="Evidence Submission"
                    time="4 hours ago"
                  />
                  <AlertItem
                    type="info"
                    title="New Case Assigned"
                    location="Corporate Division"
                    time="6 hours ago"
                  />
                </div>
              </div>

              {/* Lawyer Performance */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Lawyer Performance</h2>
                <div className="space-y-4">
                  {lawyerStats.length > 0 ? (
                    lawyerStats.map((lawyer: any) => (
                      <div key={lawyer.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{lawyer.name}</h3>
                            <p className="text-xs text-gray-500">{lawyer.activeCases} active cases</p>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            ₨{parseFloat(lawyer.revenue).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(lawyer.utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-12 text-right">
                            {lawyer.utilization}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No lawyer data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Cases */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top Cases</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Case Number</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Priority</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCases.length > 0 ? (
                      topCases.slice(0, 5).map((caseItem: any) => (
                        <tr key={caseItem.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{caseItem.caseNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{caseItem.clientName}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(caseItem.status)}`}>
                              {caseItem.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${getPriorityColor(caseItem.priority)}`}>
                              {caseItem.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-right text-green-600">
                            ₨{parseFloat(caseItem.revenue).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No case data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
