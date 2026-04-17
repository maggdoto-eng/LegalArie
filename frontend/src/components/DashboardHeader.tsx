import React from 'react';
import { Search, Bell, MapPin, ChevronDown } from 'lucide-react';

interface DashboardHeaderProps {
  location?: string;
  onLocationChange?: (location: string) => void;
}

export default function DashboardHeader({ location = 'Karachi Central', onLocationChange }: DashboardHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        {/* Left: Location Selector */}
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-400" />
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="font-medium text-gray-900">{location}</span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Middle: Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search routes, assets, or complaints..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
            Generate Report
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm">
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
