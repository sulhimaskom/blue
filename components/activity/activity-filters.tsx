import React from 'react';
import { ACTIVITY_TYPE_GROUPS, ACTIVITY_LABELS } from '@/lib/constants/activity-types';

export interface ActivityFilterOptions {
  eventTypes: string[];
  projectId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface ActivityFiltersProps {
  filters: ActivityFilterOptions;
  onFiltersChange: (_filters: ActivityFilterOptions) => void;
  projects?: Array<{ id: string; name: string }>;
}

export const ActivityFilters = React.memo(
  ({ filters, onFiltersChange, projects = [] }: ActivityFiltersProps) => {
    const handleEventTypeToggle = (eventType: string) => {
      const newEventTypes = filters.eventTypes.includes(eventType)
        ? filters.eventTypes.filter(t => t !== eventType)
        : [...filters.eventTypes, eventType];

      onFiltersChange({ ...filters, eventTypes: newEventTypes });
    };

    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const projectId = e.target.value || undefined;
      onFiltersChange({ ...filters, projectId });
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, startDate: e.target.value || undefined });
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, endDate: e.target.value || undefined });
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, search: e.target.value || undefined });
    };

    const handleClearFilters = () => {
      onFiltersChange({ eventTypes: [] });
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={handleClearFilters}
            aria-label="Clear all activity filters"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={handleSearchChange}
              placeholder="Search activities..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              value={filters.projectId || ''}
              onChange={handleProjectChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={handleStartDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={handleEndDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Activity Types</label>
            <div className="space-y-3">
              {ACTIVITY_TYPE_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="text-sm font-medium text-gray-900 mb-2">{group.label}</div>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {group.types.map(type => (
                      <label key={type} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={filters.eventTypes.includes(type)}
                          onChange={() => handleEventTypeToggle(type)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{ACTIVITY_LABELS[type] || type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ActivityFilters.displayName = 'ActivityFilters';
