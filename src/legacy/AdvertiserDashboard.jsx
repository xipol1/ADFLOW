import React, { useState, useEffect } from 'react';
import DashboardLayout from './layouts/DashboardLayout';
import StatCard from './components/StatCard';
import ActivityFeed from './components/ActivityFeed';
import Table from './components/Table';
import Button from './components/Button';
import Badge from './components/Badge';
import Pagination from './components/Pagination';
import CreateAdForm from './components/CreateAdForm';
import CampaignOptimizer from './components/CampaignOptimizer';
import CampaignBuilder from './components/CampaignBuilder';
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
import { Line, Doughnut } from 'react-chartjs-2';

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

const AdvertiserDashboard = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // Estado para la navegación del sidebar
  const [activeItem, setActiveItem] = useState('dashboard');
  const [showCreateAdForm, setShowCreateAdForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeAds, setActiveAds] = useState([]);
  const [allAds, setAllAds] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recommendedChannels, setRecommendedChannels] = useState([]);
  const [availableChannels, setAvailableChannels] = useState([]);

  // Cargar datos del dashboard
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, adsRes, notificationsRes, channelsRes, allChannelsRes] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getMyAds({ status: 'activo', limit: 5 }),
        apiService.getMyNotifications({ limit: 5 }),
        apiService.searchChannels({ limit: 3, verified: true }),
        apiService.searchChannels({ limit: 20 })
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (adsRes.success) {
        setActiveAds(adsRes.data || []);
      }
      
      // Cargar todos los anuncios para la vista de "Mis Anuncios"
      const allAdsRes = await apiService.getMyAds();
      if (allAdsRes.success) {
        setAllAds(allAdsRes.data || []);
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
        setRecommendedChannels(channelsRes.channels || []);
      }
      
      if (allChannelsRes.success) {
        setAvailableChannels(allChannelsRes.channels || []);
      }

    } catch (error) {
      console.error('Error fetching advertiser dashboard data:', error);
      addNotification('error', 'Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getIconForNotification = (type) => {
    switch (type) {
      case 'aprobacion':
        return <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'rechazo':
        return <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      default:
        return <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  // Configuración del gráfico de pastel para estados de anuncios
  const chartData = {
    labels: stats?.anunciosPorEstado ? Object.keys(stats.anunciosPorEstado) : [],
    datasets: [
      {
        data: stats?.anunciosPorEstado ? Object.values(stats.anunciosPorEstado) : [],
        backgroundColor: [
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(239, 68, 68, 0.5)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };
  
  // Elementos del sidebar
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { id: 'explore', label: 'Explorar', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
    { id: 'optimizer', label: 'Auto-Buy', icon: <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { id: 'ads', label: 'Mis Anuncios', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg> },
    { id: 'finances', label: 'Finanzas', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'settings', label: 'Configuración', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];
  
  // Columnas para la tabla de anuncios activos
  const activeAdsColumns = [
    {
      header: 'Título',
      accessor: 'title',
    },
    {
      header: 'Canal',
      accessor: 'canalNombre',
      render: (row) => row.canalId?.name || 'Varios',
    },
    {
      header: 'Categoría',
      accessor: 'category',
    },
    {
      header: 'Vistas',
      accessor: 'tracking',
      render: (row) => row.tracking?.impresiones || 0,
    },
    {
      header: 'Presupuesto',
      accessor: 'budget',
      cellClassName: 'text-right font-medium text-blue-600',
      render: (row) => `$${row.budget?.toFixed(2)}`,
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (row) => (
        <Badge variant="success">{row.estado}</Badge>
      ),
    },
    {
      header: 'Acciones',
      render: (row) => (
        <Button size="sm" variant="outline">Detalles</Button>
      ),
    },
  ];
  
  // Función para manejar el clic en una fila de la tabla
  const handleRowClick = (row) => {
    console.log('Row clicked:', row);
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
      {activeItem === 'optimizer' ? (
        <CampaignBuilder onNavigate={setActiveItem} />
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre || 'Anunciante'}</h1>
              <p className="text-gray-600">Gestiona tus campañas publicitarias</p>
            </div>
            <div className="flex space-x-4">
              <Button size="sm" variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Notificaciones
              </Button>
              <Button size="sm" onClick={() => setShowCreateAdForm(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Crear Anuncio
              </Button>
            </div>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Gasto Total"
              value={`$${stats?.resumen?.totalInversion?.toFixed(2) || '0.00'}`}
              icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              trend="up"
              trendValue="Inversión total"
            />
            <StatCard
              title="Anuncios Activos"
              value={stats?.resumen?.anunciosActivos || '0'}
              icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
              trend="up"
              trendValue={`De ${stats?.resumen?.totalAnuncios || 0} totales`}
            />
            <StatCard
              title="CTR Promedio"
              value={`${stats?.resumen?.ctr?.toFixed(2) || '0.00'}%`}
              icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
              trend="up"
              trendValue="Rendimiento click-through"
            />
            <StatCard
              title="Impresiones Totales"
              value={stats?.resumen?.impresionesTotales?.toLocaleString() || '0'}
              icon={<svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
              trend="up"
              trendValue="Alcance total"
            />
          </div>
          
          {/* Contenido principal en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna izquierda (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Anuncios activos */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Mis Anuncios Activos</h2>
                  <Button size="sm" variant="outline">Ver todos</Button>
                </div>
                
                {activeAds.length > 0 ? (
                  <Table
                    columns={activeAdsColumns}
                    data={activeAds}
                    onRowClick={handleRowClick}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No tienes anuncios activos actualmente.
                  </div>
                )}
              </div>
              
              {/* Rendimiento de anuncios */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Distribución de Anuncios por Estado</h2>
                
                <div className="h-64 relative">
                  {stats?.anunciosPorEstado ? (
                    <Doughnut data={chartData} options={chartOptions} />
                  ) : (
                    <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Columna derecha (1/3) */}
            <div className="space-y-8">
              {/* Actividad reciente */}
              <ActivityFeed
                activities={recentActivities}
                title="Notificaciones Recientes"
                viewAllLink="#"
              />
              
              {/* Canales recomendados */}
              <div className="bg-white rounded-xl shadow-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Canales Verificados</h2>
                  <Button size="sm" variant="outline">Ver más</Button>
                </div>
                
                <div className="space-y-4">
                  {recommendedChannels.map((channel, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-gray-900">{channel.name}</h3>
                        <Badge variant="info">{channel.platform}</Badge>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-600">{channel.subscriberCount?.toLocaleString()} seguidores</span>
                        <span className="font-medium text-primary-600">{channel.category}</span>
                      </div>
                      <div className="mt-3">
                        <Button size="sm" className="w-full">Ver Canal</Button>
                      </div>
                    </div>
                  ))}
                  {recommendedChannels.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No se encontraron canales recomendados.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de creación de anuncios */}
      <CreateAdForm
        isOpen={showCreateAdForm}
        onClose={() => setShowCreateAdForm(false)}
        onAdCreated={(newAd) => {
          fetchDashboardData();
          addNotification('success', 'Éxito', 'Anuncio creado correctamente');
        }}
      />
    </DashboardLayout>
  );
};

export default AdvertiserDashboard;
