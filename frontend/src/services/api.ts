/**
 * API Service Layer
 * Handles all HTTP requests to backend APIs
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    status: number;
  } | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  firmId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  status: 'open' | 'active' | 'hearing_scheduled' | 'judgment_awaited' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  caseType?: string;
  filingDate?: string;
  expectedClosureDate?: string;
  courtName?: string;
  clientName: string;
  lawyerName: string;
  messageCount: number;
  documentCount: number;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedToName?: string;
}

export interface DashboardMetrics {
  kpis: {
    totalRevenue: string;
    monthlyRevenue: string;
    activeCases: number;
    totalLawyers: number;
    avgUtilization: number;
    revenueGrowth: string;
    caseGrowth: string;
  };
  charts: {
    revenueTrend: Array<{
      month: string;
      actual: string;
      target: string;
    }>;
    caseDistribution: Array<{
      status: string;
      count: number;
    }>;
  };
  lawyerPerformance: Array<{
    id: string;
    name: string;
    activeCases: number;
    billableHours: string;
    revenue: string;
    utilization: number;
  }>;
  topCases: Array<{
    id: string;
    caseNumber: string;
    title: string;
    clientName: string;
    lawyerName: string;
    status: string;
    priority: string;
    revenue: string;
  }>;
}

// Helper function to get stored token
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Helper function to get stored refresh token
function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

// Helper function to store tokens
function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

// Helper function to clear tokens
function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// Generic fetch wrapper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the original request with new token
        return apiCall<T>(endpoint, options);
      } else {
        // Refresh failed, redirect to login
        clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API call failed: ${endpoint}`, error);
    return {
      success: false,
      data: null,
      error: {
        code: 'API_ERROR',
        message: error.message || 'Failed to fetch from API',
        status: 500,
      },
    };
  }
}

// ============================================
// AUTH ENDPOINTS
// ============================================

export async function login(email: string, password: string): Promise<AuthTokens | null> {
  const response = await apiCall<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.success && response.data) {
    const { accessToken, refreshToken, user } = response.data;
    storeTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  }

  return null;
}

export async function logout() {
  clearTokens();
}

export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await apiCall<{ accessToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  if (response.success && response.data) {
    localStorage.setItem('accessToken', response.data.accessToken);
    return true;
  }

  return false;
}

export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

// ============================================
// CASES ENDPOINTS
// ============================================

export interface CasesResponse {
  cases: Case[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getCases(
  filters?: {
    status?: string;
    priority?: string;
    lawyerId?: string;
    page?: number;
    limit?: number;
  }
): Promise<CasesResponse | null> {
  const params = new URLSearchParams();

  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.lawyerId) params.append('lawyerId', filters.lawyerId);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const endpoint = `/cases?${params.toString()}`;
  const response = await apiCall<CasesResponse>(endpoint);

  return response.success ? response.data : null;
}

export async function getCase(caseId: string): Promise<Case | null> {
  const response = await apiCall<{ case: Case }>(`/cases/${caseId}`);
  return response.success ? response.data?.case : null;
}

export async function createCase(caseData: Partial<Case>): Promise<Case | null> {
  const response = await apiCall<{ case: Case }>('/cases', {
    method: 'POST',
    body: JSON.stringify(caseData),
  });

  return response.success ? response.data?.case : null;
}

export async function updateCase(caseId: string, updates: Partial<Case>): Promise<Case | null> {
  const response = await apiCall<{ case: Case }>(`/cases/${caseId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return response.success ? response.data?.case : null;
}

export async function deleteCase(caseId: string): Promise<boolean> {
  const response = await apiCall('/cases/' + caseId, { method: 'DELETE' });
  return response.success;
}

// ============================================
// TASKS ENDPOINTS
// ============================================

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getTasks(filters?: {
  caseId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<TasksResponse | null> {
  const params = new URLSearchParams();

  if (filters?.caseId) params.append('caseId', filters.caseId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const endpoint = `/tasks?${params.toString()}`;
  const response = await apiCall<TasksResponse>(endpoint);

  return response.success ? response.data : null;
}

export async function getTask(taskId: string): Promise<Task | null> {
  const response = await apiCall<{ task: Task }>(`/tasks/${taskId}`);
  return response.success ? response.data?.task : null;
}

export async function createTask(taskData: Partial<Task>): Promise<Task | null> {
  const response = await apiCall<{ task: Task }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });

  return response.success ? response.data?.task : null;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  const response = await apiCall<{ task: Task }>(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

  return response.success ? response.data?.task : null;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const response = await apiCall('/tasks/' + taskId, { method: 'DELETE' });
  return response.success;
}

// ============================================
// TIME ENTRIES ENDPOINTS
// ============================================

export interface TimeEntriesResponse {
  timeEntries: Array<{
    id: string;
    caseId: string;
    hoursWorked: number;
    totalAmount: number;
    isBillable: boolean;
    workDate: string;
  }>;
  stats: {
    totalHours: number;
    billableAmount: number;
  };
}

export async function getTimeEntries(filters?: {
  caseId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<TimeEntriesResponse | null> {
  const params = new URLSearchParams();

  if (filters?.caseId) params.append('caseId', filters.caseId);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const endpoint = `/time-entries?${params.toString()}`;
  const response = await apiCall<TimeEntriesResponse>(endpoint);

  return response.success ? response.data : null;
}

export async function createTimeEntry(entryData: any): Promise<any | null> {
  const response = await apiCall('/time-entries', {
    method: 'POST',
    body: JSON.stringify(entryData),
  });

  return response.success ? response.data : null;
}

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

export async function getDashboardMetrics(): Promise<DashboardMetrics | null> {
  const response = await apiCall<{ data: DashboardMetrics }>('/dashboard/metrics');
  return response.success && response.data ? (response.data as any).data : null;
}

export async function getLawyerDashboard(): Promise<any | null> {
  const response = await apiCall('/dashboard/lawyer');
  return response.success ? response.data : null;
}

// ============================================
// ERROR HANDLING
// ============================================

export function getErrorMessage(response: ApiResponse<any>): string {
  if (response.error) {
    return response.error.message;
  }
  return 'An unexpected error occurred';
}

export default {
  // Auth
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,

  // Cases
  getCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,

  // Tasks
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,

  // Time Entries
  getTimeEntries,
  createTimeEntry,

  // Dashboard
  getDashboardMetrics,
  getLawyerDashboard,

  // Utilities
  getErrorMessage,
};
