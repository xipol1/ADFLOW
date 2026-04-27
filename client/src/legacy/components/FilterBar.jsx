import React from 'react';
import Input from './Input';
import Button from './Button';

const FilterBar = ({ 
  searchValue = '', 
  onSearchChange, 
  filters = [], 
  onFilterChange,
  onClearFilters,
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 mb-6 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Búsqueda */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Filtros */}
        {filters.map((filter, index) => (
          <div key={index} className="min-w-0 flex-shrink-0">
            <select
              value={filter.value || ''}
              onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{filter.placeholder || 'Todos'}</option>
              {filter.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Botón limpiar filtros */}
        {(searchValue || filters.some(f => f.value)) && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="flex-shrink-0"
          >
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;