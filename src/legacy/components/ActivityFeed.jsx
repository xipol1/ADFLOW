import React from 'react';

const ActivityFeed = ({ 
  activities = [], 
  title = 'Actividad Reciente',
  className = '' 
}) => {
  if (!activities || activities.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No hay actividades recientes</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, index) => (
            <li key={index}>
              <div className="relative pb-8">
                {index !== activities.length - 1 && (
                  <span 
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                    aria-hidden="true" 
                  />
                )}
                
                <div className="relative flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {activity.icon}
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div>
                      <p className="text-sm text-gray-900">{activity.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ActivityFeed;