import React from 'react';
import { LayoutDashboard, FileText, Clock, BarChart3, Settings, LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const user = apiService.getCurrentUser();

  const handleLogout = async () => {
    await apiService.logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', isActive: true },
    { icon: FileText, label: 'Cases', href: '/cases', isActive: false },
    { icon: Clock, label: 'Time Entries', href: '/time-entries', isActive: false },
    { icon: BarChart3, label: 'Reports', href: '/reports', isActive: false },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-xl transition-transform duration-300 ease-in-out z-50 lg:z-10 lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            LegalArie
          </h1>
          <p className="text-xs text-slate-400 mt-1">Legal Practice Management</p>
        </div>

        {/* Menu Items */}
        <nav className="mt-8 px-4 flex-1">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                item.isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-slate-700 rounded-lg">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'email@example.com'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
