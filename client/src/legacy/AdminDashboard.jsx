import React, { useState, useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import StatCard from './components/StatCard';
import Table from './components/Table';
import Tabs from './components/Tabs';
import Badge from './components/Badge';
import Button from './components/Button';
import FilterBar from './components/FilterBar';
import Pagination from './components/Pagination';
import apiService from './services/api';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // Estado para la navegación del sidebar
  const [activeItem, setActiveItem] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeTab, setActiveTab] = useState('users');

  // Cargar datos del dashboard
  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, channelsRes] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.request('/auth/users', { auth: true }), // Asumiendo este endpoint
        apiService.getMyChannels({ limit: 10 })
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (usersRes.success) {
        setUsers(usersRes.data || []);
      }

      if (channelsRes.success) {
        setChannels(channelsRes.data || []);
      }

    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      addNotification('error', 'Error', 'No se pudieron cargar los datos administrativos');
    } finally {
      setLoading(false);
    }
  };

  // Configuración de gráficos
  const usersChartData = {
    labels: stats?.usuariosPorTipo ? Object.keys(stats.usuariosPorTipo) : [],
    datasets: [{
      data: stats?.usuariosPorTipo ? Object.values(stats.usuariosPorTipo) : [],
      backgroundColor: ['rgba(59, 130, 246, 0.5)', 'rgba(16, 185, 129, 0.5)', 'rgba(245, 158, 11, 0.5)'],
      borderColor: ['rgb(59, 130, 246)', 'rgb(16, 185, 129)', 'rgb(245, 158, 11)'],
      borderWidth: 1,
    }]
  };
  
  // Elementos del sidebar
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { id: 'users', label: 'Usuarios', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { id: 'channels', label: 'Canales', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
    { id: 'ads', label: 'Anuncios', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> },
    { id: 'payments', label: 'Pagos', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'settings', label: 'Configuración', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];
  
  // Columnas para la tabla de usuarios
  const usersColumns = [
    {
      header: 'Nombre',
      accessor: 'nombre',
    },
    {
      header: 'Tipo',
      accessor: 'rol',
      render: (row) => <Badge variant="info">{row.rol}</Badge>
    },
    {
      header: 'Email',
      accessor: 'email',
    },
    {
      header: 'Registro',
      accessor: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (row) => (
        <Badge variant={row.estado === 'activo' ? 'success' : 'error'}>
          {row.estado}
        </Badge>
      ),
    },
    {
      header: 'Acciones',
      render: (row) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">Ver</Button>
          <Button size="sm" variant="outline">Editar</Button>
        </div>
      ),
    },
  ];
  
  // Columnas para la tabla de canales
  const channelsColumns = [
    {
      header: 'Nombre',
      accessor: 'name',
    },
    {
      header: 'Plataforma',
      accessor: 'platform',
      render: (row) => <Badge variant="info">{row.platform}</Badge>
    },
    {
      header: 'Audiencia',
      accessor: 'subscriberCount',
      render: (row) => row.subscriberCount?.toLocaleString() || '0'
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (row) => {
        let variant = 'info';
        if (row.estado === 'verificado') variant = 'success';
        if (row.estado === 'pendiente') variant = 'warning';
        if (row.estado === 'suspendido') variant = 'error';
        
        return <Badge variant={variant}>{row.estado}</Badge>;
      },
    },
    {
      header: 'Acciones',
      render: (row) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">Ver</Button>
          <Button size="sm" variant="outline">Verificar</Button>
        </div>
      ),
    },
  ];
  
  // Función para manejar el clic en una fila de la tabla
  const handleRowClick = (row) => {
    console.log('Row clicked:', row);
  };
  
  // Configuración de pestañas
  const tabs = [
    { id: 'users', label: 'Usuarios' },
    { id: 'channels', label: 'Canales' }
  ];
  
  // Manejar cambios en los filtros
  const handleFilterChange = (filterId, value) => {
    console.log('Filter changed:', filterId, value);
  };

  if (loading) {
    return (
      <DashboardLayout user={user} sidebarItems={sidebarItems} activeItem={activeItem} onItemChange={setActiveItem}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout
      user={user}
      sidebarItems={sidebarItems}
      activeItem={activeItem}
      onItemChange={setActiveItem}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600">Gestiona usuarios, canales y métricas globales</p>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Usuarios Totales"
          value={Object.values(stats?.usuariosPorTipo || {}).reduce((a, b) => a + b, 0)}
          icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          trend="up"
          trendValue="Crecimiento global"
        />
        <StatCard
          title="Canales Totales"
          value={stats?.totalCanales || '0'}
          icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          trend="up"
          trendValue="Registrados"
        />
        <StatCard
          title="Anuncios Totales"
          value={stats?.totalAnuncios || '0'}
          icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          trend="up"
          trendValue="En sistema"
        />
        <StatCard
          title="Transacciones"
          value={stats?.totalTransacciones || '0'}
          icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend="up"
          trendValue="Procesadas"
        />
      </div>
      
      {/* Gestión de usuarios y canales */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          className="mb-6"
        />
        
        {activeTab === 'users' && (
          <>
            <Table
              columns={usersColumns}
              data={users}
              onRowClick={handleRowClick}
            />
          </>
        )}
        
        {activeTab === 'channels' && (
          <>
            <Table
              columns={channelsColumns}
              data={channels}
              onRowClick={handleRowClick}
            />
          </>
        )}
      </div>
      
      {/* Métricas de plataforma */}
      <div className="mt-8 bg-white rounded-xl shadow-card p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Distribución de Usuarios</h2>
        
        <div className="h-64 relative">
          {stats?.usuariosPorTipo ? (
            <Bar 
              data={usersChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
              }} 
            />
          ) : (
            <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">No hay datos disponibles</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
