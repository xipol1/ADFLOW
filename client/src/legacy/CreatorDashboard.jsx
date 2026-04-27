import React, { useState, useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import StatCard from './components/StatCard';
import ActivityFeed from './components/ActivityFeed';
import Table from './components/Table';
import Pagination from './components/Pagination';
import Badge from './components/Badge';
import Button from './components/Button';
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
import { Line, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
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

const CreatorDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // Estado para la navegación del sidebar
  const [activeItem, setActiveItem] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pendingAds, setPendingAds] = useState([]);
  const [allAds, setAllAds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  
  // Cargar datos del dashboard
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos base según activeItem o cargar todo al inicio
      const [statsRes, adsRes, notificationsRes, channelsRes] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getAdsForCreator({ limit: 10 }),
        apiService.getMyNotifications({ limit: 5 }),
        apiService.getMyChannels()
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (adsRes.success) {
        setAllAds(adsRes.data || []);
        setPendingAds(adsRes.data?.filter(ad => ad.estado === 'pendiente') || []);
      }

      if (notificationsRes.success) {
        const activities = notificationsRes.data.map(notif => ({
          content: notif.message,
          timestamp: new Date(notif.createdAt).toLocaleString(),
          icon: getIconForNotification(notif.type)
        }));
        setRecentActivities(activities);
      }

      if (channelsRes.success) {
        setChannels(channelsRes.data || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      addNotification('error', 'Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getIconForNotification = (type) => {
    switch (type) {
      case 'pago':
        return <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'anuncio':
        return <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>;
      default:
        return <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  // ... (chartData and chartOptions remain same)

  // Columnas para la tabla de anuncios (Vista General)
  const adsColumns = [
    {
      header: 'Título',
      accessor: 'title',
    },
    {
      header: 'Canal',
      accessor: 'canalNombre',
      render: (row) => row.canalId?.name || 'N/A',
    },
    {
      header: 'Presupuesto',
      accessor: 'budget',
      cellClassName: 'text-right font-medium text-green-600',
      render: (row) => `$${row.budget?.toFixed(2)}`,
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (row) => (
        <Badge variant={row.estado === 'completado' ? 'success' : 'warning'}>{row.estado}</Badge>
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
      render: (row) => <Badge variant="info">{row.platform}</Badge>,
    },
    {
      header: 'Suscriptores',
      accessor: 'subscriberCount',
      render: (row) => row.subscriberCount?.toLocaleString() || '0',
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (row) => (
        <Badge variant={row.estado === 'verificado' ? 'success' : 'warning'}>{row.estado}</Badge>
      ),
    },
  ];

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return (
          <>
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Ingresos Totales"
                value={`$${stats?.resumen?.totalIngresos?.toFixed(2) || '0.00'}`}
                icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                trend="up"
                trendValue="Ingresos acumulados"
              />
              <StatCard
                title="Anuncios Recibidos"
                value={stats?.resumen?.totalAnunciosRecibidos || '0'}
                icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
                trend="up"
                trendValue="Histórico total"
              />
              <StatCard
                title="Canales Activos"
                value={stats?.resumen?.canalesActivos || '0'}
                icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                trend="same"
                trendValue={`De ${stats?.resumen?.totalCanales || 0} totales`}
              />
              <StatCard
                title="Ingresos Pendientes"
                value={`$${stats?.resumen?.ingresosPendientes?.toFixed(2) || '0.00'}`}
                icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                trend="info"
                trendValue="Por anuncios activos"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-xl shadow-card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-gray-900">Solicitudes de Anuncios Pendientes</h2>
                    <Button size="sm" variant="outline" onClick={() => setActiveItem('ads')}>Ver todos</Button>
                  </div>
                  {pendingAds.length > 0 ? (
                    <Table columns={pendingAdsColumns} data={pendingAds} onRowClick={handleRowClick} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">No tienes solicitudes pendientes.</div>
                  )}
                </div>
                
                <div className="bg-white rounded-xl shadow-card p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Canales por Plataforma</h2>
                  <div className="h-64 relative">
                    {stats?.canalesPorPlataforma ? (
                      <Bar data={chartData} options={chartOptions} />
                    ) : (
                      <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">No hay datos de canales disponibles</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-8">
                <ActivityFeed activities={recentActivities} title="Notificaciones Recientes" viewAllLink="#" />
                <div className="bg-white rounded-xl shadow-card p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Resumen Financiero</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                      <div>
                        <p className="font-medium text-gray-900">Ingresos Confirmados</p>
                        <p className="text-sm text-gray-600">Disponibles</p>
                      </div>
                      <p className="font-bold text-green-600">${stats?.resumen?.ingresosConfirmados?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div>
                        <p className="font-medium text-gray-900">Ingresos Pendientes</p>
                        <p className="text-sm text-gray-600">En curso</p>
                      </div>
                      <p className="font-bold text-blue-600">${stats?.resumen?.ingresosPendientes?.toFixed(2) || '0.00'}</p>
                    </div>
                    <Button className="w-full" onClick={() => setActiveItem('finances')}>Gestionar Pagos</Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case 'channels':
        return (
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Mis Canales</h2>
              <Button size="sm">Añadir Canal</Button>
            </div>
            <Table columns={channelsColumns} data={channels} onRowClick={handleRowClick} />
          </div>
        );
      case 'ads':
        return (
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Todos mis Anuncios</h2>
            <Table columns={adsColumns} data={allAds} onRowClick={handleRowClick} />
          </div>
        );
      case 'finances':
        return (
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Historial Financiero</h2>
            <p className="text-gray-500">Próximamente: Detalles de transacciones y retiros.</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Configuración de Perfil</h2>
            <form className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input type="text" defaultValue={user?.nombre} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" defaultValue={user?.email} disabled className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50" />
              </div>
              <Button type="button">Guardar Cambios</Button>
            </form>
          </div>
        );
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  if (loading) {
    // ... (loading state remains same)
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
          <h1 className="text-2xl font-bold text-gray-900">
            {activeItem === 'dashboard' ? `Bienvenido, ${user?.nombre || 'Creador'}` : sidebarItems.find(i => i.id === activeItem)?.label}
          </h1>
          <p className="text-gray-600">
            {activeItem === 'dashboard' ? 'Gestiona tus canales y anuncios' : `Administra tu sección de ${sidebarItems.find(i => i.id === activeItem)?.label.toLowerCase()}`}
          </p>
        </div>
        <div className="flex space-x-4">
          <Button size="sm" variant="outline">Notificaciones</Button>
          {activeItem === 'channels' && <Button size="sm">Añadir Canal</Button>}
        </div>
      </div>

      {renderContent()}
    </DashboardLayout>
  );
};

export default CreatorDashboard;
