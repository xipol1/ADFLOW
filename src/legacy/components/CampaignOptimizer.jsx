import React, { useState, useCallback, useEffect } from 'react';
import Card from './Card';
import Input from './Input';
import Button from './Button';
import OptimizerResults from './OptimizerResults';
import apiService from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { Sparkles, ArrowLeft, List } from 'lucide-react';

/**
 * Main container for campaign optimization feature
 */
const CampaignOptimizer = () => {
  const { addNotification } = useNotifications();
  const [budget, setBudget] = useState(100);
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [content, setContent] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [listId, setListId] = useState('');
  const [userLists, setUserLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await apiService.getMyLists();
        if (res.success) {
          setUserLists(res.data);
        }
      } catch (error) {
        console.error('Error fetching lists:', error);
      }
    };
    fetchLists();
  }, []);

  const handleOptimize = useCallback(async (currentBudget = budget) => {
    try {
      setLoading(true);
      const res = await apiService.optimizeCampaign({
        budget: currentBudget,
        category: category || undefined,
        platform: platform || undefined,
        listId: listId || undefined,
      });

      if (res.success) {
        setResults(res.data);
      }
    } catch (error) {
      addNotification('error', 'Error', error.message || 'Error al optimizar la campaña');
    } finally {
      setLoading(false);
    }
  }, [budget, category, platform, listId, addNotification]);

  const handleBudgetChange = (newBudget) => {
    setBudget(newBudget);
    // Live update results when slider moves
    handleOptimize(newBudget);
  };

  const handleLaunch = async () => {
    if (!content || !targetUrl) {
      addNotification('error', 'Faltan datos', 'Por favor ingresa el contenido y la URL de destino.');
      return;
    }

    try {
      setLaunching(true);
      const res = await apiService.launchAutoCampaign({
        budget,
        category: category || undefined,
        platform: platform || undefined,
        listId: listId || undefined,
        content,
        targetUrl
      });

      if (res.success) {
        addNotification('success', '¡Éxito!', `Se han lanzado ${res.data.campaignsCreated} campañas exitosamente.`);
        setResults(null);
        setContent('');
        setTargetUrl('');
      }
    } catch (error) {
      addNotification('error', 'Error al lanzar', error.message || 'Hubo un problema al lanzar las campañas.');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      {!results && !loading ? (
        <Card 
          title="Optimizador de Campañas Inteligente" 
          subtitle="Define tu presupuesto y deja que nuestro algoritmo encuentre los mejores canales para ti."
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleOptimize();
            }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input
                label="Presupuesto Total (€)"
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                min="10"
                placeholder="Ej: 500"
                required
              />
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Modo de Selección</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setListId('')}
                    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                      !listId ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    🚀 Automático
                  </button>
                  <button
                    type="button"
                    disabled={userLists.length === 0}
                    onClick={() => userLists.length > 0 && setListId(userLists[0]._id)}
                    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                      listId ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    } ${userLists.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    🛠️ Semi-automático
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              {!listId ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría de Interés</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm bg-white"
                    >
                      <option value="">Todas las categorías</option>
                      <option value="tecnologia">Tecnología</option>
                      <option value="moda">Moda</option>
                      <option value="gaming">Gaming</option>
                      <option value="negocios">Negocios</option>
                      <option value="salud">Salud</option>
                      <option value="viajes">Viajes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm bg-white"
                    >
                      <option value="">Todas las plataformas</option>
                      <option value="telegram">Telegram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="discord">Discord</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Usa mi lista de canales</label>
                  <select
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm bg-white"
                  >
                    {userLists.map(list => (
                      <option key={list._id} value={list._id}>
                        {list.name} ({list.channels.length} canales)
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    El sistema optimizará el presupuesto únicamente entre los canales de la lista seleccionada.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-6 border-t border-gray-100 pt-8 mt-8">
              <h3 className="text-lg font-bold text-gray-900">Contenido de la Campaña</h3>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mensaje del Anuncio</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm bg-white h-32"
                    placeholder="Escribe el mensaje que verán los usuarios..."
                    required
                  ></textarea>
                </div>
                
                <Input
                  label="URL de Destino"
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://tusitio.com/oferta"
                  required
                />
              </div>
            </div>

            <div className="bg-primary-50 p-6 rounded-xl border border-primary-100 flex items-start space-x-4">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Sparkles className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary-900">¿Cómo funciona?</h4>
                <p className="text-sm text-primary-700 mt-1">
                  Nuestro sistema analiza el rendimiento histórico, CTR y precios de todos los canales activos para maximizar el retorno de tu inversión.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                size="lg"
                disabled={loading}
                className="w-full md:w-auto px-10 shadow-md hover:shadow-lg"
              >
                Calcular Mejor Distribución
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="space-y-6">
          <button 
            onClick={() => setResults(null)}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Cambiar configuración básica
          </button>
          
          <OptimizerResults 
            results={results} 
            loading={loading || launching} 
            budget={budget}
            onBudgetChange={handleBudgetChange}
            onLaunch={handleLaunch}
          />
        </div>
      )}
    </div>
  );
};

export default CampaignOptimizer;
