import React from 'react';

const Sidebar = ({ 
  items = [], 
  activeItem, 
  onItemChange, 
  user,
  className = '' 
}) => {
  return (
    <div className={`bg-white shadow-lg h-full ${className}`}>
      {/* User info */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">
                {user.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user.name || 'Usuario'}</p>
              <p className="text-xs text-gray-500">{user.email || 'email@ejemplo.com'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-4 px-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemChange?.(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeItem === item.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.icon && (
                  <span className="mr-3">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;